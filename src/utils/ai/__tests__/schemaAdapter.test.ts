import { describe, it, expect } from 'vitest';
import { GeminiSchemaAdapter, OpenAiSchemaAdapter, ClaudeSchemaAdapter, restoreDynamicMaps } from '../schemaAdapter';
import type { JsonSchema } from '../types';

describe('Schema Adapters and Response Sanitizer', () => {

  it('should adapt simple object schemas correctly for Gemini and OpenAI', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'User name' },
        age: { type: 'number', description: 'User age' }
      },
      required: ['name']
    };

    // Gemini Adapter test (uppercase types)
    const geminiAdapter = new GeminiSchemaAdapter();
    const adaptedGemini = geminiAdapter.adapt(schema);
    expect(adaptedGemini.type).toBe('OBJECT');
    expect(adaptedGemini.properties.name.type).toBe('STRING');
    expect(adaptedGemini.properties.age.type).toBe('NUMBER');
    expect(adaptedGemini.required).toContain('name');
    expect(adaptedGemini.additionalProperties).toBeUndefined();

    // OpenAI Adapter test (lowercase types, additionalProperties: false, strict mode requires all keys in required)
    const openAiAdapter = new OpenAiSchemaAdapter(true);
    const adaptedOpenAi = openAiAdapter.adapt(schema);
    expect(adaptedOpenAi.type).toBe('object');
    expect(adaptedOpenAi.properties.name.type).toBe('string');
    expect(adaptedOpenAi.properties.age.type).toBe('number');
    expect(adaptedOpenAi.required).toContain('name');
    expect(adaptedOpenAi.required).toContain('age');
    expect(adaptedOpenAi.additionalProperties).toBe(false);
  });

  it('should adapt nested object schemas', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        info: {
          type: 'object',
          properties: {
            details: { type: 'string' }
          },
          required: ['details']
        }
      },
      required: ['info']
    };

    const geminiAdapter = new GeminiSchemaAdapter();
    const adaptedGemini = geminiAdapter.adapt(schema);
    expect(adaptedGemini.properties.info.type).toBe('OBJECT');
    expect(adaptedGemini.properties.info.properties.details.type).toBe('STRING');

    const openAiAdapter = new OpenAiSchemaAdapter(true);
    const adaptedOpenAi = openAiAdapter.adapt(schema);
    expect(adaptedOpenAi.properties.info.type).toBe('object');
    expect(adaptedOpenAi.properties.info.additionalProperties).toBe(false);
    expect(adaptedOpenAi.properties.info.required).toContain('details');
  });

  it('should adapt arrays of primitives and arrays of objects', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' }
        },
        itemsList: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            },
            required: ['id']
          }
        }
      },
      required: ['tags', 'itemsList']
    };

    const geminiAdapter = new GeminiSchemaAdapter();
    const adaptedGemini = geminiAdapter.adapt(schema);
    expect(adaptedGemini.properties.tags.type).toBe('ARRAY');
    expect(adaptedGemini.properties.tags.items.type).toBe('STRING');
    expect(adaptedGemini.properties.itemsList.items.type).toBe('OBJECT');
    expect(adaptedGemini.properties.itemsList.items.properties.id.type).toBe('STRING');

    const openAiAdapter = new OpenAiSchemaAdapter(true);
    const adaptedOpenAi = openAiAdapter.adapt(schema);
    expect(adaptedOpenAi.properties.tags.type).toBe('array');
    expect(adaptedOpenAi.properties.itemsList.items.additionalProperties).toBe(false);
  });

  it('should convert dynamic record maps to array pairs for Gemini', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        styles: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['styles']
    };

    const geminiAdapter = new GeminiSchemaAdapter();
    const adaptedGemini = geminiAdapter.adapt(schema);
    
    // Check that styles is now an ARRAY of OBJECTS with { property, value }
    expect(adaptedGemini.properties.styles.type).toBe('ARRAY');
    expect(adaptedGemini.properties.styles.items.type).toBe('OBJECT');
    expect(adaptedGemini.properties.styles.items.properties.property.type).toBe('STRING');
    expect(adaptedGemini.properties.styles.items.properties.value.type).toBe('STRING');
    expect(adaptedGemini.properties.styles.items.required).toContain('property');
    expect(adaptedGemini.properties.styles.items.required).toContain('value');
    expect(adaptedGemini.properties.styles.additionalProperties).toBeUndefined();
  });

  it('should convert dynamic maps to array-pairs for OpenAI in strict mode', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        styles: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['styles']
    };

    const openAiAdapter = new OpenAiSchemaAdapter(true);
    const adaptedOpenAi = openAiAdapter.adapt(schema);
    expect(adaptedOpenAi.properties.styles.type).toBe('array');
    expect(adaptedOpenAi.properties.styles.items.type).toBe('object');
    expect(adaptedOpenAi.properties.styles.items.properties.property.type).toBe('string');
  });

  it('should allow dynamic maps in Claude without conversion', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        styles: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['styles']
    };

    const claudeAdapter = new ClaudeSchemaAdapter();
    const adaptedClaude = claudeAdapter.adapt(schema);
    expect(adaptedClaude.properties.styles.type).toBe('object');
    expect(adaptedClaude.properties.styles.additionalProperties.type).toBe('string');
  });

  it('should restore dynamic maps from array pairs in output sanitizer', () => {
    const mockLlmResponse = {
      explanation: "Ajuste efetuado",
      styleMutations: [
        {
          elementId: "el-1",
          styles: [
            { property: "fontSize", value: "24px" },
            { property: "color", value: "blue" }
          ]
        }
      ],
      contentMutations: []
    };

    const restored = restoreDynamicMaps(mockLlmResponse);
    expect(restored.styleMutations[0].styles).toEqual({
      fontSize: "24px",
      color: "blue"
    });
  });

  it('should adapt enum configurations and required attributes correctly', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['slide', 'card', 'title', 'text']
        }
      },
      required: ['role']
    };

    const geminiAdapter = new GeminiSchemaAdapter();
    const adaptedGemini = geminiAdapter.adapt(schema);
    expect(adaptedGemini.properties.role.enum).toEqual(['slide', 'card', 'title', 'text']);
  });

  it('should handle large complex presentation edit schemas', () => {
    const complexSchema: JsonSchema = {
      type: 'object',
      properties: {
        explanation: { type: 'string' },
        styleMutations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              elementId: { type: 'string' },
              styles: {
                type: 'object',
                additionalProperties: { type: 'string' }
              }
            },
            required: ['elementId', 'styles']
          }
        }
      },
      required: ['explanation', 'styleMutations']
    };

    const geminiAdapter = new GeminiSchemaAdapter();
    const adaptedGemini = geminiAdapter.adapt(complexSchema);
    expect(adaptedGemini.type).toBe('OBJECT');
    expect(adaptedGemini.properties.styleMutations.items.properties.styles.type).toBe('ARRAY');
  });
});
