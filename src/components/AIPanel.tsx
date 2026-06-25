import React, { useState } from 'react';
import { Sparkles, Key, Send, Loader2, RotateCcw, Check, X, ShieldAlert } from 'lucide-react';

interface AIPanelProps {
  onSendPrompt: (prompt: string) => Promise<void>;
  apiKey: string;
  onChangeApiKey: (key: string) => void;
  loading: boolean;
  explanation: string;
  onUndo: () => void;
  canUndo: boolean;
  
  // Diff Review support
  pendingChanges: {
    explanation: string;
    styleCount: number;
    contentCount: number;
  } | null;
  onApplyChanges: () => void;
  onCancelChanges: () => void;
}

export function AIPanel({
  onSendPrompt,
  apiKey,
  onChangeApiKey,
  loading,
  explanation,
  onUndo,
  canUndo,
  
  pendingChanges,
  onApplyChanges,
  onCancelChanges
}: AIPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading || pendingChanges) return;
    onSendPrompt(prompt.trim());
    setPrompt('');
  };

  const handleQuickPrompt = (text: string) => {
    if (loading || pendingChanges) return;
    onSendPrompt(text);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[640px] max-w-[90vw] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl z-30 select-none overflow-hidden transition-all duration-300">
      
      {/* 1. DIFF REVIEW EXPANDABLE PANEL (If there are pending mutations) */}
      {pendingChanges && (
        <div className="p-4 border-b border-slate-800/80 bg-blue-950/20 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 text-blue-400">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Aprovação de Alterações (AI Copiloto)
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-850/60 p-3 rounded-lg text-xs leading-relaxed text-slate-300 select-text max-h-[120px] overflow-y-auto">
            <p className="font-semibold text-blue-300 mb-1">Resumo das Mudanças Propostas:</p>
            <p className="italic">"{pendingChanges.explanation}"</p>
            
            <div className="flex gap-4 mt-2 text-[10px] text-slate-500 font-bold border-t border-slate-800/60 pt-1.5 uppercase">
              <span>Mutações de Estilo: {pendingChanges.styleCount}</span>
              <span>Alterações de Conteúdo: {pendingChanges.contentCount}</span>
            </div>
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-slate-500 italic">
              Revise e aprove para gravar fisicamente em seu arquivo.
            </span>
            <div className="flex gap-2">
              <button
                onClick={onCancelChanges}
                className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Descartar
              </button>
              <button
                onClick={onApplyChanges}
                className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-bold cursor-pointer transition-colors shadow-md shadow-blue-600/20"
              >
                <Check className="w-3.5 h-3.5" />
                Aplicar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REGULAR CMD COMMAND BAR INTERFACE */}
      <div className="p-3 flex flex-col gap-2.5">
        
        {/* Quick Suggestion Preset Chips */}
        {!pendingChanges && (
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap shrink-0">
              Copiloto:
            </span>
            <button
              onClick={() => handleQuickPrompt("Deixe este slide elegante com visual da Apple")}
              disabled={loading}
              className="text-[10px] font-semibold bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Visual Apple
            </button>
            <button
              onClick={() => handleQuickPrompt("Altere o fundo para um tema executivo de alta consultoria")}
              disabled={loading}
              className="text-[10px] font-semibold bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Tema McKinsey
            </button>
            <button
              onClick={() => handleQuickPrompt("Reduza os textos e resumos em 30%")}
              disabled={loading}
              className="text-[10px] font-semibold bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Resumir Textos 30%
            </button>
            <button
              onClick={() => handleQuickPrompt("Melhore o contraste e legibilidade das cores")}
              disabled={loading}
              className="text-[10px] font-semibold bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Ajustar Contraste
            </button>
          </div>
        )}

        {/* Input Bar Form */}
        <div className="flex gap-3 items-center">
          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <div className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-750 focus-within:border-blue-500 rounded-lg px-3 py-1.5 flex items-center gap-2 transition-all">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading || !!pendingChanges}
                placeholder={pendingChanges ? "Aguardando aprovação do diff..." : "Digite o prompt para ajustar o slide..."}
                className="bg-transparent text-xs text-slate-200 focus:outline-none w-full"
              />
            </div>
            {!pendingChanges && (
              <button
                type="submit"
                disabled={!prompt.trim() || loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Enviar
              </button>
            )}
          </form>

          {/* AI Info & API configuration */}
          <div className="flex items-center gap-2 shrink-0">
            {canUndo && !pendingChanges && (
              <button
                onClick={onUndo}
                className="p-1.5 rounded border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Desfazer IA"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  apiKey
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Configurar Chave API"
              >
                <Key className="w-3.5 h-3.5" />
              </button>

              {showKeyInput && (
                <div className="absolute right-0 bottom-full mb-2.5 bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl flex flex-col gap-2 w-56 z-20">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Gemini API Key
                  </span>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => onChangeApiKey(e.target.value)}
                    placeholder="Cole sua Gemini API Key..."
                    className="bg-slate-900 border border-slate-800 rounded p-1.5 text-[10px] text-slate-200 focus:outline-none w-full"
                  />
                  <p className="text-[9px] text-slate-600 leading-tight">
                    Omitido: usa simulação local rápida.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading / Status explanation text */}
        {explanation && !pendingChanges && (
          <div className="bg-slate-950 border border-slate-850/50 p-2 rounded-lg max-h-[38px] overflow-y-auto shrink-0 select-text">
            <p className="text-[10px] text-slate-400 leading-snug">
              {explanation}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
