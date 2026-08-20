// Sudden-Death Chaos Environmental Events Manager

import { Sound } from './audio.js';
import { Crate } from './weapons.js';

export class ChaosEventManager {
  constructor() {
    this.roundTime = 0;
    this.eventTriggered = false;
    this.currentEvent = null;
    this.eventDuration = 0;

    this.lavaZones = []; // [{x, y, w, h}]
    this.meteors = [];   // [{x, y, delay, timer, exploded}]
    this.empActive = false;
  }

  reset() {
    this.roundTime = 0;
    this.eventTriggered = false;
    this.currentEvent = null;
    this.eventDuration = 0;
    this.lavaZones = [];
    this.meteors = [];
    this.empActive = false;
  }

  update(dt, maze, tanks, projectiles, crates, particles, ui) {
    this.roundTime += dt;

    // Trigger Chaos Event after 45 seconds of intense combat
    if (this.roundTime >= 45 && !this.eventTriggered) {
      this.eventTriggered = true;
      this._triggerRandomEvent(maze, crates, ui);
    }

    // 1. Process Lava Flood
    if (this.currentEvent === 'LAVA_FLOOD') {
      for (const zone of this.lavaZones) {
        // Spawn heat bubble particles
        if (Math.random() < 0.35) {
          const bx = zone.x + Math.random() * zone.w;
          const by = zone.y + Math.random() * zone.h;
          particles.addSparks(bx, by, 0, -1, 2, '#FF4500');
        }

        // Damage tanks in lava
        for (const t of tanks) {
          if (!t.dead) {
            if (t.x >= zone.x && t.x <= zone.x + zone.w && t.y >= zone.y && t.y <= zone.y + zone.h) {
              t.takeDamage(-1, 'Lava Hirviente', 25 * dt * 2, false, particles);
              Sound.playLava();
            }
          }
        }
      }
    }

    // 2. Process Meteor Shower
    if (this.currentEvent === 'METEOR_SHOWER') {
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        m.timer += dt;

        if (m.timer >= m.delay && !m.exploded) {
          m.exploded = true;
          Sound.playMeteor();
          particles.addShockwave(m.x, m.y, 110, '#FF4500');
          particles.addDebris(m.x, m.y, '#D35400', 16);

          for (const t of tanks) {
            if (!t.dead) {
              const d = Math.hypot(t.x - m.x, t.y - m.y);
              if (d <= 110) {
                t.takeDamage(-1, 'Meteorito Orbital', 160, false, particles);
              }
            }
          }
          this.meteors.splice(i, 1);
        }
      }
    }
  }

  _triggerRandomEvent(maze, crates, ui) {
    const events = ['LAVA_FLOOD', 'METEOR_SHOWER', 'EMP_STORM', 'CRATE_AIRDROP'];
    this.currentEvent = events[Math.floor(Math.random() * events.length)];
    Sound.playSiren();

    switch (this.currentEvent) {
      case 'LAVA_FLOOD':
        ui.showBanner('⚠️ ¡INUNDACIÓN DE LAVA!', '¡EL LABERINTO SE DERRITE! EVITA LOS CHARCOS', 3.0);
        // Spawn 4 lava corridors
        for (let i = 0; i < 4; i++) {
          const cx = Math.floor(Math.random() * (maze.cols - 1));
          const cy = Math.floor(Math.random() * (maze.rows - 1));
          this.lavaZones.push({
            x: cx * maze.cellW + 6,
            y: cy * maze.cellH + 6,
            w: maze.cellW * 1.5 - 12,
            h: maze.cellH - 12
          });
        }
        break;

      case 'METEOR_SHOWER':
        ui.showBanner('☄️ ¡LLUVIA DE METEOROS!', '¡IMPACTO ORBITAL INMINENTE EN EL LABERINTO!', 3.0);
        // Spawn 8 targeted meteor impacts with 1.5s - 4.5s delays
        for (let i = 0; i < 8; i++) {
          const pos = maze.getRandomOpenCell([], 80);
          this.meteors.push({
            x: pos.x,
            y: pos.y,
            delay: 1.5 + i * 0.5,
            timer: 0,
            exploded: false
          });
        }
        break;

      case 'EMP_STORM':
        ui.showBanner('⚡ ¡SOBRECARGA EMP TOTAL!', '¡DISPARO ACELERADO 2X Y CAOS ELÉCTRICO!', 3.0);
        this.empActive = true;
        Sound.playEMP();
        break;

      case 'CRATE_AIRDROP':
        ui.showBanner('📦 ¡LLUVIA DE SUMINISTROS!', '¡8 CAJAS DE ARMAS CAEN DEL CIELO!', 3.0);
        for (let i = 0; i < 8; i++) {
          const pos = maze.getRandomOpenCell([], 60);
          crates.push(new Crate(pos.x, pos.y));
        }
        break;
    }
  }

  render(ctx) {
    // Render Lava Hazard Zones
    if (this.currentEvent === 'LAVA_FLOOD') {
      const pulse = Math.sin(Date.now() * 0.005) * 0.15 + 0.85;
      for (const z of this.lavaZones) {
        ctx.fillStyle = `rgba(230, 81, 0, ${pulse * 0.75})`;
        ctx.fillRect(z.x, z.y, z.w, z.h);

        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 2;
        ctx.strokeRect(z.x, z.y, z.w, z.h);

        ctx.fillStyle = '#FFEB3B';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText('🔥 LAVA 🔥', z.x + z.w / 2 - 24, z.y + z.h / 2 + 3);
      }
    }

    // Render Meteor Targeting Reticles
    if (this.currentEvent === 'METEOR_SHOWER') {
      for (const m of this.meteors) {
        const progress = Math.min(1, m.timer / m.delay);
        const radius = 45 * (1 - progress * 0.6);

        ctx.strokeStyle = `rgba(231, 76, 60, ${progress * 0.8 + 0.2})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(m.x, m.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(m.x - 12, m.y);
        ctx.lineTo(m.x + 12, m.y);
        ctx.moveTo(m.x, m.y - 12);
        ctx.lineTo(m.x, m.y + 12);
        ctx.stroke();
      }
    }
  }
}

export const ChaosEvents = new ChaosEventManager();
