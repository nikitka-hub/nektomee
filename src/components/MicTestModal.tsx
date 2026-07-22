import React, { useState, useEffect } from 'react';
import { Mic, MicOff, CheckCircle2, AlertCircle, Volume2, X } from 'lucide-react';
import { AudioEngine } from '../lib/audioFX';

interface MicTestModalProps {
  audioEngine: AudioEngine;
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted: (stream: MediaStream) => void;
}

export const MicTestModal: React.FC<MicTestModalProps> = ({
  audioEngine,
  isOpen,
  onClose,
  onPermissionGranted,
}) => {
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const existingStream = audioEngine.getMicStream();
    if (existingStream) {
      setStatus('success');
      onPermissionGranted(existingStream);
    } else {
      setStatus('idle');
    }
  }, [isOpen, audioEngine]);

  useEffect(() => {
    let interval: any;
    if (isOpen) {
      interval = setInterval(() => {
        setLevel(audioEngine.getLocalVolume());
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isOpen, audioEngine]);

  if (!isOpen) return null;

  const handleStartTest = async () => {
    try {
      setStatus('testing');
      setErrorMsg('');
      const stream = await audioEngine.initMicrophone();
      setStatus('success');
      onPermissionGranted(stream);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setStatus('error');
      setErrorMsg(
        err.message || 'Не удалось получить доступ к микрофону. Проверьте разрешения браузера.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Проверка микрофона</h3>
          <p className="text-xs text-slate-400">
            Убедитесь, что ваш голос слышен перед началом анонимного звонка
          </p>
        </div>

        {/* Live Volume Meter */}
        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-cyan-400" /> Уровень входного звука:
            </span>
            <span className="text-cyan-400 font-mono">{level}%</span>
          </div>

          <div className="w-full bg-slate-900 h-4 rounded-full p-0.5 border border-slate-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-75"
              style={{ width: `${Math.min(100, level)}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            {level > 10 ? '🗣️ Отлично! Голос обнаружен' : 'Попробуйте произнести что-нибудь'}
          </p>
        </div>

        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl space-y-3 text-xs text-red-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-300 text-sm">
                  {errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('notallowed')
                    ? 'Доступ к микрофону заблокирован'
                    : 'Ошибка доступа к микрофону'}
                </p>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  {errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('notallowed')
                    ? 'Ваш браузер или устройство запретили доступ к микрофону.'
                    : errorMsg}
                </p>
              </div>
            </div>

            {(errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('notallowed')) && (
              <div className="bg-slate-900/90 p-3 rounded-xl border border-red-500/20 text-slate-300 space-y-2 text-[11px]">
                <p className="font-semibold text-cyan-300">Как разрешить доступ:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Нажмите на иконку 🔒 (замок) или 🎙️ слева от адресной строки.</li>
                  <li>Найдите параметр <strong>«Микрофон»</strong> и переключите в положение <strong>«Разрешить»</strong>.</li>
                  <li>Если открыли ссылку из мессенджера (Telegram/VK), нажмите <strong>«Открыть в браузере»</strong> (Chrome / Safari).</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p>Доступ к микрофону успешно разрешен!</p>
          </div>
        )}

        <div className="space-y-2">
          {status !== 'success' ? (
            <>
              <button
                onClick={handleStartTest}
                className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer"
              >
                {status === 'error' ? 'ПОПРОБОВАТЬ СНОВА' : 'ВКЛЮЧИТЬ МИКРОФОН'}
              </button>

              {status === 'error' && (
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
                >
                  Открыть сайт в отдельной вкладке ↗
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wide transition-colors cursor-pointer"
            >
              ГОТОВО К ОБЩЕНИЮ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
