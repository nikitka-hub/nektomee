import React, { useState } from 'react';
import { UserFilters, Gender, AgeGroup } from '../types';
import { Mic, User, Users, Sparkles, Sliders, Link as LinkIcon, Copy, Check, Share2 } from 'lucide-react';

interface FilterCardProps {
  filters: UserFilters;
  setFilters: React.Dispatch<React.SetStateAction<UserFilters>>;
  onStartSearch: () => void;
  onCreateDirectRoom: () => void;
  onJoinDirectRoom: (code: string) => void;
  hasMicPermission: boolean;
  directRoomCode?: string;
  isWaitingForLinkPartner?: boolean;
  onCancelLinkRoom?: () => void;
}

export const FilterCard: React.FC<FilterCardProps> = ({
  filters,
  setFilters,
  onStartSearch,
  onCreateDirectRoom,
  onJoinDirectRoom,
  hasMicPermission,
  directRoomCode,
  isWaitingForLinkPartner,
  onCancelLinkRoom,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  const roomLink = directRoomCode
    ? `${window.location.origin}?room=${directRoomCode}`
    : '';

  const handleCopyLink = () => {
    if (roomLink) {
      navigator.clipboard.writeText(roomLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white relative overflow-hidden">
      {/* Background Subtle Accent Glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Быстрый и анонимный голос
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Выберите параметры
          </h2>
          <p className="text-sm text-slate-400">
            Общайтесь один на один реальным голосом: случайно или по личной ссылке
          </p>
        </div>

        {/* Gender Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* My Gender */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Я (Ваш пол)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'male', label: 'Парень ♂' },
                { value: 'female', label: 'Девушка ♀' },
                { value: 'any', label: 'Неважно 🚻' },
              ].map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, myGender: g.value as Gender }))}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                    filters.myGender === g.value
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900/60 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Gender */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Ищу (Собеседника)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'male', label: 'Парня ♂' },
                { value: 'female', label: 'Девушку ♀' },
                { value: 'any', label: 'Всех 🚻' },
              ].map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, targetGender: g.value as Gender }))}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                    filters.targetGender === g.value
                      ? 'bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-900/60 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Age Group */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            Возраст
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['18-21', '22-25', '26-30', '30+'] as AgeGroup[]).map((age) => (
              <button
                key={age}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, ageGroup: age }))}
                className={`py-2 px-2 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                  filters.ageGroup === age
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                }`}
              >
                {age} лет
              </button>
            ))}
          </div>
        </div>

        {/* Main Action: Random Search */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onStartSearch}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-extrabold text-base tracking-wide shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Mic className="w-5 h-5 text-cyan-200 group-hover:scale-110 transition-transform" />
            НАЧАТЬ СЛУЧАЙНЫЙ ПОИСК
          </button>
        </div>

        {/* Section: Chat with Real People via Link */}
        <div className="bg-slate-800/80 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-sm">
            <Share2 className="w-4 h-4 text-indigo-400" />
            Общение с конкретным человеком по ссылке
          </div>

          {isWaitingForLinkPartner ? (
            <div className="space-y-3 bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/30 text-center">
              <div className="flex justify-center">
                <div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Ожидаем перехода по ссылке...</p>
                <p className="text-xs text-slate-400 mt-0.5">Отправьте эту ссылку другу или в соцсети:</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700 text-xs">
                <input
                  type="text"
                  readOnly
                  value={roomLink}
                  className="bg-transparent text-slate-200 w-full outline-none px-1 text-xs truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-md flex items-center gap-1 shrink-0 cursor-pointer text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
              </div>

              <button
                type="button"
                onClick={onCancelLinkRoom}
                className="text-xs text-slate-400 hover:text-rose-400 underline cursor-pointer pt-1"
              >
                Отменить ожидание
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Создайте персональную комнатную ссылку или введите код приглашения от собеседника:
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={onCreateDirectRoom}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <LinkIcon className="w-4 h-4" />
                  Создать ссылку на диалог
                </button>

                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Вставьте код или ссылку..."
                    className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    disabled={!inputCode.trim()}
                    onClick={() => {
                      // Extract room code if full URL was pasted
                      let code = inputCode.trim();
                      if (code.includes('room=')) {
                        const match = code.match(/room=([^&]+)/);
                        if (match) code = match[1];
                      }
                      if (code) onJoinDirectRoom(code);
                    }}
                    className="py-2 px-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Войти
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

