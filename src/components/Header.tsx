import React, { useState } from 'react';
import { Mic, MicOff, Users, PhoneCall, Search, Info, Shield, Sparkles } from 'lucide-react';
import { StatsInfo } from '../types';

interface HeaderProps {
  stats: StatsInfo;
  hasMicPermission: boolean;
  onOpenMicTest: () => void;
  onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  hasMicPermission,
  onOpenMicTest,
  onOpenAbout,
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3 text-white transition-all">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                NEKTO <span className="text-cyan-400 font-extrabold">VOICE</span>
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Анонимный голосовой чат без регистрации
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-4 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300" title="Всего пользователей в сети">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-emerald-400">{stats.onlineCount}</span>
            <span className="text-slate-400 hidden md:inline">в сети</span>
          </div>

          <div className="h-3 w-px bg-slate-700" />

          <div className="flex items-center gap-1.5 text-slate-300" title="Ищут собеседника">
            <Search className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span className="font-semibold text-amber-400">{stats.searchingCount}</span>
            <span className="text-slate-400 hidden md:inline">в поиске</span>
          </div>

          <div className="h-3 w-px bg-slate-700" />

          <div className="flex items-center gap-1.5 text-slate-300" title="Активных звонков">
            <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-cyan-400">{stats.activeCallsCount}</span>
            <span className="text-slate-400 hidden md:inline">в звонках</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Mic Perm Button */}
          <button
            onClick={onOpenMicTest}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              hasMicPermission
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            {hasMicPermission ? (
              <Mic className="w-3.5 h-3.5" />
            ) : (
              <MicOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {hasMicPermission ? 'Микрофон OK' : 'Тест микрофона'}
            </span>
          </button>

          {/* About / Rules */}
          <button
            onClick={onOpenAbout}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
            title="Правила и анонимность"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
