export const BIOMES = [
  { id: 'classic', name: 'Clásico Blanco', bg: '#FFFFFF', grid: 'rgba(230, 225, 218, 0.65)', wall: '#1C1E21', glow: false }
];

export class Maze {
  constructor(cols = 10, rows = 7, width = 1120, height = 660) {
    this.cols = cols;
    this.rows = rows;
    this.width = width;
    this.height = height;
    this.cellW = width / cols;
    this.cellH = height / rows;
    this.wallThickness = 6;
    this.braidFactor = 0.45;
    
    this.grid = [];
    this.walls = [];
    this.currentBiome = BIOMES[0];
    this.biomeIndex = 0;
    this.generate();
  }

  cycleBiome() {
    this.biomeIndex = 0;
    this.currentBiome = BIOMES[0];
    return this.currentBiome;
  }

  generate(seed = null) {
    let rng = Math.random;
    if (seed !== null) {
      let s = seed % 2147483647;
      if (s <= 0) s += 2147483646;
      rng = () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    }

    this.grid = [];
    this.walls = [];

    // 1. Initialize grid
    for (let x = 0; x < this.cols; x++) {
      this.grid[x] = [];
      for (let y = 0; y < this.rows; y++) {
        this.grid[x][y] = {
          x, y,
          visited: false,
          walls: [true, true, true, true]
        };
      }
    }

    // 2. DFS Maze Generation
    const stack = [];
    const start = this.grid[0][0];
    start.visited = true;
    stack.push(start);
    let visitedCount = 1;
    const totalCells = this.cols * this.rows;

    while (visitedCount < totalCells && stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this._getUnvisitedNeighbors(current);

      if (neighbors.length > 0) {
        const choice = neighbors[Math.floor(rng() * neighbors.length)];
        const next = choice.cell;
        const dir = choice.dir;

        current.walls[dir] = false;
        next.walls[(dir + 2) % 4] = false;

        next.visited = true;
        stack.push(next);
        visitedCount++;
      } else {
        stack.pop();
      }
    }

    // 3. Braiding
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const cell = this.grid[x][y];
        const wallCount = cell.walls.filter(Boolean).length;
        if (wallCount >= 3 || rng() < this.braidFactor) {
          const candidates = [];
          if (y > 0 && cell.walls[0]) candidates.push(0);
          if (x < this.cols - 1 && cell.walls[1]) candidates.push(1);
          if (y < this.rows - 1 && cell.walls[2]) candidates.push(2);
          if (x > 0 && cell.walls[3]) candidates.push(3);

          if (candidates.length > 0) {
            const dir = candidates[Math.floor(rng() * candidates.length)];
            cell.walls[dir] = false;
            if (dir === 0) this.grid[x][y - 1].walls[2] = false;
            if (dir === 1) this.grid[x + 1][y].walls[3] = false;
            if (dir === 2) this.grid[x][y + 1].walls[0] = false;
            if (dir === 3) this.grid[x - 1][y].walls[1] = false;
          }
        }
      }
    }

    this._buildWallSegments();
  }

  _getUnvisitedNeighbors(cell) {
    const neighbors = [];
    const { x, y } = cell;
    if (y > 0 && !this.grid[x][y - 1].visited) neighbors.push({ cell: this.grid[x][y - 1], dir: 0 });
    if (x < this.cols - 1 && !this.grid[x + 1][y].visited) neighbors.push({ cell: this.grid[x + 1][y], dir: 1 });
    if (y < this.rows - 1 && !this.grid[x][y + 1].visited) neighbors.push({ cell: this.grid[x][y + 1], dir: 2 });
    if (x > 0 && !this.grid[x - 1][y].visited) neighbors.push({ cell: this.grid[x - 1][y], dir: 3 });
    return neighbors;
  }

  _buildWallSegments() {
    this.walls = [];

    // Outer Solid Perimeter Box
    this.walls.push({ x1: 0, y1: 0, x2: this.width, y2: 0 });
    this.walls.push({ x1: this.width, y1: 0, x2: this.width, y2: this.height });
    this.walls.push({ x1: this.width, y1: this.height, x2: 0, y2: this.height });
    this.walls.push({ x1: 0, y1: this.height, x2: 0, y2: 0 });

    // Inner Maze Walls
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const cell = this.grid[x][y];
        const x1 = x * this.cellW;
        const y1 = y * this.cellH;
        const x2 = (x + 1) * this.cellW;
        const y2 = (y + 1) * this.cellH;

        if (cell.walls[0] && y > 0) this.walls.push({ x1, y1, x2, y2: y1 });
        if (cell.walls[3] && x > 0) this.walls.push({ x1, y1, x2: x1, y2 });
      }
    }
  }

  render(ctx) {
    const biome = this.currentBiome;

    // 1. Biome Background
    ctx.fillStyle = biome.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Biome Grid & Tactical Coordinates
    ctx.strokeStyle = biome.grid;
    ctx.lineWidth = 1;
    const step = 28;
    ctx.beginPath();
    for (let x = 0; x <= this.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y <= this.height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    // 3. Glowing Aura (if lava/matrix)
    if (biome.glow) {
      ctx.strokeStyle = biome.glowColor;
      ctx.lineWidth = this.wallThickness + 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (const w of this.walls) {
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
      }
      ctx.stroke();
    }

    // 4. Solid Bunker Walls
    ctx.strokeStyle = biome.wall;
    ctx.fillStyle = biome.wall;
    ctx.lineWidth = this.wallThickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (const w of this.walls) {
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
    }
    ctx.stroke();
  }

  getPlayerSpawns(count) {
    const spawns = [];
    const corners = [
      { x: 0, y: 0 },
      { x: this.cols - 1, y: this.rows - 1 },
      { x: this.cols - 1, y: 0 },
      { x: 0, y: this.rows - 1 }
    ];

    for (let i = 0; i < Math.min(count, corners.length); i++) {
      const c = corners[i];
      spawns.push({
        x: (c.x + 0.5) * this.cellW,
        y: (c.y + 0.5) * this.cellH
      });
    }
    return spawns;
  }

  getRandomOpenCell(excludePositions = [], minDistance = 110) {
    const candidates = [];
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const pos = {
          x: (x + 0.5) * this.cellW,
          y: (y + 0.5) * this.cellH
        };
        const tooClose = excludePositions.some(p => {
          const dx = pos.x - p.x;
          const dy = pos.y - p.y;
          return Math.hypot(dx, dy) < minDistance;
        });
        if (!tooClose) candidates.push(pos);
      }
    }
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return {
      x: (Math.floor(Math.random() * this.cols) + 0.5) * this.cellW,
      y: (Math.floor(Math.random() * this.rows) + 0.5) * this.cellH
    };
  }
}
