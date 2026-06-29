/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, MessageSquare, CircleAlert } from 'lucide-react';
import { Transaction, BudgetGoal } from '../types';

interface Message {
  sender: 'user' | 'assistant' | 'system';
  text: string;
}

interface FinanceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  budgetGoals: BudgetGoal[];
  theme?: 'dark' | 'light';
  userEmail?: string;
}

export default function FinanceAssistant({ 
  isOpen, 
  onClose, 
  transactions, 
  budgetGoals, 
  theme = 'dark',
  userEmail
}: FinanceAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'assistant', 
      text: 'E aí! Sou o Kairos, consultor financeiro do time Leadium. Me diz o que você precisa conferir ou calcular no nosso caixa hoje! É só mandar a sua dúvida.' 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend,
          transactionsContext: transactions,
          budgetGoalsContext: budgetGoals,
          currentDate: new Date().toISOString().substring(0, 10),
          userEmail
        })
      });

      if (!response.ok) {
        throw new Error('Não foi possível se conectar ao servidor da API.');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { sender: 'assistant', text: data.text || 'Desculpe, tive um contratempo para analisar seus dados.' }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { 
        sender: 'system', 
        text: 'Instabilidade de conexão. Verifique se a chave API está configurada nos Secrets do AI Studio.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const preBakedPrompts = [
    'Qual valor entrou hoje?',
    'Quanto saiu no total de ontem?',
    'Como está meu saldo líquido hoje?',
    'Consumo das Alocações Planejadas',
  ];

  // Helper inside component to parse simple markdown bold and bullet lists
  const renderMessageContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      // Check if it represents a bullet line
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      const cleanContent = isBullet ? trimmed.substring(2) : line;

      // Scan and parse **text** using regex
      const parts = [];
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let match;
      let lastIndex = 0;

      while ((match = boldRegex.exec(cleanContent)) !== null) {
        const matchIndex = match.index;
        if (matchIndex > lastIndex) {
          parts.push(cleanContent.substring(lastIndex, matchIndex));
        }
        parts.push(
          <strong key={matchIndex} className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < cleanContent.length) {
        parts.push(cleanContent.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 leading-relaxed text-left">
            <span className={`shrink-0 mt-1.5 font-bold text-[10px] select-none ${theme === 'dark' ? 'text-[#AD4F25]' : 'text-black'}`}>
              •
            </span>
            <span className="flex-1">
              {parts.length > 0 ? parts : cleanContent}
            </span>
          </div>
        );
      }

      return (
        <p key={idx} className={`${idx > 0 ? 'mt-1.5' : ''} leading-relaxed text-left`}>
          {parts.length > 0 ? parts : cleanContent}
        </p>
      );
    });
  };

  // Determine styles dynamically based on light vs dark theme
  const isDark = theme === 'dark';

  const logoUrl = theme === 'light'
    ? "https://i.ibb.co/M5kWMmTJ/logo-para-versao-white-removebg-preview.png"
    : "https://i.ibb.co/k245JhFM/logotipooficialleadium.png";

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full sm:w-96 border-l shadow-2xl z-50 flex flex-col justify-between animate-slideLeft transition-colors duration-350 ${
        isDark 
          ? 'bg-[#0A0A0A] border-white/10 text-[#F4F4F5]' 
          : 'bg-[#F9F9FB] border-black/10 text-gray-805'
      }`}
      style={{
        backgroundImage: isDark
          ? 'radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)'
          : 'radial-gradient(circle, rgba(0,0,0,0.015) 1px, transparent 1px)',
        backgroundSize: '12px 12px'
      }}
    >
      {/* WhatsApp Header bar with Logo */}
      <div className={`p-4 border-b flex justify-between items-center ${
        isDark ? 'bg-[#121212] border-white/5' : 'bg-white border-black/5 shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          {/* Logo of the company */}
          <div className={`relative p-1 rounded-xl shrink-0 flex items-center justify-center ${
            isDark ? 'bg-black border border-white/10' : 'bg-white border border-black/5 shadow-xs'
          }`}>
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-7 h-7 object-contain" 
              referrerPolicy="no-referrer"
            />
            {/* WhatsApp online indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-inherit ring-1 ring-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-left">
            <h3 className={`text-xs uppercase tracking-[0.15em] font-extrabold ${isDark ? 'text-white' : 'text-black'}`}>
              Kairos
            </h3>
            <span className={`text-[8px] font-bold tracking-wider uppercase block ${
              isDark ? 'text-[#AD4F25]' : 'text-gray-500'
            }`}>
              Consultor Financeiro
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className={`transition-colors cursor-pointer p-1.5 rounded-full ${
            isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-black hover:bg-black/5'
          }`}
          title="Fechar"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Messages area similar to WhatsApp */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((m, idx) => {
          if (m.sender === 'system') {
            return (
              <div key={idx} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 flex items-start gap-2 animate-fadeIn">
                <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{m.text}</span>
              </div>
            );
          }

          const isAssistant = m.sender === 'assistant';
          return (
            <div 
              key={idx} 
              className={`flex items-start gap-2.5 max-w-[88%] ${isAssistant ? '' : 'ml-auto flex-row-reverse'}`}
            >
              {/* Avatar on left for bot, none/right for user */}
              {isAssistant && (
                <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center p-0.5 border ${
                  isDark ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-xs'
                }`}>
                  <img 
                    src={logoUrl} 
                    alt="Bot Profile" 
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* WhatsApp Balloon with corresponding tails */}
              <div className={`p-3.5 rounded-2xl text-[12.5px] leading-relaxed shadow-sm relative transition-all ${
                isAssistant 
                  ? isDark 
                    ? 'bg-[#18181B] text-gray-200 border border-white/5 rounded-tl-none' 
                    : 'bg-white text-gray-800 border border-black/5 rounded-tl-none'
                  : isDark 
                    ? 'bg-white text-black font-medium rounded-tr-none' 
                    : 'bg-black text-zinc-50 font-medium rounded-tr-none shadow-md'
              }`}>
                {/* Time stamp simulated for WhatsApp vibe */}
                <div className={`break-words select-text ${
                  isAssistant 
                    ? isDark ? 'text-gray-200' : 'text-gray-800'
                    : isDark ? 'text-black font-semibold' : 'text-zinc-55 font-semibold'
                }`}>
                  {isAssistant ? renderMessageContent(m.text) : m.text}
                </div>
                <div className={`text-[7.5px] text-right mt-1.5 select-none font-mono tracking-tighter ${
                  isAssistant 
                    ? 'text-gray-500 opacity-60'
                    : isDark ? 'text-black/55' : 'text-zinc-100/60'
                }`}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2.5 max-w-[85%]">
            <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center p-0.5 border ${
              isDark ? 'bg-black border-white/10' : 'bg-white border-black/5 shadow-xs'
            }`}>
              <img 
                src={logoUrl} 
                alt="Analyzing..." 
                className="w-full h-full object-contain animate-spin" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 rounded-tl-none shadow-xs ${
              isDark ? 'bg-[#18181B] text-gray-400 border border-white/5' : 'bg-white text-gray-500 border border-black/5'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDark ? 'bg-white' : 'bg-black'}`}></span>
              <span className={`w-1.5 h-1.5 rounded-full animate-bounce delay-100 ${isDark ? 'bg-white' : 'bg-black'}`}></span>
              <span className={`w-1.5 h-1.5 rounded-full animate-bounce delay-200 ${isDark ? 'bg-white' : 'bg-black'}`}></span>
              <span>Só um momento...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested prompts list & Inputs */}
      <div className={`p-4 border-t space-y-3 bg-inherit ${
        isDark ? 'border-white/5 bg-[#0D0D0D]' : 'border-black/5 bg-white shadow-lg'
      }`}>
        {/* Prebaked Prompts - toggled by the small button */}
        {showSuggestions && (
          <div className="space-y-1 font-sans animate-fadeIn">
            <p className="text-[7.5px] uppercase tracking-[0.25em] text-gray-500 font-bold text-left select-none">
              Mapeamento Rápido
            </p>
            <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-none snap-x snap-mandatory flex-nowrap sm:flex-wrap sm:overflow-x-visible cursor-grab active:cursor-grabbing w-full">
              {preBakedPrompts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setInputText(p); setShowSuggestions(false); }}
                  className={`snap-center shrink-0 max-w-[80%] sm:max-w-full text-[9px] uppercase tracking-wider font-bold py-1.5 px-3 rounded-xl transition-all text-left cursor-pointer border select-none ${
                    isDark 
                      ? 'bg-[#121212] hover:bg-white hover:text-black text-gray-400 border-white/5' 
                      : 'bg-gray-100 hover:bg-black hover:text-white text-gray-600 border-black/5 shadow-xs'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Form input fields */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
          className={`flex items-center gap-2 border rounded-xl py-1 px-1.5 transition-all ${
            isDark 
              ? 'bg-[#121212] border-white/10 focus-within:border-white/30' 
              : 'bg-gray-100 border-black/5 shadow-inner focus-within:border-black/20'
          }`}
        >
          {/* Small Suggestion Toggle Button */}
          <button
            id="btn-toggle-suggestions"
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              showSuggestions
                ? isDark ? 'text-white bg-white/10' : 'text-black bg-black/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Sugestões de Mensagens"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite sua pergunta..."
            className={`flex-1 bg-transparent px-2 py-1.5 text-xs focus:outline-none focus:ring-0 ${
              isDark ? 'text-white placeholder-gray-600' : 'text-black placeholder-gray-400'
            }`}
          />
          <button
            type="submit"
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark 
                ? 'bg-white hover:bg-gray-200 text-black' 
                : 'bg-black hover:bg-gray-800 text-zinc-50 shadow-xs'
            }`}
            title="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
