import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FilterCard } from './components/FilterCard';
import { SearchScreen } from './components/SearchScreen';
import { CallScreen } from './components/CallScreen';
import { MicTestModal } from './components/MicTestModal';
import { ReportModal } from './components/ReportModal';
import { AboutModal } from './components/AboutModal';
import {
  UserFilters,
  ConnectionState,
  PeerInfo,
  ChatMessage,
  StatsInfo,
} from './types';
import { AudioEngine } from './lib/audioFX';
import { WebRTCClient } from './lib/webrtc';
import { PhoneOff, SkipForward, AlertTriangle, Sparkles } from 'lucide-react';

const DEFAULT_FILTERS: UserFilters = {
  myGender: 'male',
  targetGender: 'any',
  ageGroup: '22-25',
};

export default function App() {
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [peerInfo, setPeerInfo] = useState<PeerInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [directRoomCode, setDirectRoomCode] = useState<string | undefined>(undefined);
  const [invitedRoomCode, setInvitedRoomCode] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsInfo>({
    onlineCount: 1,
    searchingCount: 0,
    activeCallsCount: 0,
  });

  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());
  const wsRef = useRef<WebSocket | null>(null);
  const webrtcRef = useRef<WebRTCClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize WebSocket connection & Check URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setInvitedRoomCode(roomParam);
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Nekto Voice WebSocket Server');
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'init':
          case 'stats': {
            setStats({
              onlineCount: msg.payload.onlineCount || 1,
              searchingCount: msg.payload.searchingCount || 0,
              activeCallsCount: msg.payload.activeCallsCount || 0,
            });
            break;
          }

          case 'direct_room_created': {
            setDirectRoomCode(msg.payload.roomCode);
            setConnectionState('waiting_link');
            break;
          }

          case 'match_found': {
            const peer: PeerInfo = msg.payload.peer;
            setPeerInfo(peer);
            setConnectionState('connected');
            setDirectRoomCode(undefined);
            setMessages([
              {
                id: 'sys_1',
                sender: 'system',
                text: peer.isDirectLink
                  ? 'Собеседник перешел по вашей ссылке! Разговор начат.'
                  : 'Собеседник найден! Голосовое соединение установлено.',
                timestamp: Date.now(),
              },
            ]);

            // Ensure mic stream before initializing WebRTC
            let activeStream = localStreamRef.current || audioEngineRef.current.getMicStream();
            if (!activeStream) {
              try {
                activeStream = await audioEngineRef.current.initMicrophone();
                localStreamRef.current = activeStream;
                setHasMicPermission(true);
              } catch (err) {
                console.warn('Could not acquire mic on match_found:', err);
              }
            }

            if (activeStream) {
              webrtcRef.current = new WebRTCClient(
                (signalPayload) => {
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(
                      JSON.stringify({
                        type: 'signal',
                        payload: signalPayload,
                      })
                    );
                  }
                },
                (remoteStream) => {
                  audioEngineRef.current.attachRemoteStream(remoteStream);
                },
                (state) => {
                  console.log('WebRTC state change:', state);
                  if (state === 'failed' || state === 'disconnected') {
                    setErrorNotification('Проблема со связью. Попробуйте поискать другого.');
                  }
                }
              );

              webrtcRef.current.createPeerConnection(
                activeStream,
                msg.payload.initiator
              );
            }
            break;
          }

          case 'signal': {
            if (webrtcRef.current) {
              webrtcRef.current.handleSignal(msg.payload);
            }
            break;
          }

          case 'chat_message': {
            const newMsg: ChatMessage = msg.payload;
            setMessages((prev) => [...prev, newMsg]);
            break;
          }

          case 'reaction': {
            audioEngineRef.current.playReactionSound(msg.payload.reaction);
            break;
          }

          case 'leave_call': {
            setMessages((prev) => [
              ...prev,
              {
                id: `sys_${Date.now()}`,
                sender: 'system',
                text:
                  msg.payload?.reason === 'partner_left'
                    ? 'Собеседник завершил разговор или вышел.'
                    : 'Разговор завершен.',
                timestamp: Date.now(),
              },
            ]);
            setConnectionState('ended');
            if (webrtcRef.current) {
              webrtcRef.current.close();
              webrtcRef.current = null;
            }
            break;
          }
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, []);

  // Ensure mic is requested before search or call
  const ensureMicrophone = async (): Promise<boolean> => {
    const existingStream = audioEngineRef.current.getMicStream();
    if (existingStream) {
      localStreamRef.current = existingStream;
      setHasMicPermission(true);
      return true;
    }
    if (localStreamRef.current && localStreamRef.current.active) {
      return true;
    }
    try {
      const stream = await audioEngineRef.current.initMicrophone();
      localStreamRef.current = stream;
      setHasMicPermission(true);
      return true;
    } catch (err) {
      console.warn('Mic access failed:', err);
      setIsMicModalOpen(true);
      return false;
    }
  };

  const handleAcceptInvite = async () => {
    if (!invitedRoomCode) return;
    const hasMic = await ensureMicrophone();
    if (!hasMic) return;

    setConnectionState('searching');
    setPeerInfo(null);
    setMessages([]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'join_direct_room',
          payload: {
            roomCode: invitedRoomCode,
            filters,
          },
        })
      );
    }
    setInvitedRoomCode(null);
  };

  const handleStartSearch = async () => {
    const hasMic = await ensureMicrophone();
    if (!hasMic) return;

    setConnectionState('searching');
    setPeerInfo(null);
    setMessages([]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'start_search',
          payload: filters,
        })
      );
    }
  };

  const handleCreateDirectRoom = async () => {
    const hasMic = await ensureMicrophone();
    if (!hasMic) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'create_direct_room',
          payload: { filters },
        })
      );
    }
  };

  const handleJoinDirectRoom = async (code: string) => {
    const hasMic = await ensureMicrophone();
    if (!hasMic) return;

    setConnectionState('searching');
    setPeerInfo(null);
    setMessages([]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'join_direct_room',
          payload: {
            roomCode: code,
            filters,
          },
        })
      );
    }
  };

  const handleCancelSearch = () => {
    setConnectionState('idle');
    setDirectRoomCode(undefined);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'cancel_search',
        })
      );
    }
  };

  const handleSendMessage = (text: string) => {
    const myMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'me',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, myMsg]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat_message',
          payload: { text },
        })
      );
    }
  };

  const handleSendReaction = (reaction: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'reaction',
          payload: { reaction },
        })
      );
    }
  };

  const handleSkipPartner = () => {
    if (webrtcRef.current) {
      webrtcRef.current.close();
      webrtcRef.current = null;
    }
    setConnectionState('searching');
    setPeerInfo(null);
    setMessages([]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'skip_partner',
        })
      );
    }
  };

  const handleEndCall = () => {
    if (webrtcRef.current) {
      webrtcRef.current.close();
      webrtcRef.current = null;
    }
    setConnectionState('idle');
    setPeerInfo(null);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'leave_call',
        })
      );
    }
  };

  const handleReport = (reason: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'report',
          payload: { reason },
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        stats={stats}
        hasMicPermission={hasMicPermission}
        onOpenMicTest={() => setIsMicModalOpen(true)}
        onOpenAbout={() => setIsAboutModalOpen(true)}
      />

      {/* Toast Error Alert */}
      {errorNotification && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 py-2.5 px-4 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>{errorNotification}</span>
          <button
            onClick={() => setErrorNotification(null)}
            className="underline ml-2 text-white font-bold"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center max-w-7xl mx-auto w-full">
        {(connectionState === 'idle' || connectionState === 'waiting_link') && (
          <FilterCard
            filters={filters}
            setFilters={setFilters}
            onStartSearch={handleStartSearch}
            onCreateDirectRoom={handleCreateDirectRoom}
            onJoinDirectRoom={handleJoinDirectRoom}
            hasMicPermission={hasMicPermission}
            directRoomCode={directRoomCode}
            isWaitingForLinkPartner={connectionState === 'waiting_link'}
            onCancelLinkRoom={handleCancelSearch}
          />
        )}

        {connectionState === 'searching' && (
          <SearchScreen
            filters={filters}
            onCancelSearch={handleCancelSearch}
          />
        )}

        {connectionState === 'connected' && peerInfo && (
          <CallScreen
            peer={peerInfo}
            audioEngine={audioEngineRef.current}
            messages={messages}
            onSendMessage={handleSendMessage}
            onSendReaction={handleSendReaction}
            onSkipPartner={handleSkipPartner}
            onEndCall={handleEndCall}
            onOpenReport={() => setIsReportModalOpen(true)}
          />
        )}

        {connectionState === 'ended' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-cyan-400">
              <PhoneOff className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Разговор завершен</h3>
              <p className="text-xs text-slate-400">
                Вы можете начать новый случайный поиск или создать новую ссылку
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleStartSearch}
                className="w-full py-4 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
                ИСКАТЬ НОВОГО СОБЕСЕДНИКА
              </button>
              <button
                onClick={() => setConnectionState('idle')}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Вернуться на главную
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="py-4 text-center text-slate-500 text-[11px] border-t border-slate-900 px-4">
        <p>NEKTO VOICE • Анонимный голосовой чат без регистрации • WebRTC Direct Audio</p>
      </footer>

      {/* Modals */}
      {invitedRoomCode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-6 text-center shadow-2xl relative">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Приглашение в звонок</h3>
              <p className="text-xs text-slate-400">
                Вас пригласили в анонимный голосовой диалог.
              </p>
              <div className="inline-block bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg text-cyan-400 font-mono font-bold text-sm mt-1">
                Комната #{invitedRoomCode}
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={handleAcceptInvite}
                className="w-full py-4 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                ПРИНЯТЬ И ПОДКЛЮЧИТЬСЯ
              </button>
              <button
                onClick={() => setInvitedRoomCode(null)}
                className="w-full py-2.5 px-4 rounded-xl text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      <MicTestModal
        audioEngine={audioEngineRef.current}
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
        onPermissionGranted={(stream) => {
          localStreamRef.current = stream;
          setHasMicPermission(true);
        }}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleReport}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
}

