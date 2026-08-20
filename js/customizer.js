// Tank Garage & Customizer Module with LocalStorage Persistence & 360 Live Preview

export const CHASSIS_STYLES = {
  CLASSIC: { id: 'classic', name: 'Clásico Mk-I', desc: 'Orugas dobles con torreta estándar equilibrada' },
  HEAVY: { id: 'heavy', name: 'Behemoth Blindado', desc: 'Chasis pesado reforzado con doble cañón de impacto' },
  HOVER: { id: 'hover', name: 'Hovercraft Cibernético', desc: 'Propulsores de repulsión antigravedad flotantes' },
  RAILGUN: { id: 'railgun', name: 'Mecha Railgun', desc: 'Chasis angular stealth con cañón electromagnético' }
};

export const COLOR_PALETTES = [
  { id: 'crimson', name: 'Rojo Carmesí', hex: '#D9383A' },
  { id: 'emerald', name: 'Verde Esmeralda', hex: '#27AE60' },
  { id: 'cobalt', name: 'Azul Cobalto', hex: '#2980B9' },
  { id: 'purple', name: 'Púrpura Neón', hex: '#8E44AD' },
  { id: 'gold', name: 'Oro Ámbar', hex: '#F39C12' },
  { id: 'pink', name: 'Cyberpunk Pink', hex: '#FF0844' },
  { id: 'white', name: 'Blanco Ártico', hex: '#ECF0F1' },
  { id: 'black', name: 'Sombra Stealth', hex: '#2C3E50' }
];

export const DECALS = [
  { id: 'none', name: 'Sin Calcomanía' },
  { id: 'stripes', name: 'Rayas de Carreras' },
  { id: 'gold_trim', name: 'Ribete Dorado Élite' },
  { id: 'star', name: 'Estrella de Mando' },
  { id: 'hazard', name: 'Franjas de Peligro' }
];

export class TankCustomizer {
  constructor() {
    this.name = 'COMANDANTE';
    this.color = '#D9383A';
    this.chassis = 'classic';
    this.decal = 'stripes';
    this.previewAngle = 0;
    this.previewCanvas = null;
    this.previewCtx = null;
    this.loadSettings();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('tank_trouble_custom');
      if (saved) {
        const data = JSON.parse(saved);
        this.name = data.name || 'COMANDANTE';
        this.color = data.color || '#D9383A';
        this.chassis = data.chassis || 'classic';
        this.decal = data.decal || 'stripes';
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  saveSettings() {
    try {
      const data = {
        name: this.name,
        color: this.color,
        chassis: this.chassis,
        decal: this.decal
      };
      localStorage.setItem('tank_trouble_custom', JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  initPreview(canvasId) {
    this.previewCanvas = document.getElementById(canvasId);
    if (!this.previewCanvas) return;
    this.previewCtx = this.previewCanvas.getContext('2d');
    this._startPreviewLoop();
  }

  _startPreviewLoop() {
    const loop = () => {
      this.previewAngle += 0.015;
      this.renderPreview();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  renderPreview() {
    if (!this.previewCtx || !this.previewCanvas) return;
    const ctx = this.previewCtx;
    const w = this.previewCanvas.width;
    const h = this.previewCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background circle pad
    ctx.fillStyle = '#F4F1EA';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#E6E1DA';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(this.previewAngle);

    // Render tank with current customization
    this.renderCustomTank(ctx, 0, 0, 0, this.color, this.chassis, this.decal, false, 0, 0);

    ctx.restore();

    // Render Name Badge
    ctx.fillStyle = '#1C1E21';
    ctx.font = 'bold 12px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name.toUpperCase(), w / 2, h - 12);
  }

  renderCustomTank(ctx, x, y, rot, color, chassis, decal, isDamaged = false, recoil = 0, muzzleFlash = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    const bodyCol = isDamaged ? '#FFFFFF' : color;

    switch (chassis) {
      case 'heavy':
        // HEAVY BEHEMOTH (Quad Tracks, Dual Barrels, Heavy Front Plate)
        // 4 Tracks
        ctx.fillStyle = '#1C1E21';
        ctx.fillRect(-16, -16, 14, 7);
        ctx.fillRect(2, -16, 14, 7);
        ctx.fillRect(-16, 9, 14, 7);
        ctx.fillRect(2, 9, 14, 7);

        // Heavy Wide Chassis
        ctx.fillStyle = bodyCol;
        ctx.fillRect(-14 - recoil * 0.4, -11, 28, 22);
        ctx.strokeStyle = '#1C1E21';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(-14 - recoil * 0.4, -11, 28, 22);

        // Front Armor Wedge
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.moveTo(14 - recoil * 0.4, -11);
        ctx.lineTo(20 - recoil * 0.4, 0);
        ctx.lineTo(14 - recoil * 0.4, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dual Barrels
        ctx.fillStyle = '#1C1E21';
        ctx.fillRect(0 - recoil, -5, 19, 3.5);
        ctx.fillRect(0 - recoil, 1.5, 19, 3.5);

        // Turret Block
        ctx.fillStyle = bodyCol;
        ctx.fillRect(-8 - recoil * 0.2, -8, 16, 16);
        ctx.strokeRect(-8 - recoil * 0.2, -8, 16, 16);
        break;

      case 'hover':
        // CYBER HOVERCRAFT (4 Glowing Antigrav Thrusters, Aerodynamic Hull)
        const pulse = Math.sin(Date.now() * 0.008) * 2;
        // 4 Thruster Pods with Neon Glow
        ctx.fillStyle = '#1ABC9C';
        ctx.beginPath();
        ctx.arc(-12, -11, 5 + pulse * 0.5, 0, Math.PI * 2);
        ctx.arc(12, -11, 5 + pulse * 0.5, 0, Math.PI * 2);
        ctx.arc(-12, 11, 5 + pulse * 0.5, 0, Math.PI * 2);
        ctx.arc(12, 11, 5 + pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(-15, -14, 6, 6);
        ctx.fillRect(9, -14, 6, 6);
        ctx.fillRect(-15, 8, 6, 6);
        ctx.fillRect(9, 8, 6, 6);

        // Diamond Sleek Hull
        ctx.fillStyle = bodyCol;
        ctx.beginPath();
        ctx.moveTo(-14 - recoil * 0.5, 0);
        ctx.lineTo(0 - recoil * 0.5, -12);
        ctx.lineTo(16 - recoil * 0.5, 0);
        ctx.lineTo(0 - recoil * 0.5, 12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1C1E21';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Sleek Barrel
        ctx.fillStyle = '#1C1E21';
        ctx.fillRect(0 - recoil, -2, 20, 4);

        // Dome
        ctx.fillStyle = '#1ABC9C';
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'railgun':
        // MECHA RAILGUN (Angular Stealth Hull, Long Rail Barrel with Cyan Glow)
        // Stealth Angular Treads
        ctx.fillStyle = '#1C1E21';
        ctx.fillRect(-14, -14, 28, 5);
        ctx.fillRect(-14, 9, 28, 5);

        // Angular Hull
        ctx.fillStyle = bodyCol;
        ctx.beginPath();
        ctx.moveTo(-12 - recoil * 0.5, -9);
        ctx.lineTo(12 - recoil * 0.5, -9);
        ctx.lineTo(16 - recoil * 0.5, 0);
        ctx.lineTo(12 - recoil * 0.5, 9);
        ctx.lineTo(-12 - recoil * 0.5, 9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1C1E21';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Extended Rail Barrel
        ctx.fillStyle = '#1C1E21';
        ctx.fillRect(0 - recoil, -3, 25, 6);
        ctx.fillStyle = '#00F2FE';
        ctx.fillRect(4 - recoil, -1, 18, 2);

        // Turret Hexagon
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.arc(-recoil * 0.2, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00F2FE';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        break;

      default:
        // CLASSIC MK-I
        ctx.fillStyle = '#1C1E21';
        ctx.fillRect(-13, -13, 26, 6);
        ctx.fillRect(-13, 7, 26, 6);

        ctx.fillStyle = '#4A4D52';
        for (let k = -11; k <= 11; k += 4) {
          ctx.fillRect(k, -13, 1.5, 6);
          ctx.fillRect(k, 7, 1.5, 6);
        }

        ctx.fillStyle = bodyCol;
        ctx.fillRect(-11 - recoil * 0.5, -9, 21, 18);
        ctx.strokeStyle = '#1C1E21';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-11 - recoil * 0.5, -9, 21, 18);

        ctx.fillStyle = '#1C1E21';
        ctx.fillRect(0 - recoil, -2.5, 17, 5);

        ctx.fillStyle = bodyCol;
        ctx.beginPath();
        ctx.arc(-recoil * 0.3, 0, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
    }

    // Apply Decals
    if (decal === 'stripes') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-9, -2, 16, 1.5);
      ctx.fillRect(-9, 0.5, 16, 1.5);
    } else if (decal === 'gold_trim') {
      ctx.strokeStyle = '#F1C40F';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-8, -6, 14, 12);
    } else if (decal === 'star') {
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.arc(-2, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (decal === 'hazard') {
      ctx.fillStyle = '#F39C12';
      ctx.fillRect(-8, -7, 3, 14);
      ctx.fillStyle = '#1C1E21';
      ctx.fillRect(-3, -7, 3, 14);
    }

    // Muzzle Flash
    if (muzzleFlash > 0) {
      ctx.fillStyle = '#F39C12';
      ctx.beginPath();
      ctx.arc(20 - recoil, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(20 - recoil, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export const Customizer = new TankCustomizer();
