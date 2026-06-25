import type { SemanticElement } from '../types';

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

/**
 * Call the Gemini API to execute visual edits based on a user prompt.
 * Falls back to a local rules engine if no apiKey is provided.
 */
export async function executeAiEdit(
  prompt: string,
  semanticTree: SemanticElement[],
  apiKey?: string
): Promise<AiResponse> {
  if (!apiKey) {
    // Return mock response based on common intents for testing/demo
    return getLocalMockResponse(prompt, semanticTree);
  }

  const systemInstruction = `
    Você é um assistente de IA especialista em design de interfaces e UX.
    Sua tarefa é analisar uma árvore semântica de elementos de uma página HTML (representada em JSON) e aplicar modificações localizadas de estilo (CSS inline) ou conteúdo (texto) com base no pedido do usuário.
    
    Regras estritas:
    1. Retorne APENAS um objeto JSON correspondendo ao schema definido.
    2. Nunca mude a estrutura do documento ou remova tags inteiras a menos que solicitado.
    3. Prefira mudanças estéticas cirúrgicas (cores, tamanhos de fontes, margens, paddings, bordas, etc.).
    4. Explique brevemente o que você alterou e por quê na propriedade 'explanation'.
    5. Referencie os elementos usando o 'id' fornecido (ex: 'el-1', 'el-2').
  `;

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
      responseSchema: {
        type: "OBJECT",
        properties: {
          explanation: { type: "STRING" },
          styleMutations: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                elementId: { type: "STRING" },
                styles: {
                  type: "OBJECT",
                  additionalProperties: { type: "STRING" }
                }
              },
              required: ["elementId", "styles"]
            }
          },
          contentMutations: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                elementId: { type: "STRING" },
                content: { type: "STRING" }
              },
              required: ["elementId", "content"]
            }
          }
        },
        required: ["explanation", "styleMutations", "contentMutations"]
      }
    }
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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

    return JSON.parse(jsonText) as AiResponse;
  } catch (error: any) {
    console.error("Erro na API do Gemini:", error);
    throw new Error(`Falha na IA: ${error.message || error}`);
  }
}

/**
 * Quick rule-based client-side mocked responses for common presentation adjustments
 */
function getLocalMockResponse(prompt: string, tree: SemanticElement[]): AiResponse {
  const p = prompt.toLowerCase();
  
  // Find interesting elements in tree
  const titles = findElementsByRole(tree, 'title');
  const texts = findElementsByRole(tree, 'text');
  const cards = findElementsByRole(tree, 'card');
  const body = tree.find(el => el.tagName === 'BODY');

  if (p.includes('título') || p.includes('titulo') || p.includes('font') || p.includes('aumente')) {
    if (titles.length > 0) {
      return {
        explanation: "Aumentei o tamanho e o peso da fonte dos títulos para melhorar a hierarquia visual.",
        styleMutations: titles.map(t => ({
          elementId: t.id,
          styles: {
            fontSize: '3rem',
            fontWeight: '800',
            letterSpacing: '-0.05em',
            lineHeight: '1.2'
          }
        })),
        contentMutations: []
      };
    }
  }

  if (p.includes('escuro') || p.includes('dark') || p.includes('preto') || p.includes('consultoria')) {
    const mutations: StyleMutation[] = [];
    if (body) {
      mutations.push({
        elementId: body.id,
        styles: {
          backgroundColor: '#0f172a',
          color: '#f8fafc'
        }
      });
    }
    titles.forEach(t => {
      mutations.push({
        elementId: t.id,
        styles: { color: '#f1f5f9' }
      });
    });
    cards.forEach(c => {
      mutations.push({
        elementId: c.id,
        styles: {
          backgroundColor: '#1e293b',
          borderColor: '#334155',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: '8px',
          padding: '24px'
        }
      });
    });
    return {
      explanation: "Apliquei um tema executivo escuro (Slate Dark) com fundo escuro e cards de alto contraste.",
      styleMutations: mutations,
      contentMutations: []
    };
  }

  if (p.includes('espaço') || p.includes('margem') || p.includes('compacto')) {
    const mutations: StyleMutation[] = [];
    // Reduce padding/margin on containers
    const containers = findElementsByRole(tree, 'container');
    containers.forEach(c => {
      mutations.push({
        elementId: c.id,
        styles: {
          paddingTop: '12px',
          paddingBottom: '12px',
          gap: '16px'
        }
      });
    });
    return {
      explanation: "Reduzi os espaçamentos internos e as margens dos contêineres para tornar o layout mais compacto.",
      styleMutations: mutations,
      contentMutations: []
    };
  }

  if (p.includes('destac') || p.includes('destaque') || p.includes('numero') || p.includes('número')) {
    // Try to find numbers/metrics in texts
    const numberMutations: StyleMutation[] = [];
    texts.forEach(t => {
      if (t.text && /\d+/.test(t.text)) {
        numberMutations.push({
          elementId: t.id,
          styles: {
            fontSize: '4rem',
            fontWeight: '900',
            color: '#3b82f6', // Bright blue accent
            textShadow: '0 4px 6px rgba(59, 130, 246, 0.1)'
          }
        });
      }
    });

    if (numberMutations.length > 0) {
      return {
        explanation: "Destaquei os números da apresentação aplicando uma fonte maior e cor azul vibrante.",
        styleMutations: numberMutations,
        contentMutations: []
      };
    }
  }

  // Generic fallback modification
  if (titles.length > 0) {
    return {
      explanation: `Modifiquei o estilo do título principal (${titles[0].tagName}) para aplicar um destaque azul moderno.`,
      styleMutations: [
        {
          elementId: titles[0].id,
          styles: {
            color: '#3b82f6',
            borderBottom: '2px solid #3b82f6',
            paddingBottom: '8px'
          }
        }
      ],
      contentMutations: []
    };
  }

  return {
    explanation: "Não identifiquei elementos específicos para alterar. Experimente pedir algo como 'título maior' ou 'tema escuro'.",
    styleMutations: [],
    contentMutations: []
  };
}

function findElementsByRole(tree: SemanticElement[], role: SemanticElement['role']): SemanticElement[] {
  const result: SemanticElement[] = [];
  const traverse = (elements: SemanticElement[]) => {
    elements.forEach(el => {
      if (el.role === role) {
        result.push(el);
      }
      traverse(el.children);
    });
  };
  traverse(tree);
  return result;
}
