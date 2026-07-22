import React, { useEffect, useState } from 'react';
import { X, Sparkles, Radio } from 'lucide-react';
import { UserFilters } from '../types';

interface SearchScreenProps {
  filters: UserFilters;
  onCancelSearch: () => void;
}

const TIPS = [
  'Ищем свободного собеседника...',
  'Голосовое соединение передается напрямую через P2P.',
  'Будьте вежливы — неуважение наказывается блокировкой.',
  'Вы также можете приглашать друзей прямо по личной ссылке!',
  'Используйте быстрые звуковые реакции во время диалога!',
];

export const SearchScreen: React.FC<SearchScreenProps> = ({
  filters,
  onCancelSearch,
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-white text-center space-y-8 relative overflow-hidden">
      {/* Background Pulse Animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-80 h-80 rounded-full border border-cyan-500/20 animate-ping opacity-30" />
        <div className="w-60 h-60 rounded-full border border-indigo-500/20 animate-ping opacity-40 delay-300" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Animated Radar Center */}
        <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border border-cyan-500/40 border-dashed animate-spin" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/30">
            <Radio className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>

        {/* Status Headings */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
            ПОИСК СОБЕСЕДНИКА...
          </div>
          <h3 className="text-2xl font-extrabold text-white">
            Ищем парный голос
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Ищем: <span className="text-slate-200 font-semibold">{filters.targetGender === 'male' ? 'Парень' : filters.targetGender === 'female' ? 'Девушка' : 'Любой пол'}</span> ({filters.ageGroup} лет)
          </p>
        </div>

        {/* Tip Box */}
        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 text-xs text-slate-300 transition-all min-h-[56px] flex items-center justify-center">
          <p className="animate-fade-in">{TIPS[tipIndex]}</p>
        </div>

        {/* Action Controls */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onCancelSearch}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400" />
            Отменить поиск
          </button>
        </div>
      </div>
    </div>
  );
};

