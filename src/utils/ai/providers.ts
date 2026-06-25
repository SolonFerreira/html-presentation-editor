import type { AIProvider, AiResponse, JsonSchema } from './types';
import { GeminiSchemaAdapter, restoreDynamicMaps } from './schemaAdapter';

/**
 * Standard, abstract JSON Schema specifying the expected structured output format.
 * This is platform-agnostic and uses additionalProperties to map the styles Record.
 */
export const presentationEditSchema: JsonSchema = {
  type: 'object',
  properties: {
    explanation: {
      type: 'string',
      description: 'Breve explicação das mudanças visuais efetuadas'
    },
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
    },
    contentMutations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          elementId: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['elementId', 'content']
      }
    }
  },
  required: ['explanation', 'styleMutations', 'contentMutations']
};

/**
 * Gemini AI Provider implementation.
 * Adapts schemas, calls the Gemini REST endpoint, and sanitizes output.
 */
export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API Key para o Gemini é obrigatória.');
    }
    this.apiKey = apiKey;
  }

  async generateEdits(prompt: string, semanticTree: any[]): Promise<AiResponse> {
    const systemInstruction = `
      Você é um assistente de IA especialista em design de interfaces e UX.
      Sua tarefa é analisar uma árvore semântica de elementos de uma página HTML (representada em JSON) e aplicar modificações localizadas de estilo (CSS inline) ou conteúdo (texto) com base no pedido do usuário.
      
      Regras estritas:
      1. Retorne APENAS um objeto JSON correspondendo ao schema de resposta definido.
      2. Nunca mude a estrutura do documento ou remova tags inteiras a menos que solicitado.
      3. Prefira mudanças estéticas cirúrgicas (cores, tamanhos de fontes, margens, paddings, bordas, etc.).
      4. Explique brevemente o que você alterou e por quê na propriedade 'explanation'.
      5. Referencie os elementos usando o 'id' fornecido (ex: 'el-1', 'el-2').
    `;

    // Adapt the abstract schema to Gemini-specific format (removing additionalProperties, uppercasing types, converting map to array)
    const adapter = new GeminiSchemaAdapter();
    const adaptedSchema = adapter.adapt(presentationEditSchema);

    // Logging the schema payload for debug visibility (Requirement 3 log check)
    console.log("GEMINI ADAPTED SCHEMA:", JSON.stringify(adaptedSchema, null, 2));

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `
                PROMPT DO USUÁRIO: "${prompt}"
                
                ÁRVORE SEMÂNTICA DOS ELEMENTOS:
                ${JSON.stringify(semanticTree, null, 2)}
              `
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: adaptedSchema
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      throw new Error("Resposta vazia da API do Gemini.");
    }

    const rawResult = JSON.parse(jsonText);
    
    // Automatically restore array pairs back to dictionary maps (Record<string, string>)
    const restoredResult = restoreDynamicMaps(rawResult);

    return restoredResult as AiResponse;
  }
}

/**
 * Placeholder for future OpenAI Provider implementation.
 */
export class OpenAiProvider implements AIProvider {
  name = 'openai';

  constructor(_apiKey: string) {}

  async generateEdits(_prompt: string, _semanticTree: any[]): Promise<AiResponse> {
    throw new Error('Provedor OpenAI não configurado no MVP.');
  }
}

/**
 * Placeholder for future Claude/Anthropic Provider implementation.
 */
export class ClaudeProvider implements AIProvider {
  name = 'claude';

  constructor(_apiKey: string) {}

  async generateEdits(_prompt: string, _semanticTree: any[]): Promise<AiResponse> {
    throw new Error('Provedor Claude não configurado no MVP.');
  }
}

/**
 * Factory helper to instantiate providers.
 */
export function getAiProvider(name: string, apiKey: string): AIProvider {
  switch (name.toLowerCase()) {
    case 'gemini':
      return new GeminiProvider(apiKey);
    case 'openai':
      return new OpenAiProvider(apiKey);
    case 'claude':
      return new ClaudeProvider(apiKey);
    default:
      throw new Error(`Provedor de IA desconhecido: ${name}`);
  }
}
