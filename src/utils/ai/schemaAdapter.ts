import type { JsonSchema } from './types';

/**
 * Interface representing a Schema Adapter that translates a generic JsonSchema
 * into a specific format accepted by a given AI Provider.
 */
export interface SchemaAdapter {
  adapt(schema: JsonSchema): any;
}

/**
 * Base Schema Adapter with general helper methods for schema manipulation
 */
export abstract class BaseSchemaAdapter implements SchemaAdapter {
  abstract adapt(schema: JsonSchema): any;

  /**
   * Helper to identify if a schema represents a dynamic dictionary/map
   * (e.g., additionalProperties is a valid schema object)
   */
  protected isMapSchema(schema: JsonSchema): boolean {
    return (
      schema.type === 'object' &&
      schema.additionalProperties !== undefined &&
      typeof schema.additionalProperties === 'object' &&
      schema.additionalProperties !== null
    );
  }

  /**
   * Translates a dynamic map schema to an array of property-value objects:
   * object with additionalProperties: { type: 'string' } => array of { property: string, value: string }
   */
  protected mapToArraySchema(schema: JsonSchema, uppercaseType = false): JsonSchema {
    const valueSchema = schema.additionalProperties as JsonSchema;
    
    return {
      type: uppercaseType ? 'ARRAY' : 'array' as any,
      description: schema.description || 'Lista de pares chave-valor para propriedades dinâmicas',
      items: {
        type: uppercaseType ? 'OBJECT' : 'object' as any,
        properties: {
          property: { 
            type: uppercaseType ? 'STRING' : 'string' as any,
            description: 'A chave ou propriedade'
          },
          value: {
            type: (uppercaseType ? valueSchema.type.toUpperCase() : valueSchema.type.toLowerCase()) as any,
            description: valueSchema.description || 'O valor correspondente'
          }
        },
        required: ['property', 'value']
      }
    };
  }
}

/**
 * Gemini-specific OpenAPI 3.0 Schema Adapter.
 * Rejects additionalProperties, requires uppercase types, and converts dynamic maps to array-pairs.
 */
export class GeminiSchemaAdapter extends BaseSchemaAdapter {
  adapt(schema: JsonSchema): any {
    return this.sanitizeNode(schema);
  }

  private sanitizeNode(node: JsonSchema): any {
    if (!node || typeof node !== 'object') return node;

    // Handle dynamic map conversion
    if (this.isMapSchema(node)) {
      return this.sanitizeNode(this.mapToArraySchema(node, true));
    }

    const result: any = {
      type: node.type.toUpperCase()
    };

    if (node.description) result.description = node.description;
    if (node.format) result.format = node.format;
    if (node.enum) result.enum = node.enum;

    // Handle nested objects
    if (node.type.toLowerCase() === 'object' && node.properties) {
      result.properties = {};
      for (const [key, prop] of Object.entries(node.properties)) {
        result.properties[key] = this.sanitizeNode(prop);
      }
      if (node.required && node.required.length > 0) {
        result.required = node.required;
      }
    }

    // Handle arrays
    if (node.type.toLowerCase() === 'array' && node.items) {
      result.items = this.sanitizeNode(node.items);
    }

    // Clean up fields not supported by Gemini's responseSchema (like additionalProperties, $schema, etc.)
    return result;
  }
}

/**
 * OpenAI-specific JSON Schema Adapter.
 * Requires lowercase types, and forces additionalProperties: false on objects for strict mode.
 * Converts dynamic maps to arrays if strict mode is active.
 */
export class OpenAiSchemaAdapter extends BaseSchemaAdapter {
  private strict: boolean;

  constructor(strict = true) {
    super();
    this.strict = strict;
  }

  adapt(schema: JsonSchema): any {
    return this.sanitizeNode(schema);
  }

  private sanitizeNode(node: JsonSchema): any {
    if (!node || typeof node !== 'object') return node;

    // In strict mode, OpenAI doesn't allow dynamic maps, so we convert them to array pairs.
    if (this.isMapSchema(node) && this.strict) {
      return this.sanitizeNode(this.mapToArraySchema(node, false));
    }

    const result: any = {
      type: node.type.toLowerCase()
    };

    if (node.description) result.description = node.description;
    if (node.enum) result.enum = node.enum;

    if (node.type === 'object') {
      if (node.properties) {
        result.properties = {};
        const propKeys = Object.keys(node.properties);
        
        for (const [key, prop] of Object.entries(node.properties)) {
          result.properties[key] = this.sanitizeNode(prop);
        }

        // Strict mode requires all properties to be listed as required
        if (this.strict) {
          result.required = propKeys;
          result.additionalProperties = false;
        } else if (node.required) {
          result.required = node.required;
          if (node.additionalProperties !== undefined) {
            result.additionalProperties = node.additionalProperties;
          }
        }
      } else if (this.strict) {
        result.additionalProperties = false;
      }
    }

    if (node.type === 'array' && node.items) {
      result.items = this.sanitizeNode(node.items);
    }

    return result;
  }
}

/**
 * Claude/Anthropic-specific JSON Schema Adapter.
 * Standard JSON Schema with lowercase types, fully compatible with additionalProperties.
 */
export class ClaudeSchemaAdapter extends BaseSchemaAdapter {
  adapt(schema: JsonSchema): any {
    return this.sanitizeNode(schema);
  }

  private sanitizeNode(node: JsonSchema): any {
    if (!node || typeof node !== 'object') return node;

    const result: any = {
      type: node.type.toLowerCase()
    };

    if (node.description) result.description = node.description;
    if (node.enum) result.enum = node.enum;

    if (node.type === 'object') {
      if (node.properties) {
        result.properties = {};
        for (const [key, prop] of Object.entries(node.properties)) {
          result.properties[key] = this.sanitizeNode(prop);
        }
      }
      if (node.required) result.required = node.required;
      if (node.additionalProperties !== undefined) {
        result.additionalProperties = typeof node.additionalProperties === 'object'
          ? this.sanitizeNode(node.additionalProperties)
          : node.additionalProperties;
      }
    }

    if (node.type === 'array' && node.items) {
      result.items = this.sanitizeNode(node.items);
    }

    return result;
  }
}

/**
 * Generic response parser that looks for converted array pairs (i.e. lists of { property, value })
 * in the LLM JSON output and reconstructs them into standard key-value objects.
 * This guarantees the core application never knows if a provider used a schema with array-pairs.
 */
export function restoreDynamicMaps(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    // Check if the array represents a serialized map: [{ property: "x", value: "y" }]
    const isPairArray = obj.length > 0 && obj.every(item => 
      item && typeof item === 'object' && 
      'property' in item && 'value' in item && 
      Object.keys(item).length === 2
    );

    if (isPairArray) {
      const map: Record<string, any> = {};
      obj.forEach(item => {
        if (typeof item.property === 'string') {
          map[item.property] = restoreDynamicMaps(item.value);
        }
      });
      return map;
    }

    return obj.map(restoreDynamicMaps);
  }

  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = restoreDynamicMaps(val);
  }
  return result;
}
