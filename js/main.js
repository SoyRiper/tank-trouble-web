// Main Game Coordinator with Pro Dynamic Floating Joystick, Multi-Touch & Auto-Rapid Fire
import { Sound } from './audio.js';
import { Maze } from './maze.js';
import { Tank } from './tank.js';
import { AIBot } from './ai.js';
import { ParticleSystem } from './particles.js';
import { Crate, Bullet, Missile, LaserBeam, FragBomb, Landmine, PlasmaOrb } from './weapons.js';
import { UIManager } from './ui.js';
import { Customizer } from './customizer.js';
import { ChaosEvents } from './events.js';
import { Network } from './network.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ui = new UIManager();
    this.particles = new ParticleSystem();

    this.isOnline = false;
    this.onlinePlayers = [];
    this.localPlayerIndex = 0;

    this.mode = '1p_ai';
    this.activePlayerIds = [0, 3];
    this.scores = { 0: 0, 1: 0, 2: 0, 3: 0 };
    this.targetScore = 5;

    this.maze = new Maze(10, 7, 1120, 660);
    this.tanks = [];
    this.aiBots = [];
    this.projectiles = [];
    this.crates = [];

    this.keys = {};
    this.joystick = { active: false, targetAngle: 0, power: 0, shoot: false };

    this.lastTime = performance.now();
    this.timeScale = 1.0;
    this.screenShake = 0;
    this.state = 'MENU';

    this.crateTimer = 0;
    this.crateInterval = 3.5;
    this.networkSyncTimer = 0;

    this._setupCanvas();
    this._setupInputs();
    this._setupProMobileControls();
    this._setupUI();
    this._setupNetwork();

    this.ui.showScreen('MENU');

    requestAnimationFrame(this._loop.bind(this));
  }

  _setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = 1120 * dpr;
    this.canvas.height = 660 * dpr;
    this.canvas.style.width = '1120px';
    this.canvas.style.height = '660px';
    this.ctx.scale(dpr, dpr);
  }

  _setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyM' || e.code === 'Space' || e.code === 'KeyU' || e.code === 'KeyJ') {
        Sound.init();
      }

      // Emote shortcuts (1-6)
      const emotes = { Digit1: '🎯', Digit2: '🔥', Digit3: '💀', Digit4: '🛡️', Digit5: '😂', Digit6: 'GG' };
      if (emotes[e.code]) {
        this._triggerLocalEmote(emotes[e.code]);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    document.querySelectorAll('.emote-btn').forEach((btn) => {
      btn.onclick = () => {
        const emote = btn.dataset.emote;
        this._triggerLocalEmote(emote);
      };
    });
  }

  _setupProMobileControls() {
    const joystickZone = document.getElementById('touch-joystick-zone');
    const joystickBase = document.getElementById('touch-joystick-base');
    const joystickKnob = document.getElementById('touch-joystick-knob');
    const fireZone = document.getElementById('touch-actions-zone');
    const fireBtn = document.getElementById('touch-btn-fire');

    if (!joystickZone || !joystickBase || !joystickKnob) return;

    let joystickTouchId = null;
    let originX = 0;
    let originY = 0;
    const maxRadius = 46;

    // A) Dynamic Floating Joystick (Spawns wherever thumb touches in left zone)
    const onJoystickTouchStart = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (joystickTouchId === null) {
          e.preventDefault();
          Sound.init();
          joystickTouchId = touch.identifier;

          const rect = joystickZone.getBoundingClientRect();
          originX = touch.clientX;
          originY = touch.clientY;

          // Position the base exactly under thumb
          joystickBase.style.display = 'flex';
          joystickBase.style.left = `${touch.clientX - rect.left - 50}px`;
          joystickBase.style.top = `${touch.clientY - rect.top - 50}px`;
          joystickBase.style.transform = 'scale(1.05)';
          joystickKnob.style.transform = 'translate(0px, 0px)';

          this.joystick.active = false;
          this.joystick.power = 0;
          break;
        }
      }
    };

    const onJoystickTouchMove = (e) => {
      if (joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
          e.preventDefault();

          let dx = touch.clientX - originX;
          let dy = touch.clientY - originY;
          const dist = Math.hypot(dx, dy);

          if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
          }

          joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

          if (dist > 6) {
            this.joystick.active = true;
            this.joystick.targetAngle = Math.atan2(dy, dx);
            this.joystick.power = Math.min(1.0, dist / maxRadius);
          } else {
            this.joystick.active = false;
            this.joystick.power = 0;
          }
          break;
        }
      }
    };

    const onJoystickTouchEnd = (e) => {
      if (joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
          if (e.cancelable) e.preventDefault();
          joystickTouchId = null;
          joystickKnob.style.transform = 'translate(0px, 0px)';
          joystickBase.style.transform = 'scale(1.0)';
          this.joystick.active = false;
          this.joystick.power = 0;
          break;
        }
      }
    };

    joystickZone.addEventListener('touchstart', onJoystickTouchStart, { passive: false });
    window.addEventListener('touchmove', onJoystickTouchMove, { passive: false });
    window.addEventListener('touchend', onJoystickTouchEnd);
    window.addEventListener('touchcancel', onJoystickTouchEnd);

    // B) Right Touch Fire Zone (100% Reliable Multi-Touch)
    let fireTouchId = null;

    const startFire = (e) => {
      if (e.cancelable) e.preventDefault();
      Sound.init();
      if (e.changedTouches) {
        fireTouchId = e.changedTouches[0].identifier;
      }
      this.joystick.shoot = true;
      if (fireBtn) fireBtn.classList.add('pressed');
    };

    const endFire = (e) => {
      if (e.cancelable) e.preventDefault();
      if (e.changedTouches && fireTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === fireTouchId) {
            fireTouchId = null;
            this.joystick.shoot = false;
            if (fireBtn) fireBtn.classList.remove('pressed');
            break;
          }
        }
      } else {
        this.joystick.shoot = false;
        if (fireBtn) fireBtn.classList.remove('pressed');
      }
    };

    if (fireZone) {
      fireZone.addEventListener('touchstart', startFire, { passive: false });
      window.addEventListener('touchend', endFire);
      window.addEventListener('touchcancel', endFire);

      fireZone.addEventListener('mousedown', startFire);
      window.addEventListener('mouseup', endFire);
    }
  }

  _triggerLocalEmote(emoji) {
    const localTank = this.tanks.find(t => t.id === this.localPlayerIndex);
    if (localTank) {
      localTank.showEmote(emoji);
      if (this.isOnline) {
        Network.sendEmote(emoji);
      }
    }
  }

  _setupUI() {
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.onclick = () => {
        const mode = btn.dataset.mode;
        this.isOnline = false;
        this._setMode(mode);
        this.ui.modeModal.classList.remove('open');
        this.ui.showScreen('BATTLE');
      };
    });

    document.getElementById('btn-biome-toggle').onclick = () => {
      const nextBiome = this.maze.cycleBiome();
      this.ui.updateBiomeButton(nextBiome);
      this.ui.showBanner(`MAPA: ${nextBiome.name.toUpperCase()}`, '', 1.2);
    };

    document.getElementById('btn-return-menu').onclick = () => {
      this.state = 'MENU';
      this.isOnline = false;
      this.ui.showScreen('MENU');
    };

    this.ui.onGarageSaved = () => {
      const p1 = this.tanks.find(t => t.id === 0);
      if (p1) {
        p1.setCustomization(Customizer.name, Customizer.color, Customizer.chassis, Customizer.decal);
        this.ui.updatePlayerCards(this.activePlayerIds, this.scores, this.tanks);
      }
    };

    this.ui.onChatSend = (text) => {
      if (this.isOnline) {
        Network.sendChatMessage(text);
      } else {
        this.ui.addChatMessage(Customizer.name, text, Customizer.color);
      }
    };

    const audioBtn = document.getElementById('btn-audio-toggle');
    audioBtn.onclick = () => {
      Sound.enabled = !Sound.enabled;
      audioBtn.textContent = Sound.enabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
    };

    document.getElementById('btn-restart').onclick = () => {
      if (!this.isOnline) {
        this._initMatch();
      }
    };
  }

  _setupNetwork() {
    Network.onRoomCreated = (code, players) => {
      this.ui.updateLobbyView(code, players, true);
    };

    Network.onRoomJoined = (code, players) => {
      this.ui.updateLobbyView(code, players, false);
      this.localPlayerIndex = Network.playerIndex;
    };

    Network.onLobbyUpdate = (players) => {
      this.ui.updateLobbyView(Network.roomCode, players, Network.isHost);
    };

    Network.onGameStarted = (mazeSeed, players) => {
      this.ui.multiplayerModal.classList.remove('open');
      this.isOnline = true;
      this.onlinePlayers = players;
      this.localPlayerIndex = Network.playerIndex;
      this._startOnlineMatch(mazeSeed, players);
    };

    Network.onPlayerState = (data) => {
      const remote = this.tanks.find(t => t.networkId === data.id);
      if (remote) {
        remote.x = data.x;
        remote.y = data.y;
        remote.rot = data.rot;
        remote.vx = data.vx;
        remote.vy = data.vy;
        remote.hp = data.hp;
        remote.weapon = data.weapon;
        remote.ammo = data.ammo;
      }
    };

    Network.onShootEvent = (data) => {
      const shooter = this.tanks.find(t => t.networkId === data.shooterId);
      if (shooter) {
        shooter.weapon = data.weapon;
        shooter.fire(this.projectiles, this.maze, this.particles);
      }
    };

    Network.onEmoteEvent = (playerId, emote) => {
      const target = this.tanks.find(t => t.networkId === playerId);
      if (target) {
        target.showEmote(emote);
      }
    };

    Network.onChatEvent = (data) => {
      this.ui.addChatMessage(data.name, data.text, data.color);
    };

    Network.onNewRound = (mazeSeed, scores) => {
      this.scores = scores || this.scores;
      this._startOnlineRound(mazeSeed);
    };

    Network.onError = (msg) => {
      document.getElementById('join-error-msg').textContent = msg;
    };
  }

  _setMode(mode) {
    this.mode = mode;
    if (mode === '1p_ai') this.activePlayerIds = [0, 3];
    else if (mode === '2p') this.activePlayerIds = [0, 1];
    else if (mode === '3p') this.activePlayerIds = [0, 1, 2];
    else if (mode === 'chaos_ffa') this.activePlayerIds = [0, 1, 2, 3];
    this._initMatch();
  }

  _initMatch() {
    this.scores = { 0: 0, 1: 0, 2: 0, 3: 0 };
    this.tanks = [];
    this.aiBots = [];
    this.localPlayerIndex = 0;

    const tankConfigs = [
      { id: 0, name: Customizer.name || 'COMANDANTE', color: Customizer.color || '#D9383A', isAI: false, chassis: Customizer.chassis || 'classic', decal: Customizer.decal || 'stripes' },
      { id: 1, name: 'ARES (AI BERSERKER)', color: '#27AE60', isAI: this.mode === 'chaos_ffa', chassis: 'heavy', decal: 'hazard' },
      { id: 2, name: 'NEXUS (AI TACTICAL)', color: '#2980B9', isAI: this.mode === 'chaos_ffa', chassis: 'hover', decal: 'star' },
      { id: 3, name: 'LAIKA (AI SNIPER)', color: '#8E44AD', isAI: true, chassis: 'railgun', decal: 'gold_trim' }
    ];

    for (const id of this.activePlayerIds) {
      const cfg = tankConfigs[id];
      const tank = new Tank(cfg.id, cfg.name, cfg.color, cfg.isAI, cfg.chassis, cfg.decal, false);
      tank.onKillCallback = this._onTankKilled.bind(this);
      this.tanks.push(tank);

      if (tank.isAI) {
        let personality = 'LAIKA';
        if (id === 1) personality = 'ARES';
        if (id === 2) personality = 'NEXUS';
        this.aiBots.push(new AIBot(tank, personality));
      }
    }

    window.activeGameTanks = this.tanks;
    this.ui.onlineRoomBadge.style.display = 'none';
    this._startNewRound();
  }

  _startOnlineMatch(mazeSeed, players) {
    this.scores = { 0: 0, 1: 0, 2: 0, 3: 0 };
    this.tanks = [];
    this.aiBots = [];
    this.activePlayerIds = players.map(p => p.index);

    players.forEach(p => {
      const isLocal = p.index === this.localPlayerIndex;
      const tank = new Tank(p.index, p.name, p.color, false, p.chassis, p.decal, !isLocal);
      tank.networkId = p.id;
      tank.onKillCallback = this._onTankKilled.bind(this);
      this.tanks.push(tank);
    });

    window.activeGameTanks = this.tanks;
    this.ui.onlineRoomBadge.style.display = 'inline-block';
    this.ui.onlineRoomBadge.textContent = `SALA: ${Network.roomCode}`;
    this.ui.showScreen('BATTLE');
    this._startOnlineRound(mazeSeed);
  }

  _startNewRound() {
    this.state = 'COUNTDOWN';
    this.timeScale = 1.0;
    this.projectiles = [];
    this.crates = [];
    ChaosEvents.reset();

    const biome = this.maze.cycleBiome();
    this.ui.updateBiomeButton(biome);
    this.maze.generate();

    const spawns = this.maze.getPlayerSpawns(this.tanks.length);

    this.tanks.forEach((tank, idx) => {
      const sp = spawns[idx] || { x: 200, y: 200 };
      const centerAngle = Math.atan2(this.maze.height / 2 - sp.y, this.maze.width / 2 - sp.x);
      tank.reset(sp.x, sp.y, centerAngle);
      if (tank.id === 0) {
        tank.setCustomization(Customizer.name, Customizer.color, Customizer.chassis, Customizer.decal);
      }
    });

    for (let i = 0; i < 4; i++) {
      this._spawnCrate();
    }

    this.ui.showBanner(`MAPA: ${biome.name.toUpperCase()}`, '¡PREPARADOS!', 1.2);
    setTimeout(() => {
      this.ui.showBanner('¡A COMBATIR!', '', 0.6);
      this.state = 'BATTLE';
    }, 1200);

    this.ui.updatePlayerCards(this.activePlayerIds, this.scores, this.tanks);
  }

  _startOnlineRound(mazeSeed) {
    this.state = 'COUNTDOWN';
    this.timeScale = 1.0;
    this.projectiles = [];
    this.crates = [];
    ChaosEvents.reset();

    const biome = this.maze.cycleBiome();
    this.ui.updateBiomeButton(biome);
    this.maze.generate(mazeSeed);

    const spawns = this.maze.getPlayerSpawns(this.tanks.length);

    this.tanks.forEach((tank, idx) => {
      const sp = spawns[idx] || { x: 200, y: 200 };
      const centerAngle = Math.atan2(this.maze.height / 2 - sp.y, this.maze.width / 2 - sp.x);
      tank.reset(sp.x, sp.y, centerAngle);
    });

    for (let i = 0; i < 4; i++) {
      this._spawnCrate();
    }

    this.ui.showBanner(`MAPA: ${biome.name.toUpperCase()}`, '¡EN LÍNEA!', 1.2);
    setTimeout(() => {
      this.ui.showBanner('¡FUEGO!', '', 0.6);
      this.state = 'BATTLE';
    }, 1200);

    this.ui.updatePlayerCards(this.activePlayerIds, this.scores, this.tanks);
  }

  _spawnCrate() {
    const existing = [
      ...this.crates.filter((c) => !c.dead),
      ...this.tanks.filter((t) => !t.dead)
    ];
    const pos = this.maze.getRandomOpenCell(existing, 100);
    this.crates.push(new Crate(pos.x, pos.y));
  }

  _onTankKilled(killerId, victimId, weaponName, isBank) {
    this.screenShake = 14;
    const killer = this.tanks.find((t) => t.id === killerId) || { name: 'MUNDO' };
    const victim = this.tanks.find((t) => t.id === victimId) || { name: 'TANQUE' };
    this.ui.addKillFeedEntry(killer.name, victim.name, weaponName, isBank);

    const livingTanks = this.tanks.filter((t) => !t.dead);
    if (livingTanks.length <= 1 && this.state === 'BATTLE') {
      this.state = 'ROUND_END';

      this.timeScale = 0.3;
      setTimeout(() => {
        this.timeScale = 1.0;
        const winner = livingTanks.length === 1 ? livingTanks[0] : null;
        if (winner) {
          this.scores[winner.id] = (this.scores[winner.id] || 0) + 1;
          Sound.playVictory();
          this.ui.showBanner(`¡${winner.name} GANA LA RONDA!`, `Puntos: ${this.scores[winner.id]}`, 1.8);
        } else {
          this.ui.showBanner('¡EMPATE!', 'DESTRUCCIÓN MUTUA', 1.8);
        }

        this.ui.updatePlayerCards(this.activePlayerIds, this.scores, this.tanks);

        setTimeout(() => {
          if (this.isOnline) {
            if (Network.isHost) {
              Network.sendRoundOver(this.scores);
            }
          } else {
            this._startNewRound();
          }
        }, 1900);
      }, 700);
    }
  }

  _loop(currentTime) {
    const rawDt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;
    const dt = rawDt * this.timeScale;

    if (this.state !== 'MENU') {
      this._update(dt);
      this._render();
    }

    requestAnimationFrame(this._loop.bind(this));
  }

  _update(dt) {
    // 1. Crate Spawning
    if (this.crates.filter((c) => !c.dead).length < 5) {
      this.crateTimer += dt;
      if (this.crateTimer > this.crateInterval) {
        this.crateTimer = 0;
        this._spawnCrate();
      }
    }

    // 2. Sudden-Death Chaos Events
    if (this.state === 'BATTLE') {
      ChaosEvents.update(dt, this.maze, this.tanks, this.projectiles, this.crates, this.particles, this.ui);
    }

    // 3. AI Updates (Local matches)
    if (!this.isOnline && this.state === 'BATTLE') {
      for (const ai of this.aiBots) {
        ai.update(dt, this.maze, this.tanks, this.projectiles, this.crates);
      }
    }

    // 4. Tank Physics & Controls
    for (const tank of this.tanks) {
      let steer = 0, drive = 0, shoot = false;

      if (this.state === 'BATTLE') {
        const isLocalControlled = (!this.isOnline && tank.id === 0) || (this.isOnline && tank.id === this.localPlayerIndex);

        if (isLocalControlled) {
          if (this.keys['ArrowLeft'] || this.keys['KeyA']) steer -= 1;
          if (this.keys['ArrowRight'] || this.keys['KeyD']) steer += 1;
          if (this.keys['ArrowUp'] || this.keys['KeyW']) drive += 1;
          if (this.keys['ArrowDown'] || this.keys['KeyS']) drive -= 1;
          if (this.keys['KeyM'] || this.keys['Space'] || this.keys['KeyJ']) shoot = true;

          // Direct Vector Joystick Input
          if (this.joystick.active && this.joystick.power > 0.05) {
            let angleDiff = this.joystick.targetAngle - tank.rot;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            steer = Math.sign(angleDiff) * Math.min(1.0, Math.abs(angleDiff) * 5.8);

            if (Math.abs(angleDiff) < 1.65) {
              drive = this.joystick.power * Math.cos(angleDiff);
            }
          }

          if (this.joystick.shoot) shoot = true;

          if (this.isOnline && shoot && tank.cooldown <= 0) {
            const fwdX = Math.cos(tank.rot);
            const fwdY = Math.sin(tank.rot);
            Network.sendShoot(tank.x + fwdX * 22, tank.y + fwdY * 22, fwdX, fwdY, tank.weapon);
          }
        } else if (!this.isOnline) {
          if (tank.isAI) {
            const ai = this.aiBots.find((b) => b.tank === tank);
            if (ai) {
              steer = ai.steerInput;
              drive = ai.driveInput;
              shoot = ai.shootInput;
            }
          } else if (tank.id === 1) { // P2 Local
            if (this.keys['KeyA']) steer -= 1;
            if (this.keys['KeyD']) steer += 1;
            if (this.keys['KeyW']) drive += 1;
            if (this.keys['KeyS']) drive -= 1;
            if (this.keys['Space'] || this.keys['KeyQ']) shoot = true;
          } else if (tank.id === 2) { // P3 Local
            if (this.keys['KeyJ']) steer -= 1;
            if (this.keys['KeyL']) steer += 1;
            if (this.keys['KeyI']) drive += 1;
            if (this.keys['KeyK']) drive -= 1;
            if (this.keys['KeyU']) shoot = true;
          }
        }
      }

      if (ChaosEvents.empActive) {
        tank.cooldown = Math.max(0, tank.cooldown - dt * 1.5);
      }

      tank.update(dt, steer, drive, shoot, this.maze, this.projectiles, this.particles);
    }

    // 5. Network Sync (30 Hz)
    if (this.isOnline && this.state === 'BATTLE') {
      this.networkSyncTimer += dt;
      if (this.networkSyncTimer > 0.033) {
        this.networkSyncTimer = 0;
        const myTank = this.tanks.find(t => t.id === this.localPlayerIndex);
        if (myTank) {
          Network.sendSyncState(myTank);
        }
      }
    }

    // 6. Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, this.maze, this.tanks, this.projectiles, this.particles);
      if (p.dead) this.projectiles.splice(i, 1);
    }

    // 7. Crates
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const c = this.crates[i];
      c.update(dt, this.tanks, this.particles);
      if (c.dead) this.crates.splice(i, 1);
    }

    // 8. Particles
    this.particles.update(dt);

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    this.ui.updatePlayerCards(this.activePlayerIds, this.scores, this.tanks);
  }

  _render() {
    this.ctx.save();

    if (this.screenShake > 0) {
      const offX = (Math.random() - 0.5) * this.screenShake;
      const offY = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(offX, offY);
    }

    // 1. Maze & Biome
    this.maze.render(this.ctx);

    // 2. Chaos Events
    ChaosEvents.render(this.ctx);

    // 3. Crates
    for (const c of this.crates) {
      c.render(this.ctx);
    }

    // 4. Laser Aim Sight for local player
    if (this.state === 'BATTLE') {
      const localTank = this.tanks.find(t => t.id === (this.isOnline ? this.localPlayerIndex : 0));
      if (localTank && !localTank.dead) {
        localTank.renderLaserSight(this.ctx, this.maze);
      }
    }

    // 5. Tanks & Overhead Badges & Emotes
    for (const t of this.tanks) {
      t.render(this.ctx);
    }

    // 6. Projectiles
    for (const p of this.projectiles) {
      p.render(this.ctx);
    }

    // 7. Particles
    this.particles.render(this.ctx);

    this.ctx.restore();
  }
}

function initApp() {
  if (!window.gameInstance) {
    window.gameInstance = new Game();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
