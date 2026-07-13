/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, MessageSquare, CircleAlert, Trash2, Mic, Square, Loader2, Paperclip, FileText } from 'lucide-react';
import { Transaction, BudgetGoal } from '../types';

interface Message {
  sender: 'user' | 'assistant' | 'system';
  text: string;
}

// User audio messages are persisted as `${AUDIO_PREFIX}<url>` so the chat bubble can be
// re-rendered as a playable voice note (WhatsApp-style) instead of showing the raw transcript.
const AUDIO_PREFIX = '__AUDIO__:';
// Photo/document attachments are persisted as `${FILE_PREFIX}<url>` so the bubble can be
// re-rendered as an image thumbnail or a document link on reload.
const FILE_PREFIX = '__FILE__:';

const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)(\?|$)/i.test(url);

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
  const [confirmClear, setConfirmClear] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: string; name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const audioFallbackInputRef = useRef<HTMLInputElement>(null);

  // Load persistent conversation history from the server-side database
  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
      try {
        const emailToUse = userEmail || "anonymous";
        const res = await fetch(`/api/gemini/history?email=${encodeURIComponent(emailToUse)}`);
        if (res.ok) {
          const historyData = await res.json();
          if (historyData && historyData.length > 0) {
            setMessages(historyData);
          } else {
            setMessages([
              { 
                sender: 'assistant', 
                text: 'E aí! Sou o Kairos, consultor financeiro do time Leadium. Me diz o que você precisa conferir ou calcular no nosso caixa hoje! É só mandar a sua dúvida.' 
              }
            ]);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar histórico do Kairos:', err);
      }
    };

    fetchHistory();
  }, [isOpen, userEmail]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleClearHistory = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    try {
      const emailToUse = userEmail || "anonymous";
      const res = await fetch('/api/gemini/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse })
      });
      if (res.ok) {
        setMessages([
          { 
            sender: 'assistant', 
            text: 'Histórico limpo com sucesso! Como posso ajudar você agora?' 
          }
        ]);
        setConfirmClear(false);
      }
    } catch (err) {
      console.error('Erro ao limpar histórico:', err);
    }
  };

  if (!isOpen) return null;

  const handleSendMessage = async (
    textToSend: string,
    audioUrl?: string,
    attachment?: { url: string; type: string; name: string }
  ) => {
    if ((!textToSend.trim() && !audioUrl && !attachment) || isLoading) return;

    // When a file is attached we push two bubbles: the attachment itself and (if present) the caption,
    // so the caption text isn't lost on reload the way a single combined bubble would.
    if (attachment) {
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: `${FILE_PREFIX}${attachment.url}` },
        ...(textToSend.trim() ? [{ sender: 'user' as const, text: textToSend }] : []),
      ]);
    } else {
      const userMessage: Message = { sender: 'user', text: audioUrl ? `${AUDIO_PREFIX}${audioUrl}` : textToSend };
      setMessages(prev => [...prev, userMessage]);
    }
    setInputText('');
    setIsLoading(true);

    try {
      const promptFallback = audioUrl
        ? 'Usuário enviou um áudio, mas não consegui identificar o que foi dito.'
        : attachment
          ? `Usuário anexou um arquivo (${attachment.name}). Se ele pedir para lançar uma despesa ou transação, use este anexo como comprovante.`
          : '';
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend.trim() || promptFallback,
          audioUrl,
          attachmentUrl: attachment?.url,
          attachmentType: attachment?.type,
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

  // iOS Safari (and some Android browsers) reject `new MediaRecorder(stream)` with default settings —
  // it only accepts specific containers. Picking a supported mimeType is what makes recording work on
  // smartphones, where the desktop path (default construction) silently failed before.
  const pickSupportedAudioMime = () => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'];
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    return candidates.find(c => MediaRecorder.isTypeSupported(c)) || '';
  };

  const startRecording = async () => {
    // If MediaRecorder / mic access isn't available (older mobile browsers, insecure context, etc.),
    // fall back to the phone's native recorder via a file input so the user can still send a voice note.
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      audioFallbackInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedAudioMime();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const type = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type });
        handleAudioRecorded(blob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      // Last resort on mobile: offer the native recorder/file picker instead of a dead end.
      audioFallbackInputRef.current?.click();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioRecorded = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio })
      });

      if (!res.ok) throw new Error('Falha ao transcrever o áudio.');

      const { url, text } = await res.json();
      await handleSendMessage(text || '', url);
    } catch (err) {
      console.error('Erro ao processar áudio:', err);
      setMessages(prev => [...prev, {
        sender: 'system',
        text: 'Não foi possível processar o áudio enviado.'
      }]);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Uploads a photo/document picked in the chat and stages it as a pending attachment,
  // so the user can add a caption ("lança essa despesa") before sending it to Kairos.
  const handleAttachmentFile = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, filename: file.name })
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setPendingAttachment({ url: data.url, type: file.type || 'arquivo', name: file.name });
      } else {
        setMessages(prev => [...prev, {
          sender: 'system',
          text: `Não consegui anexar o arquivo: ${data.error || 'formato não suportado (envie imagem ou PDF).'}`
        }]);
      }
    } catch (err) {
      console.error('Erro ao anexar arquivo:', err);
      setMessages(prev => [...prev, { sender: 'system', text: 'Falha ao enviar o anexo.' }]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormSubmit = () => {
    if (isLoading || isUploading) return;
    if (pendingAttachment) {
      const att = pendingAttachment;
      setPendingAttachment(null);
      handleSendMessage(inputText, undefined, att);
    } else {
      handleSendMessage(inputText);
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
        <div className="flex items-center gap-1">
          <button 
            onClick={handleClearHistory}
            className={`transition-all duration-300 cursor-pointer p-1.5 rounded-full flex items-center gap-1 ${
              confirmClear
                ? 'text-red-500 bg-red-500/10 scale-105 ring-1 ring-red-500/30'
                : (isDark ? 'text-gray-400 hover:text-red-400 hover:bg-white/5' : 'text-gray-500 hover:text-red-500 hover:bg-black/5')
            }`}
            title={confirmClear ? "Clique novamente para confirmar a limpeza" : "Limpar Histórico"}
          >
            <Trash2 className={`w-4 h-4 ${confirmClear ? 'animate-bounce' : ''}`} />
            {confirmClear && <span className="text-[9px] font-bold uppercase font-sans pr-1">Confirmar?</span>}
          </button>
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
          const audioUrl = !isAssistant && m.text?.startsWith(AUDIO_PREFIX) ? m.text.slice(AUDIO_PREFIX.length) : null;
          const fileUrl = !isAssistant && m.text?.startsWith(FILE_PREFIX) ? m.text.slice(FILE_PREFIX.length) : null;
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
                  {isAssistant ? (
                    renderMessageContent(m.text)
                  ) : audioUrl ? (
                    <audio controls src={audioUrl} className="h-9 max-w-[200px]" />
                  ) : fileUrl ? (
                    isImageUrl(fileUrl) ? (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <img src={fileUrl} alt="Anexo" className="rounded-lg max-w-[200px] max-h-[220px] object-cover" />
                      </a>
                    ) : (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 underline decoration-dotted"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="text-xs">Ver documento anexado</span>
                      </a>
                    )
                  ) : (
                    m.text
                  )}
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

        {/* Hidden inputs: photo/document attachment + native audio-recorder fallback for mobile */}
        <input
          ref={attachmentInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttachmentFile(f); e.target.value = ''; }}
        />
        <input
          ref={audioFallbackInputRef}
          type="file"
          accept="audio/*"
          capture
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioRecorded(f); e.target.value = ''; }}
        />

        {/* Pending attachment preview chip */}
        {(pendingAttachment || isUploading) && (
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs animate-fadeIn ${
            isDark ? 'bg-[#161616] border border-white/10 text-gray-300' : 'bg-gray-100 border border-black/5 text-gray-700'
          }`}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">Enviando anexo...</span>
              </>
            ) : pendingAttachment && (
              <>
                {isImageUrl(pendingAttachment.url) ? (
                  <img src={pendingAttachment.url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate flex-1">{pendingAttachment.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingAttachment(null)}
                  className={`p-1 rounded-full shrink-0 ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500'}`}
                  title="Remover anexo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Custom Form input fields */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }}
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

          {/* Attachment (photo/document) button */}
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            disabled={isRecording || isTranscribing || isUploading}
            className={`p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-black hover:bg-black/5'
            }`}
            title="Anexar foto ou documento"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRecording ? 'Gravando áudio...' : pendingAttachment ? 'Adicione uma legenda (opcional)...' : 'Digite sua pergunta...'}
            disabled={isRecording || isTranscribing}
            className={`flex-1 bg-transparent px-2 py-1.5 text-xs focus:outline-none focus:ring-0 disabled:opacity-50 ${
              isDark ? 'text-white placeholder-gray-600' : 'text-black placeholder-gray-400'
            }`}
          />
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing || isLoading}
            className={`p-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-black hover:bg-black/5'
            }`}
            title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
          >
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          <button
            type="submit"
            disabled={isRecording || isTranscribing}
            className={`p-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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
