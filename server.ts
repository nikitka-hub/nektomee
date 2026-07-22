import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// User session types
interface ConnectedUser {
  id: string;
  ws: WebSocket;
  status: 'idle' | 'searching' | 'waiting_link' | 'in_call';
  filters?: {
    myGender: 'male' | 'female' | 'any';
    targetGender: 'male' | 'female' | 'any';
    ageGroup: string;
  };
  currentRoomId?: string;
  partnerId?: string;
  directRoomCode?: string;
}

interface Room {
  id: string;
  user1Id: string;
  user2Id: string;
  isDirectLink?: boolean;
  createdAt: number;
}

interface DirectRoomWaiting {
  roomCode: string;
  creatorId: string;
  creatorGender: 'male' | 'female' | 'any';
  creatorAgeGroup: string;
  createdAt: number;
}

const users = new Map<string, ConnectedUser>();
const rooms = new Map<string, Room>();
const directRooms = new Map<string, DirectRoomWaiting>();

function broadcastStats() {
  const searchingCount = Array.from(users.values()).filter((u) => u.status === 'searching' || u.status === 'waiting_link').length;
  const activeCallsCount = rooms.size;
  const onlineCount = users.size;

  const statsMessage = JSON.stringify({
    type: 'stats',
    payload: {
      onlineCount,
      searchingCount,
      activeCallsCount,
    },
  });

  users.forEach((u) => {
    if (u.ws.readyState === WebSocket.OPEN) {
      u.ws.send(statsMessage);
    }
  });
}

function matchUsers() {
  const searching = Array.from(users.values()).filter((u) => u.status === 'searching');

  for (let i = 0; i < searching.length; i++) {
    const userA = searching[i];
    if (userA.status !== 'searching') continue;

    for (let j = i + 1; j < searching.length; j++) {
      const userB = searching[j];
      if (userB.status !== 'searching') continue;

      // Match criteria
      const genderMatchA =
        userA.filters?.targetGender === 'any' ||
        userA.filters?.targetGender === userB.filters?.myGender;
      const genderMatchB =
        userB.filters?.targetGender === 'any' ||
        userB.filters?.targetGender === userA.filters?.myGender;

      if (genderMatchA && genderMatchB) {
        // Create Room
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        userA.status = 'in_call';
        userB.status = 'in_call';
        userA.currentRoomId = roomId;
        userB.currentRoomId = roomId;
        userA.partnerId = userB.id;
        userB.partnerId = userA.id;

        rooms.set(roomId, {
          id: roomId,
          user1Id: userA.id,
          user2Id: userB.id,
          createdAt: Date.now(),
        });

        // Notify User A
        userA.ws.send(
          JSON.stringify({
            type: 'match_found',
            payload: {
              roomId,
              initiator: true,
              peer: {
                id: userB.id,
                gender: userB.filters?.myGender || 'any',
                ageGroup: userB.filters?.ageGroup || '22-25',
                matchedAt: Date.now(),
              },
            },
          })
        );

        // Notify User B
        userB.ws.send(
          JSON.stringify({
            type: 'match_found',
            payload: {
              roomId,
              initiator: false,
              peer: {
                id: userA.id,
                gender: userA.filters?.myGender || 'any',
                ageGroup: userA.filters?.ageGroup || '22-25',
                matchedAt: Date.now(),
              },
            },
          })
        );

        broadcastStats();
        break;
      }
    }
  }
}

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const user: ConnectedUser = {
    id: userId,
    ws,
    status: 'idle',
  };

  users.set(userId, user);

  // Send init packet
  ws.send(
    JSON.stringify({
      type: 'init',
      payload: {
        userId,
        onlineCount: users.size,
        searchingCount: Array.from(users.values()).filter((u) => u.status === 'searching' || u.status === 'waiting_link').length,
        activeCallsCount: rooms.size,
      },
    })
  );

  broadcastStats();

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'start_search': {
          user.status = 'searching';
          user.filters = msg.payload;
          broadcastStats();
          matchUsers();
          break;
        }

        case 'create_direct_room': {
          user.status = 'waiting_link';
          user.filters = msg.payload?.filters || { myGender: 'male', targetGender: 'any', ageGroup: '22-25' };
          
          const code = msg.payload?.code || Math.random().toString(36).substring(2, 8);
          user.directRoomCode = code;

          directRooms.set(code, {
            roomCode: code,
            creatorId: user.id,
            creatorGender: user.filters.myGender,
            creatorAgeGroup: user.filters.ageGroup,
            createdAt: Date.now(),
          });

          ws.send(
            JSON.stringify({
              type: 'direct_room_created',
              payload: { roomCode: code },
            })
          );
          broadcastStats();
          break;
        }

        case 'join_direct_room': {
          const code = msg.payload?.roomCode;
          const userFilters = msg.payload?.filters || { myGender: 'male', targetGender: 'any', ageGroup: '22-25' };
          user.filters = userFilters;

          const waitingRoom = directRooms.get(code);

          if (!waitingRoom) {
            ws.send(
              JSON.stringify({
                type: 'chat_message',
                payload: {
                  id: `sys_${Date.now()}`,
                  sender: 'system',
                  text: 'Комната по ссылке не найдена или собеседник отключился.',
                  timestamp: Date.now(),
                },
              })
            );
            break;
          }

          const creator = users.get(waitingRoom.creatorId);

          if (!creator || creator.ws.readyState !== WebSocket.OPEN) {
            directRooms.delete(code);
            ws.send(
              JSON.stringify({
                type: 'chat_message',
                payload: {
                  id: `sys_${Date.now()}`,
                  sender: 'system',
                  text: 'Создатель комнаты вышел.',
                  timestamp: Date.now(),
                },
              })
            );
            break;
          }

          // Pair creator and joiner!
          directRooms.delete(code);
          const roomId = `direct_room_${Date.now()}_${code}`;

          user.status = 'in_call';
          creator.status = 'in_call';

          user.currentRoomId = roomId;
          creator.currentRoomId = roomId;

          user.partnerId = creator.id;
          creator.partnerId = user.id;

          rooms.set(roomId, {
            id: roomId,
            user1Id: creator.id,
            user2Id: user.id,
            isDirectLink: true,
            createdAt: Date.now(),
          });

          // Notify Creator
          creator.ws.send(
            JSON.stringify({
              type: 'match_found',
              payload: {
                roomId,
                initiator: true,
                peer: {
                  id: user.id,
                  gender: user.filters?.myGender || 'any',
                  ageGroup: user.filters?.ageGroup || '22-25',
                  matchedAt: Date.now(),
                  isDirectLink: true,
                },
              },
            })
          );

          // Notify Joiner
          user.ws.send(
            JSON.stringify({
              type: 'match_found',
              payload: {
                roomId,
                initiator: false,
                peer: {
                  id: creator.id,
                  gender: creator.filters?.myGender || 'any',
                  ageGroup: creator.filters?.ageGroup || '22-25',
                  matchedAt: Date.now(),
                  isDirectLink: true,
                },
              },
            })
          );

          broadcastStats();
          break;
        }

        case 'cancel_search': {
          if (user.directRoomCode) {
            directRooms.delete(user.directRoomCode);
            user.directRoomCode = undefined;
          }
          user.status = 'idle';
          broadcastStats();
          break;
        }

        case 'signal': {
          // WebRTC offer / answer / ice-candidate relay
          if (user.currentRoomId && user.partnerId) {
            const partner = users.get(user.partnerId);
            if (partner && partner.ws.readyState === WebSocket.OPEN) {
              partner.ws.send(
                JSON.stringify({
                  type: 'signal',
                  payload: msg.payload,
                })
              );
            }
          }
          break;
        }

        case 'chat_message': {
          if (user.currentRoomId && user.partnerId) {
            const partner = users.get(user.partnerId);
            if (partner && partner.ws.readyState === WebSocket.OPEN) {
              partner.ws.send(
                JSON.stringify({
                  type: 'chat_message',
                  payload: {
                    id: `msg_${Date.now()}`,
                    sender: 'peer',
                    text: msg.payload.text,
                    timestamp: Date.now(),
                  },
                })
              );
            }
          }
          break;
        }

        case 'reaction':
        case 'audio_status': {
          if (user.currentRoomId && user.partnerId) {
            const partner = users.get(user.partnerId);
            if (partner && partner.ws.readyState === WebSocket.OPEN) {
              partner.ws.send(
                JSON.stringify({
                  type: msg.type,
                  payload: msg.payload,
                })
              );
            }
          }
          break;
        }

        case 'skip_partner':
        case 'leave_call': {
          if (user.currentRoomId) {
            const roomId = user.currentRoomId;
            const partnerId = user.partnerId;

            // Clean room
            rooms.delete(roomId);
            user.currentRoomId = undefined;
            user.partnerId = undefined;
            user.status = 'idle';

            if (partnerId) {
              const partner = users.get(partnerId);
              if (partner) {
                partner.currentRoomId = undefined;
                partner.partnerId = undefined;
                partner.status = 'idle';
                if (partner.ws.readyState === WebSocket.OPEN) {
                  partner.ws.send(
                    JSON.stringify({
                      type: 'leave_call',
                      payload: { reason: 'partner_left' },
                    })
                  );
                }
              }
            }

            // Send confirmation
            ws.send(
              JSON.stringify({
                type: 'leave_call',
                payload: { reason: 'self_left' },
              })
            );

            broadcastStats();

            // Auto re-search if user requested skip
            if (msg.type === 'skip_partner' && user.filters) {
              user.status = 'searching';
              ws.send(
                JSON.stringify({
                  type: 'start_search_ack',
                })
              );
              broadcastStats();
              matchUsers();
            }
          }
          break;
        }

        case 'report': {
          ws.send(
            JSON.stringify({
              type: 'chat_message',
              payload: {
                id: `sys_${Date.now()}`,
                sender: 'system',
                text: 'Спасибо за сигнал! Жалоба отправлена модераторам.',
                timestamp: Date.now(),
              },
            })
          );
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });

  ws.on('close', () => {
    if (user.directRoomCode) {
      directRooms.delete(user.directRoomCode);
    }
    if (user.currentRoomId) {
      const partnerId = user.partnerId;
      rooms.delete(user.currentRoomId);
      if (partnerId) {
        const partner = users.get(partnerId);
        if (partner) {
          partner.currentRoomId = undefined;
          partner.partnerId = undefined;
          partner.status = 'idle';
          if (partner.ws.readyState === WebSocket.OPEN) {
            partner.ws.send(
              JSON.stringify({
                type: 'leave_call',
                payload: { reason: 'partner_disconnected' },
              })
            );
          }
        }
      }
    }
    users.delete(userId);
    broadcastStats();
  });
});

// Periodic match check loop
setInterval(() => {
  matchUsers();
}, 2000);

// API Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    onlineCount: users.size,
    searchingCount: Array.from(users.values()).filter((u) => u.status === 'searching' || u.status === 'waiting_link').length,
    activeCallsCount: rooms.size,
  });
});

async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Nekto Voice Chat server running on http://0.0.0.0:${PORT}`);
  });
}

initServer();

