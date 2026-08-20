// Universal WebSocket Multiplayer Client (Auto-detects HTTP/HTTPS & WS/WSS)

export class NetworkManager {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.roomCode = null;
    this.playerId = null;
    this.playerIndex = 0;
    this.isHost = false;
    this.players = [];

    this.onRoomCreated = null;
    this.onRoomJoined = null;
    this.onLobbyUpdate = null;
    this.onGameStarted = null;
    this.onPlayerState = null;
    this.onShootEvent = null;
    this.onEmoteEvent = null;
    this.onChatEvent = null;
    this.onNewRound = null;
    this.onError = null;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:8080';
      const wsUrl = `${protocol}//${host}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        resolve();
      };

      this.ws.onerror = (err) => {
        console.warn('Multiplayer WS connection error:', err);
        if (this.onError) this.onError('No se pudo conectar al servidor multijugador');
        reject(err);
      };

      this.ws.onclose = () => {
        this.connected = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleMessage(data);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };
    });
  }

  createRoom(customizerData, maxHp = 1000) {
    this.connect().then(() => {
      this.ws.send(JSON.stringify({
        type: 'CREATE_ROOM',
        name: customizerData.name,
        color: customizerData.color,
        chassis: customizerData.chassis,
        decal: customizerData.decal,
        maxHp
      }));
    });
  }

  joinRoom(code, customizerData) {
    this.connect().then(() => {
      this.ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        code,
        name: customizerData.name,
        color: customizerData.color,
        chassis: customizerData.chassis,
        decal: customizerData.decal
      }));
    });
  }

  startGame() {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify({ type: 'START_GAME' }));
    }
  }

  sendSyncState(tank) {
    if (this.ws && this.connected && this.roomCode) {
      this.ws.send(JSON.stringify({
        type: 'SYNC_STATE',
        x: tank.x,
        y: tank.y,
        rot: tank.rot,
        vx: tank.vx,
        vy: tank.vy,
        hp: tank.hp,
        weapon: tank.weapon,
        ammo: tank.ammo
      }));
    }
  }

  sendShoot(muzzleX, muzzleY, dirX, dirY, weapon) {
    if (this.ws && this.connected && this.roomCode) {
      this.ws.send(JSON.stringify({
        type: 'SHOOT',
        x: muzzleX,
        y: muzzleY,
        dirX,
        dirY,
        weapon
      }));
    }
  }

  sendEmote(emote) {
    if (this.ws && this.connected && this.roomCode) {
      this.ws.send(JSON.stringify({
        type: 'EMOTE',
        emote
      }));
    }
  }

  sendChatMessage(text) {
    if (this.ws && this.connected && this.roomCode) {
      this.ws.send(JSON.stringify({
        type: 'CHAT_MSG',
        text
      }));
    }
  }

  sendRoundOver(scores) {
    if (this.ws && this.connected && this.roomCode && this.isHost) {
      this.ws.send(JSON.stringify({
        type: 'ROUND_OVER',
        scores
      }));
    }
  }

  _handleMessage(data) {
    switch (data.type) {
      case 'ROOM_CREATED':
        this.roomCode = data.code;
        this.playerId = data.playerId;
        this.playerIndex = data.playerIndex;
        this.isHost = true;
        this.players = data.players;
        if (this.onRoomCreated) this.onRoomCreated(data.code, data.players);
        break;

      case 'ROOM_JOINED':
        this.roomCode = data.code;
        this.playerId = data.playerId;
        this.playerIndex = data.playerIndex;
        this.isHost = false;
        this.players = data.players;
        if (this.onRoomJoined) this.onRoomJoined(data.code, data.players);
        break;

      case 'LOBBY_UPDATE':
        this.players = data.players;
        if (this.onLobbyUpdate) this.onLobbyUpdate(data.players);
        break;

      case 'GAME_STARTED':
        if (this.onGameStarted) this.onGameStarted(data.mazeSeed, data.players);
        break;

      case 'PLAYER_STATE':
        if (this.onPlayerState) this.onPlayerState(data);
        break;

      case 'SHOOT_EVENT':
        if (this.onShootEvent) this.onShootEvent(data);
        break;

      case 'EMOTE_EVENT':
        if (this.onEmoteEvent) this.onEmoteEvent(data.playerId, data.emote);
        break;

      case 'CHAT_EVENT':
        if (this.onChatEvent) this.onChatEvent(data);
        break;

      case 'NEW_ROUND':
        if (this.onNewRound) this.onNewRound(data.mazeSeed, data.scores);
        break;

      case 'ERROR':
        if (this.onError) this.onError(data.message);
        break;
    }
  }
}

export const Network = new NetworkManager();
