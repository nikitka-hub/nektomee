import React from 'react';
import { Shield, Lock, Bot, Sparkles, Heart, X, Check } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-white space-y-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-extrabold">О сервисе Nekto Voice</h3>
          <p className="text-xs text-slate-400">
            Безопасный голосовой анонимный чат для знакомств и интересных разговоров
          </p>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-cyan-400">
              <Lock className="w-4 h-4" />
              100% Анонимно
            </div>
            <p className="leading-relaxed text-slate-400">
              Никакой регистрации, номеров телефонов или ававатарок. Потоковый голос передается по зашифрованному WebRTC каналу.
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-400">
              <Sparkles className="w-4 h-4" />
              Общение по ссылке
            </div>
            <p className="leading-relaxed text-slate-400">
              Создавайте уникальные ссылки и приглашайте друзей или знакомых в анонимный тет-а-тет голосовой диалог.
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Check className="w-4 h-4" />
              Правила поведения
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Уважайте собеседника, избегайте оскорблений</li>
              <li>Запрещен спам и реклама</li>
              <li>При нарушениях используйте кнопку "Пожаловаться"</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer"
        >
          ПОНЯТНО, ПЕРЕЙТИ К ОБЩЕНИЮ
        </button>
      </div>
    </div>
  );
};
