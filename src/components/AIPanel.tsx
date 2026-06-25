import React, { useState } from 'react';
import { Sparkles, Key, Send, Loader2, RotateCcw } from 'lucide-react';

interface AIPanelProps {
  onSendPrompt: (prompt: string) => Promise<void>;
  apiKey: string;
  onChangeApiKey: (key: string) => void;
  loading: boolean;
  explanation: string;
  onUndo: () => void;
  canUndo: boolean;
}

export function AIPanel({
  onSendPrompt,
  apiKey,
  onChangeApiKey,
  loading,
  explanation,
  onUndo,
  canUndo
}: AIPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    onSendPrompt(prompt.trim());
    setPrompt('');
  };

  const handleQuickPrompt = (text: string) => {
    if (loading) return;
    onSendPrompt(text);
  };

  return (
    <footer className="bg-slate-900 border-t border-slate-800 p-4 flex flex-col gap-3 min-h-[140px] select-none shrink-0">
      
      {/* Upper bar: AI Configuration & Quick prompts */}
      <div className="flex items-center justify-between gap-4">
        
        {/* Quick suggestions */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Sugestões Rápidas:
          </span>
          <button
            onClick={() => handleQuickPrompt("Deixe este slide elegante com tema escuro executivo")}
            disabled={loading}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1 rounded-full hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
          >
            Tema Escuro Executivo
          </button>
          <button
            onClick={() => handleQuickPrompt("Aumente todos os títulos para dar mais destaque")}
            disabled={loading}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1 rounded-full hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
          >
            Aumentar Títulos
          </button>
          <button
            onClick={() => handleQuickPrompt("Destaque as métricas e números")}
            disabled={loading}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1 rounded-full hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
          >
            Destacar Números
          </button>
          <button
            onClick={() => handleQuickPrompt("Reduza os espaços e deixe o layout compacto")}
            disabled={loading}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1 rounded-full hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
          >
            Layout Compacto
          </button>
        </div>

        {/* API Key configuration & Undo */}
        <div className="flex items-center gap-3 shrink-0">
          {canUndo && (
            <button
              onClick={onUndo}
              className="flex items-center gap-1 text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1 rounded cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer IA
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition-colors cursor-pointer ${
                apiKey
                  ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              {apiKey ? 'API Key Configurada' : 'Configurar API Key'}
            </button>

            {showKeyInput && (
              <div className="absolute right-0 bottom-full mb-2 bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl flex flex-col gap-2 w-64 z-20">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Gemini API Key
                </span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => onChangeApiKey(e.target.value)}
                  placeholder="Insira sua Gemini API Key..."
                  className="bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                />
                <p className="text-[9px] text-slate-600 leading-tight">
                  Se omitido, a IA usará respostas simuladas locais para demonstração rápida.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower bar: Input form & AI thoughts */}
      <div className="flex gap-4 items-center">
        {/* Form Input */}
        <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
          <div className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 focus-within:border-blue-500 rounded-lg px-3 py-2 flex items-center gap-2 transition-all">
            <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              placeholder="Ex: 'Deixe o slide elegante com tema escuro e aumente os títulos em 20px...'"
              className="bg-transparent text-sm text-slate-200 focus:outline-none w-full"
            />
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-sm px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Ajustar
          </button>
        </form>

        {/* AI Action/Explanation summary */}
        {explanation && (
          <div className="w-80 bg-blue-950/20 border border-blue-900/30 rounded-lg p-2.5 max-h-[48px] overflow-y-auto">
            <p className="text-xs text-blue-300 italic leading-snug">
              <strong>IA:</strong> {explanation}
            </p>
          </div>
        )}
      </div>

    </footer>
  );
}
