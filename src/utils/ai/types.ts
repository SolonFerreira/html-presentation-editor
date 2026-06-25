export interface StyleMutation {
  elementId: string;
  styles: Record<string, string>;
}

export interface ContentMutation {
  elementId: string;
  content: string;
}

export interface AiResponse {
  explanation: string;
  styleMutations: StyleMutation[];
  contentMutations: ContentMutation[];
}

export type JsonSchemaType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';

export interface JsonSchema {
  type: JsonSchemaType;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
  description?: string;
  format?: string;
  nullable?: boolean;
  additionalProperties?: boolean | JsonSchema;
  [key: string]: any; // Allow extensibility
}

export interface AIProvider {
  name: string;
  generateEdits(prompt: string, semanticTree: any[]): Promise<AiResponse>;
}
