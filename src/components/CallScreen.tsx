import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  SkipForward,
  Flag,
  MessageSquare,
  Sparkles,
  Bot,
  UserCheck,
  Send,
  X,
  Music,
  Laugh,
  Heart,
  Bell,
  Volume1,
  Radio,
} from 'lucide-react';
import { PeerInfo, ChatMessage, VoiceEffect } from '../types';
import { AudioEngine } from '../lib/audioFX';

interface CallScreenProps {
  peer: PeerInfo;
  audioEngine: AudioEngine;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSendReaction: (reaction: string) => void;
  onSkipPartner: () => void;
  onEndCall: () => void;
  onOpenReport: () => void;
}

const PRESET_MESSAGES = [
  'Привет!',
  'Как тебя зовут?',
  'Откуда ты?',
  'Чем увлекаешься?',
  'Слушаешь музыку?',
  'Приятный голос!',
];

export const CallScreen: React.FC<CallScreenProps> = ({
  peer,
  audioEngine,
  messages,
  onSendMessage,
  onSendReaction,
  onSkipPartner,
  onEndCall,
  onOpenReport,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showChat, setShowChat] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [localVol, setLocalVol] = useState(0);
  const [remoteVol, setRemoteVol] = useState(0);
  const [selectedEffect, setSelectedEffect] = useState<VoiceEffect>('none');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Call timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Visualizer volume polling
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalVol(audioEngine.getLocalVolume());
      setRemoteVol(audioEngine.getRemoteVolume());
    }, 100);
    return () => clearInterval(interval);
  }, [audioEngine]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioEngine.setMicMuted(next);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Voice Canvas (8 cols) */}
      <div className="lg:col-span-7 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6 relative overflow-hidden">
        {/* Top Call Info Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base">
                  {peer.name ? peer.name : peer.isDirectLink ? 'Диалог по ссылке' : 'Анонимный Собеседник'}
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-slate-400">
                {peer.gender === 'female' ? 'Девушка ♀' : peer.gender === 'male' ? 'Парень ♂' : 'Собеседник'} • {peer.ageGroup} лет
              </p>
            </div>
          </div>

          {/* Call Timer & Status */}
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-cyan-400">
              {formatTimer(seconds)}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
              P2P Audio
            </div>
          </div>
        </div>

        {/* Audio Visualizers Display */}
        <div className="grid grid-cols-2 gap-4 my-4">
          {/* My Voice Box */}
          <div
            className={`bg-slate-800/80 p-5 rounded-2xl border transition-all flex flex-col items-center justify-center space-y-3 relative overflow-hidden ${
              isMuted
                ? 'border-red-500/30 bg-red-950/10'
                : localVol > 10
                ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'border-slate-700/80'
            }`}
          >
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              {isMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
              Ваш голос
            </div>

            {/* Simulated Frequency Wave */}
            <div className="flex items-end justify-center gap-1.5 h-16 w-full px-4">
              {[40, 75, 50, 90, 60, 85, 45, 70].map((baseHeight, idx) => {
                const activeHeight = isMuted ? 8 : Math.max(8, Math.min(100, (localVol * baseHeight) / 50));
                return (
                  <div
                    key={idx}
                    className="w-2 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-full transition-all duration-75"
                    style={{ height: `${activeHeight}%` }}
                  />
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400">
              {isMuted ? 'Микрофон выключен' : localVol > 5 ? 'Вы говорите...' : 'Слушаем вас...'}
            </p>
          </div>

          {/* Remote Partner Voice Box */}
          <div
            className={`bg-slate-800/80 p-5 rounded-2xl border transition-all flex flex-col items-center justify-center space-y-3 relative overflow-hidden ${
              remoteVol > 10
                ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                : 'border-slate-700/80'
            }`}
          >
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              Собеседник
            </div>

            {/* Remote Frequency Wave */}
            <div className="flex items-end justify-center gap-1.5 h-16 w-full px-4">
              {[50, 85, 65, 95, 70, 80, 55, 90].map((baseHeight, idx) => {
                const activeHeight = Math.max(8, Math.min(100, (remoteVol * baseHeight) / 50));
                return (
                  <div
                    key={idx}
                    className="w-2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full transition-all duration-75"
                    style={{ height: `${activeHeight}%` }}
                  />
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400">
              {remoteVol > 5 ? 'Собеседник говорит...' : 'Тишина'}
            </p>
          </div>
        </div>

        {/* Reaction Soundboard */}
        <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Быстрые звуковые реакции:
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'applause', label: '👏 Аплодисменты' },
              { id: 'laugh', label: '😂 Смех' },
              { id: 'heart', label: '❤️ Сердце' },
              { id: 'bell', label: '🔔 Звонок' },
              { id: 'wow', label: '😮 Ух ты' },
            ].map((reaction) => (
              <button
                key={reaction.id}
                type="button"
                onClick={() => {
                  audioEngine.playReactionSound(reaction.id);
                  onSendReaction(reaction.id);
                }}
                className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              >
                {reaction.label}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Call Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            {/* Mic Toggle */}
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 ${
                isMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {isMuted ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5 text-cyan-400" />}
              <span className="hidden sm:inline">{isMuted ? 'Выкл' : 'Микрофон'}</span>
            </button>

            {/* Chat Drawer Toggle */}
            <button
              onClick={() => setShowChat((prev) => !prev)}
              className={`p-3.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 border ${
                showChat
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              <span className="hidden sm:inline">Чат ({messages.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Report */}
            <button
              onClick={onOpenReport}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
              title="Пожаловаться на собеседника"
            >
              <Flag className="w-5 h-5" />
            </button>

            {/* Skip Partner (Primary Nekto feature) */}
            <button
              onClick={onSkipPartner}
              className="px-4 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-xs tracking-wide shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <SkipForward className="w-5 h-5" />
              СЛЕДУЮЩИЙ
            </button>

            {/* End Call */}
            <button
              onClick={onEndCall}
              className="p-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              title="Завершить звонок"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Chat Panel (5 cols) */}
      {showChat && (
        <div className="lg:col-span-5 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-2xl text-white flex flex-col h-[520px]">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              Текстовое сопровождение
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center space-y-2 p-4">
                <MessageSquare className="w-8 h-8 text-slate-700" />
                <p>Вы подсоединены голосом. Также можете писать быстрые сообщения здесь.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === 'me'
                      ? 'items-end'
                      : m.sender === 'system'
                      ? 'items-center'
                      : 'items-start'
                  }`}
                >
                  {m.sender === 'system' ? (
                    <div className="px-3 py-1 rounded-full bg-slate-800/80 text-[11px] text-slate-400 border border-slate-700/60 my-1">
                      {m.text}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-1 ${
                        m.sender === 'me'
                          ? 'bg-cyan-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                      }`}
                    >
                      <p className="leading-relaxed">{m.text}</p>
                      <p className="text-[9px] opacity-60 text-right">
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Preset Phrases */}
          <div className="py-2 flex flex-wrap gap-1.5 border-t border-slate-800 mt-2">
            {PRESET_MESSAGES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => onSendMessage(phrase)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] border border-slate-700/80 transition-colors"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendText} className="flex gap-2 pt-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Напишите сообщение..."
              className="flex-1 bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="p-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
