// Full-Stack Production Server for Tank Trouble Web (Static Files + WebSockets)
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, 'index.html'), (err2, indexContent) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
            res.end(indexContent);
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

const wss = new WebSocket.Server({ server });
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

wss.on('connection', (ws) => {
  ws.id = 'p_' + Math.random().toString(36).substr(2, 9);
  ws.roomCode = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'CREATE_ROOM': {
          const code = generateRoomCode();
          const player = {
            id: ws.id,
            index: 0,
            name: data.name || 'HOST',
            color: data.color || '#D9383A',
            chassis: data.chassis || 'classic',
            decal: data.decal || 'stripes',
            isHost: true,
            ready: true,
            score: 0
          };

          const room = {
            code,
            hostId: ws.id,
            players: new Map([[ws, player]]),
            state: 'LOBBY',
            config: { maxHp: data.maxHp || 1000, chaosEvents: true }
          };

          rooms.set(code, room);
          ws.roomCode = code;

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            code,
            playerId: ws.id,
            playerIndex: 0,
            players: [player],
            config: room.config
          }));
          break;
        }

        case 'JOIN_ROOM': {
          const code = (data.code || '').toUpperCase().trim();
          const room = rooms.get(code);

          if (!room) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'La sala no existe' }));
            return;
          }

          if (room.players.size >= 4) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'La sala está llena (máx 4 jugadores)' }));
            return;
          }

          if (room.state !== 'LOBBY') {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'La partida ya ha comenzado' }));
            return;
          }

          const existingIndices = Array.from(room.players.values()).map(p => p.index);
          let assignedIndex = 1;
          for (let i = 1; i < 4; i++) {
            if (!existingIndices.includes(i)) {
              assignedIndex = i;
              break;
            }
          }

          const player = {
            id: ws.id,
            index: assignedIndex,
            name: data.name || `JUGADOR ${assignedIndex + 1}`,
            color: data.color || '#27AE60',
            chassis: data.chassis || 'classic',
            decal: data.decal || 'stripes',
            isHost: false,
            ready: true,
            score: 0
          };

          room.players.set(ws, player);
          ws.roomCode = code;

          const playerList = Array.from(room.players.values());

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            code,
            playerId: ws.id,
            playerIndex: assignedIndex,
            players: playerList,
            config: room.config
          }));

          broadcastToRoom(room, {
            type: 'LOBBY_UPDATE',
            players: playerList
          }, ws);
          break;
        }

        case 'START_GAME': {
          const room = rooms.get(ws.roomCode);
          if (room && room.hostId === ws.id) {
            room.state = 'IN_GAME';
            const seed = Math.floor(Math.random() * 1000000);
            broadcastToRoom(room, {
              type: 'GAME_STARTED',
              mazeSeed: seed,
              players: Array.from(room.players.values())
            });
          }
          break;
        }

        case 'SYNC_STATE': {
          const room = rooms.get(ws.roomCode);
          if (room) {
            broadcastToRoom(room, {
              type: 'PLAYER_STATE',
              id: ws.id,
              x: data.x,
              y: data.y,
              rot: data.rot,
              vx: data.vx,
              vy: data.vy,
              hp: data.hp,
              weapon: data.weapon,
              ammo: data.ammo
            }, ws);
          }
          break;
        }

        case 'SHOOT': {
          const room = rooms.get(ws.roomCode);
          if (room) {
            broadcastToRoom(room, {
              type: 'SHOOT_EVENT',
              shooterId: ws.id,
              weapon: data.weapon,
              x: data.x,
              y: data.y,
              dirX: data.dirX,
              dirY: data.dirY
            }, ws);
          }
          break;
        }

        case 'EMOTE': {
          const room = rooms.get(ws.roomCode);
          if (room) {
            broadcastToRoom(room, {
              type: 'EMOTE_EVENT',
              playerId: ws.id,
              emote: data.emote
            });
          }
          break;
        }

        case 'CHAT_MSG': {
          const room = rooms.get(ws.roomCode);
          if (room) {
            const player = room.players.get(ws) || { name: 'PILOTO', color: '#1C1E21' };
            broadcastToRoom(room, {
              type: 'CHAT_EVENT',
              playerId: ws.id,
              name: player.name,
              color: player.color,
              text: data.text
            });
          }
          break;
        }

        case 'ROUND_OVER': {
          const room = rooms.get(ws.roomCode);
          if (room && room.hostId === ws.id) {
            const nextSeed = Math.floor(Math.random() * 1000000);
            broadcastToRoom(room, {
              type: 'NEW_ROUND',
              mazeSeed: nextSeed,
              scores: data.scores
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });

  ws.on('close', () => {
    if (ws.roomCode && rooms.has(ws.roomCode)) {
      const room = rooms.get(ws.roomCode);
      room.players.delete(ws);

      if (room.players.size === 0) {
        rooms.delete(ws.roomCode);
      } else {
        if (room.hostId === ws.id) {
          const nextHostWs = room.players.keys().next().value;
          const nextHost = room.players.get(nextHostWs);
          room.hostId = nextHost.id;
          nextHost.isHost = true;
        }

        broadcastToRoom(room, {
          type: 'PLAYER_LEFT',
          playerId: ws.id,
          players: Array.from(room.players.values())
        });
      }
    }
  });
});

function broadcastToRoom(room, data, excludeWs = null) {
  const json = JSON.stringify(data);
  for (const client of room.players.keys()) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

server.listen(PORT, () => {
  console.log(`Tank Trouble Server Running on Port ${PORT}`);
});
