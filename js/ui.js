// Universal UI & Touch Interaction Manager for Tank Trouble Web
import { COLOR_PALETTES, Customizer } from './customizer.js';
import { Network } from './network.js';

export function bindTap(el, callback) {
  if (!el) return;
  el.addEventListener('click', (e) => {
    callback(e);
  });
}

export class UIManager {
  constructor() {
    this.screenMainMenu = document.getElementById('screen-main-menu');
    this.screenGameBattle = document.getElementById('screen-game-battle');

    this.scoreP1 = document.getElementById('score-p1');
    this.scoreP2 = document.getElementById('score-p2');
    this.scoreP3 = document.getElementById('score-p3');
    this.scoreP4 = document.getElementById('score-p4');

    this.nameP1 = document.getElementById('name-p1');
    this.nameP2 = document.getElementById('name-p2');
    this.nameP3 = document.getElementById('name-p3');
    this.nameP4 = document.getElementById('name-p4');

    this.weaponP1 = document.getElementById('weapon-p1');
    this.weaponP2 = document.getElementById('weapon-p2');
    this.weaponP3 = document.getElementById('weapon-p3');
    this.weaponP4 = document.getElementById('weapon-p4');

    this.cardP1 = document.getElementById('card-p1');
    this.cardP2 = document.getElementById('card-p2');
    this.cardP3 = document.getElementById('card-p3');
    this.cardP4 = document.getElementById('card-p4');

    this.onlineRoomBadge = document.getElementById('online-room-badge');

    this.killfeed = document.getElementById('killfeed');
    this.banner = document.getElementById('banner-overlay');
    this.bannerTitle = document.getElementById('banner-title');
    this.bannerSub = document.getElementById('banner-sub');
    this.bannerTimeout = null;

    this.chatBox = document.getElementById('game-chat-box');
    this.chatList = document.getElementById('chat-messages-list');
    this.chatInput = document.getElementById('chat-text-input');
    this.btnSendChat = document.getElementById('btn-send-chat');

    this.modeModal = document.getElementById('mode-modal');
    this.garageModal = document.getElementById('garage-modal');
    this.multiplayerModal = document.getElementById('multiplayer-modal');
    this.biomeBtn = document.getElementById('btn-biome-toggle');

    this._setupScreenListeners();
    this._setupGarageUI();
    this._setupMultiplayerUI();
    this._setupChatUI();
  }

  showScreen(screenName) {
    this.screenMainMenu.classList.remove('active');
    this.screenGameBattle.classList.remove('active');

    if (screenName === 'MENU') {
      this.screenMainMenu.classList.add('active');
      Customizer.initPreview('menuTankCanvas');
    } else if (screenName === 'BATTLE') {
      this.screenGameBattle.classList.add('active');
    }
  }

  _setupScreenListeners() {
    const menuPilotInput = document.getElementById('menu-pilot-input');
    if (menuPilotInput) {
      menuPilotInput.value = Customizer.name;
      menuPilotInput.addEventListener('input', (e) => {
        Customizer.name = e.target.value || 'PILOTO';
        const garageInput = document.getElementById('pilot-name-input');
        if (garageInput) garageInput.value = Customizer.name;
        Customizer.saveSettings();
        Customizer.renderPreview();
      });
    }

    window.openModeModal = () => this.modeModal.classList.add('open');
    window.openMultiplayerModal = () => this.multiplayerModal.classList.add('open');
    window.openGarageModal = () => {
      this.garageModal.classList.add('open');
      Customizer.initPreview('garagePreviewCanvas');
    };
    window.closeModeModal = () => this.modeModal.classList.remove('open');
    window.closeMultiplayerModal = () => this.multiplayerModal.classList.remove('open');
    window.closeGarageModal = () => this.garageModal.classList.remove('open');

    bindTap(document.getElementById('btn-menu-singleplayer'), window.openModeModal);
    bindTap(document.getElementById('btn-menu-multiplayer'), window.openMultiplayerModal);
    bindTap(document.getElementById('btn-menu-garage'), window.openGarageModal);
    bindTap(document.getElementById('btn-in-game-garage'), window.openGarageModal);

    document.querySelectorAll('.modal-panel').forEach(panel => {
      panel.addEventListener('click', (e) => e.stopPropagation());
    });

    bindTap(document.getElementById('btn-close-mode-modal'), window.closeModeModal);
    bindTap(document.getElementById('btn-close-mp-modal'), window.closeMultiplayerModal);
  }

  _setupChatUI() {
    bindTap(document.getElementById('btn-toggle-chat'), () => {
      this.chatBox.classList.toggle('open');
      if (this.chatBox.classList.contains('open')) {
        this.chatInput.focus();
      }
    });

    const sendMsg = () => {
      const text = (this.chatInput.value || '').trim();
      if (text) {
        if (this.onChatSend) this.onChatSend(text);
        this.chatInput.value = '';
      }
    };

    bindTap(this.btnSendChat, sendMsg);
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendMsg();
      }
    });
  }

  addChatMessage(name, text, color = '#1C1E21') {
    const entry = document.createElement('div');
    entry.className = 'chat-msg-entry';
    entry.innerHTML = `<strong style="color: ${color}">${name}:</strong> ${text}`;
    this.chatList.appendChild(entry);
    this.chatList.scrollTop = this.chatList.scrollHeight;

    if (!this.chatBox.classList.contains('open')) {
      this.addKillFeedEntry(name, text, '💬 CHAT');
    }
  }

  _setupGarageUI() {
    const paletteContainer = document.getElementById('color-palette-container');
    const nameInput = document.getElementById('pilot-name-input');
    const menuPilotInput = document.getElementById('menu-pilot-input');

    if (nameInput) {
      nameInput.value = Customizer.name;
      nameInput.addEventListener('input', (e) => {
        Customizer.name = e.target.value || 'PILOTO';
        if (menuPilotInput) menuPilotInput.value = Customizer.name;
        Customizer.renderPreview();
      });
    }

    if (paletteContainer) {
      paletteContainer.innerHTML = '';
      COLOR_PALETTES.forEach((col) => {
        const sw = document.createElement('div');
        sw.className = `color-swatch ${Customizer.color === col.hex ? 'active' : ''}`;
        sw.style.backgroundColor = col.hex;
        sw.title = col.name;
        bindTap(sw, () => {
          document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
          sw.classList.add('active');
          Customizer.color = col.hex;
          Customizer.renderPreview();
        });
        paletteContainer.appendChild(sw);
      });
    }

    document.querySelectorAll('.chassis-btn').forEach((btn) => {
      if (btn.dataset.chassis === Customizer.chassis) btn.classList.add('active');
      else btn.classList.remove('active');

      bindTap(btn, () => {
        document.querySelectorAll('.chassis-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Customizer.chassis = btn.dataset.chassis;
        Customizer.renderPreview();
      });
    });

    document.querySelectorAll('.decal-btn').forEach((btn) => {
      if (btn.dataset.decal === Customizer.decal) btn.classList.add('active');
      else btn.classList.remove('active');

      bindTap(btn, () => {
        document.querySelectorAll('.decal-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Customizer.decal = btn.dataset.decal;
        Customizer.renderPreview();
      });
    });

    bindTap(document.getElementById('btn-save-garage'), () => {
      Customizer.saveSettings();
      this.garageModal.classList.remove('open');
      if (menuPilotInput) menuPilotInput.value = Customizer.name;
      if (this.onGarageSaved) this.onGarageSaved();
    });
  }

  _setupMultiplayerUI() {
    const tabCreate = document.getElementById('tab-btn-create');
    const tabJoin = document.getElementById('tab-btn-join');
    const contentCreate = document.getElementById('tab-content-create');
    const contentJoin = document.getElementById('tab-content-join');

    const joinInput = document.getElementById('input-join-code');

    bindTap(tabCreate, () => {
      tabCreate.classList.add('active');
      tabJoin.classList.remove('active');
      contentCreate.classList.add('active');
      contentJoin.classList.remove('active');
    });

    bindTap(tabJoin, () => {
      tabJoin.classList.add('active');
      tabCreate.classList.remove('active');
      contentJoin.classList.add('active');
      contentCreate.classList.remove('active');
      if (joinInput) {
        setTimeout(() => joinInput.focus(), 100);
      }
    });

    if (joinInput) {
      joinInput.addEventListener('input', (e) => {
        joinInput.value = e.target.value.toUpperCase();
      });

      joinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const code = joinInput.value.trim().toUpperCase();
          if (code) {
            Network.joinRoom(code, Customizer);
          }
        }
      });
    }

    bindTap(document.getElementById('btn-action-create-room'), () => {
      Network.createRoom(Customizer, 1000);
    });

    bindTap(document.getElementById('btn-action-join-room'), () => {
      const code = (joinInput ? joinInput.value : '').trim().toUpperCase();
      if (!code) {
        document.getElementById('join-error-msg').textContent = 'Por favor ingresa un código de 4 letras';
        return;
      }
      Network.joinRoom(code, Customizer);
    });

    bindTap(document.getElementById('btn-copy-code'), () => {
      const code = document.getElementById('display-room-code').textContent;
      navigator.clipboard.writeText(code);
      this.showBanner('¡CÓDIGO COPIADO!', code, 1.2);
    });

    bindTap(document.getElementById('btn-host-start-game'), () => {
      Network.startGame();
    });
  }

  updateLobbyView(code, players, isHost) {
    document.getElementById('display-room-code').textContent = code;
    document.getElementById('host-lobby-view').style.display = 'block';
    document.getElementById('lobby-player-count').textContent = players.length;

    const tabCreate = document.getElementById('tab-btn-create');
    const tabJoin = document.getElementById('tab-btn-join');
    const contentCreate = document.getElementById('tab-content-create');
    const contentJoin = document.getElementById('tab-content-join');

    tabCreate.classList.add('active');
    tabJoin.classList.remove('active');
    contentCreate.classList.add('active');
    contentJoin.classList.remove('active');

    document.querySelector('.host-config-box').style.display = 'none';
    document.getElementById('join-error-msg').textContent = '';

    const startBtn = document.getElementById('btn-host-start-game');
    const guestWaitingMsg = document.getElementById('guest-waiting-msg');

    if (isHost) {
      startBtn.style.display = 'block';
      if (guestWaitingMsg) guestWaitingMsg.style.display = 'none';
    } else {
      startBtn.style.display = 'none';
      if (guestWaitingMsg) {
        guestWaitingMsg.style.display = 'block';
        guestWaitingMsg.innerHTML = '⏳ <strong>Conectado a la sala.</strong> Esperando a que el anfitrión inicie la partida...';
      }
    }

    const grid = document.getElementById('lobby-players-grid');
    grid.innerHTML = '';

    players.forEach((p) => {
      const slot = document.createElement('div');
      slot.className = 'lobby-slot';
      slot.innerHTML = `
        <div style="width: 14px; height: 14px; border-radius: 50%; background: ${p.color};"></div>
        <div style="flex:1;">
          <div class="p-name">${p.name.toUpperCase()} ${p.isHost ? '(HOST)' : ''}</div>
          <div style="font-size: 10px; color: var(--text-muted);">${p.chassis.toUpperCase()}</div>
        </div>
      `;
      grid.appendChild(slot);
    });
  }

  updatePlayerCards(activeIds, scores, tanks) {
    this.cardP1.style.display = activeIds.includes(0) ? 'flex' : 'none';
    this.cardP2.style.display = activeIds.includes(1) ? 'flex' : 'none';
    this.cardP3.style.display = activeIds.includes(2) ? 'flex' : 'none';
    this.cardP4.style.display = activeIds.includes(3) ? 'flex' : 'none';

    if (activeIds.includes(0)) this.scoreP1.textContent = scores[0] || 0;
    if (activeIds.includes(1)) this.scoreP2.textContent = scores[1] || 0;
    if (activeIds.includes(2)) this.scoreP3.textContent = scores[2] || 0;
    if (activeIds.includes(3)) this.scoreP4.textContent = scores[3] || 0;

    for (const t of tanks) {
      const ammoStr = t.ammo < 0 ? '∞' : `x${t.ammo}`;
      const hpStr = `${Math.ceil(t.hp)}`;
      const text = `${t.weapon} [${ammoStr}] • ${hpStr}`;
      if (t.id === 0) {
        this.nameP1.textContent = t.name.toUpperCase();
        this.nameP1.style.color = t.color;
        this.weaponP1.textContent = text;
      }
      if (t.id === 1) {
        this.nameP2.textContent = t.name.toUpperCase();
        this.nameP2.style.color = t.color;
        this.weaponP2.textContent = text;
      }
      if (t.id === 2) {
        this.nameP3.textContent = t.name.toUpperCase();
        this.nameP3.style.color = t.color;
        this.weaponP3.textContent = text;
      }
      if (t.id === 3) {
        this.nameP4.textContent = t.name.toUpperCase();
        this.nameP4.style.color = t.color;
        this.weaponP4.textContent = text;
      }
    }
  }

  updateBiomeButton(biome) {
    if (this.biomeBtn) {
      this.biomeBtn.textContent = `🗺️`;
      this.biomeBtn.title = `Bioma: ${biome.name}`;
    }
  }

  addKillFeedEntry(killerName, victimName, weaponName, isBank = false) {
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    let text = `${killerName} ➔ ${victimName} (${weaponName})`;
    if (isBank) text += ' ★ BANK SHOT';
    entry.textContent = text;

    this.killfeed.appendChild(entry);
    setTimeout(() => {
      entry.style.transition = 'opacity 0.4s ease';
      entry.style.opacity = '0';
      setTimeout(() => entry.remove(), 400);
    }, 3200);

    if (this.killfeed.children.length > 5) {
      this.killfeed.removeChild(this.killfeed.children[0]);
    }
  }

  showBanner(title, subtitle = '', duration = 1.8) {
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerTitle.textContent = title;
    this.bannerSub.textContent = subtitle;
    this.banner.style.opacity = '1';

    if (duration > 0) {
      this.bannerTimeout = setTimeout(() => {
        this.banner.style.opacity = '0';
      }, duration * 1000);
    }
  }
}
