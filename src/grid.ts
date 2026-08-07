import { Cell } from "./cell";
import { INVALID } from "./invalid.const";
import { Pair } from "./pair";
import { PNeighbours, PressureData } from "./pressure-data";
import { Vec2 } from "./vec";

export class Grid {
  public pressures: Float32Array;
  public solidMap: Array<boolean>;
  public velocities: Pair<number>[]; //to do: flatten it later
  public temp_velocities: Pair<number>[]; //to do: flatten it later

  constructor(
  public width: number,
  public height: number,
  public density: number = 1,
  public timeStep: number = 0.1,
  public cellSize: Vec2 = new Vec2(1,1),
  ) {
    this.pressures = new Float32Array(width * height);
    this.velocities = new Array<Pair<number>>((width+1) * (height+1));
    this.temp_velocities = new Array<Pair<number>>((width+1) * (height+1));
    this.solidMap = new Array<boolean>(this.width* this.height);

    this.initSolidMap();
    const l = this.pressures.length;
    for (let i = 0; i < l; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      const vi = i + y;

      this.velocities[vi] = new Pair(0,0);
      if(x == width-1) {
        this.velocities[vi + 1] = new Pair(INVALID, 0);
      }
      if(y == height - 1) {
        this.velocities[vi + width + 1] = new Pair(0, INVALID);
      }
    }
    this.velocities[width * height + height + width] = new Pair(INVALID, INVALID); 
  }
  // Gets horizontal velocity (U) from the left face of cell(x, y)
  getU(x: number, y: number): number {
    x = Math.max(0, Math.min(x, this.width));
    y = Math.max(0, Math.min(y, this.height - 1));
    const vi = x + y * (this.width + 1);
    return this.velocities[vi].left;
  }

  // Gets vertical velocity (V) from the top face of cell(x, y)
  getV(x: number, y: number): number {
    x = Math.max(0, Math.min(x, this.width - 1));
    y = Math.max(0, Math.min(y, this.height));
    const vi = x + y * (this.width + 1);
    return this.velocities[vi].top;
  }

  sampleU(px: number, py: number): number {
    // U velocities are centered vertically on the face, so we shift Y by 0.5
    const sampleY = py - 0.5;
    
    // Find the 4 neighboring grid points
    const x0 = Math.floor(px);
    const y0 = Math.floor(sampleY);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    // Fractional distances for lerping
    const tx = px - x0;
    const ty = sampleY - y0;

    // Fetch the 4 surrounding U velocities
    const u00 = this.getU(x0, y0);
    const u10 = this.getU(x1, y0);
    const u01 = this.getU(x0, y1);
    const u11 = this.getU(x1, y1);

    // Bilinear interpolation
    const u0 = this.lerp(u00, u10, tx); // Bottom edge
    const u1 = this.lerp(u01, u11, tx); // Top edge
    return this.lerp(u0, u1, ty);       // Vertical blend
  }

  sampleV(px: number, py: number): number {
    // V velocities are centered horizontally on the face, so we shift X by 0.5
    const sampleX = px - 0.5;

    const x0 = Math.floor(sampleX);
    const y0 = Math.floor(py);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const tx = sampleX - x0;
    const ty = py - y0;

    const v00 = this.getV(x0, y0);
    const v10 = this.getV(x1, y0);
    const v01 = this.getV(x0, y1);
    const v11 = this.getV(x1, y1);

    const v0 = this.lerp(v00, v10, tx);
    const v1 = this.lerp(v01, v11, tx);
    return this.lerp(v0, v1, ty);
  }

  sampleBilinear(worldX: number, worldY: number): Pair<number> {
    // Convert world space directly to grid space
    const px = worldX / this.cellSize.x;
    const py = worldY / this.cellSize.y;

    // Sample fields independently
    const vx = this.sampleU(px, py);
    const vy = this.sampleV(px, py);

    // Pair constructor is Pair(top, left), which translates to Pair(V, U).
    // Be careful with this order!
    return new Pair<number>(vy, vx); 
  }

  clamp(num: number, min: number, max: number) { return Math.min(Math.max(num, min), max);}
  clamp01(num: number) {
    return Math.min(Math.max(num, 0), 1);
  }
  lerp(start: number, stop: number, amt: number): number {
    return start + (stop - start) * amt;
  }

  toIndex(x: number, y: number): number {
    return y * this.width + x;
  }

  initSolidMap() {
    for (let i = 0; i < this.width; i++) {
      this.solidMap[i] = true;
      this.solidMap[i + this.width*(this.height - 1)] = true;      
    }

    for (let i = 0; i < this.width * this.height; i+= this.width) {
      this.solidMap[i] = true;
      this.solidMap[i + this.width - 1] = true;      
    }

  }
  
  getDivergence(c: Cell): number {
    const gradientX = (c.r - c.l) / this.cellSize.x ;
    const gradientY = (c.t - c.b) / this.cellSize.y ;

    return gradientX + gradientY;
  }

  static RandomSin(): number {
    return Grid.GetRandom(-1,1);
  }

  static GetRandom(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  isSolid(cellIndex: number): boolean {
    return this.solidMap[cellIndex];
  }

  // todo: getVelocity looks at cell to the right and clamp? 
  iteratePressureUpdates() {
    for (let i = 0; i < 30; i++) {
      this.updatePressures();
    }
  }

  updatePressures() {
    const l = this.pressures.length;
    for (let i = 0; i < l; i++) {
      if (this.isSolid(i)) {
        this.pressures[i] = 0;
        continue;
      }

      const x = i % this.width;
      const y = Math.floor(i / this.width);
      const v = this.getVelocities(i);
      const p = this.getPressures(i, x, y);
      
      const total = p.t.notSolid + p.l.notSolid + p.r.notSolid + p.b.notSolid;
      
      if (total === 0) {
        this.pressures[i] = 0;
        continue;
      }
      const pSum = p.t.val * p.t.notSolid + p.l.val * p.l.notSolid + p.r.val * p.r.notSolid + p.b.val * p.b.notSolid;
      const deltaVelocitySum = v.r * p.r.notSolid - v.l * p.l.notSolid + v.b * p.b.notSolid - v.t * p.t.notSolid; 

      this.pressures[i] = (pSum - this.density * this.cellSize.x * deltaVelocitySum / this.timeStep) / total; 
    }
  }

  updateVelocities() { 
    const K = this.timeStep / (this.cellSize.x * this.density);
    const l = this.pressures.length;
    
    for (let i = 0; i < l; i++) {
      const y = Math.floor(i / this.width);
      const x = i % this.width;
      const vi = i + y;
      
      let vTop = this.velocities[vi].top;
      let vLeft = this.velocities[vi].left;

      const isCurrentSolid = this.isSolid(i);
      const isTopSolid = (y - 1 < 0) || this.isSolid(i - this.width);
      const isLeftSolid = (x - 1 < 0) || this.isSolid(i - 1);

      if (!isCurrentSolid && !isTopSolid) {
        const pc = this.pressures[i];
        const pt = this.pressures[i - this.width];
        vTop -= K * (pc - pt);
      } else {
        vTop = 0; 
      }

      if (!isCurrentSolid && !isLeftSolid) {
        const pc = this.pressures[i];
        const pl = this.pressures[i - 1];
        vLeft -= K * (pc - pl);
      } else {
        vLeft = 0;
      }

      this.velocities[vi] = new Pair(vTop, vLeft);
    }
  }

  advectVelocities() {
    const l = this.pressures.length;    
    for (let i = 0; i < l; i++) {
      const x = i % this.width;
      const y = Math.floor(i / this.width);
      const vi = i + y;

      if (this.isSolid(i)) {
        this.temp_velocities[vi] = new Pair(0, 0);
        continue;
      }

      const isTopSolid = (y - 1 < 0) || this.isSolid(i - this.width);
      const isLeftSolid = (x - 1 < 0) || this.isSolid(i - 1);

      let newLeftVel = 0;
      if (!isLeftSolid) {
        const faceUX = x * this.cellSize.x;
        const faceUY = (y + 0.5) * this.cellSize.y;

        const velAtFaceU = this.sampleBilinear(faceUX, faceUY);
        
        const prevX = faceUX - velAtFaceU.left * this.timeStep;
        const prevY = faceUY - velAtFaceU.top * this.timeStep;

        // sampleU expects grid coordinates, so we divide by cellSize
        newLeftVel = this.sampleU(prevX / this.cellSize.x, prevY / this.cellSize.y);
      }

      let newTopVel = 0;
      if (!isTopSolid) {
        const faceVX = (x + 0.5) * this.cellSize.x;
        const faceVY = y * this.cellSize.y;

        const velAtFaceV = this.sampleBilinear(faceVX, faceVY);

        const prevX = faceVX - velAtFaceV.left * this.timeStep;
        const prevY = faceVY - velAtFaceV.top * this.timeStep;

        newTopVel = this.sampleV(prevX / this.cellSize.x, prevY / this.cellSize.y);
      }

      this.temp_velocities[vi] = new Pair(newTopVel, newLeftVel);
    }

    this.updateVelocitiesFromTemp();
  }

  index: number | null = null;

  updateVelocitiesFromTemp() {
    for (let i = 0; i < this.velocities.length; i++) {
      if (this.temp_velocities[i] === undefined) continue;
        this.velocities[i] = Pair.copy(this.temp_velocities[i]); // todo: make the Pair<> class be copied by default      
    }
  }

  subs(old: Pair<number>, n: Pair<number>): Pair<number> {
    return new Pair<number>(old.top - n.top, old.left - n.left);
  }

  setVelocities(pressureIndex: number, t: number = INVALID, l: number = INVALID, b: number = INVALID, r: number = INVALID) {
    const y = Math.floor(pressureIndex / this.width);
    const vi = pressureIndex + y;
    function orDefault(n: number, def: number): number {
      return n == INVALID ? def : n;
    }
    let copy = this.velocities[vi];
    this.velocities[vi] = new Pair(orDefault(t, copy.top), orDefault(l, copy.left));
    copy = this.velocities[vi + 1];
    this.velocities[vi + 1] = new Pair(copy.top, orDefault(r, copy.left))
    copy = this.velocities[vi + this.width + 1];
    this.velocities[vi + this.width + 1] = new Pair(orDefault(b, copy.top), copy.left)
  }

  getVelocities(pressureIndex: number): Cell {
    const y = Math.floor(pressureIndex / this.width);
    return this.getVelocities_y(pressureIndex, y);
  }

  getVelocities_y(pressureIndex: number, y: number): Cell {
    const vi = pressureIndex + y;
    const t_l = this.velocities[vi];

    const t = t_l.top;
    const l = t_l.left;
    const r = this.velocities[vi + 1].left;
    const b = this.velocities[vi + this.width + 1].top;
    return new Cell(t,l,r,b);
  }


  getPressures(pIndx: number, x: number, y: number): PNeighbours {    
    const t = y-1 >= 0 ? this.getPressure(pIndx - this.width) : PressureData.O;
    const l = x-1 >= 0 ? this.getPressure(pIndx - 1) : PressureData.O;
    const r = x+1 < this.width ? this.getPressure(pIndx + 1) : PressureData.O;
    const b = y+1 < this.height ? this.getPressure(pIndx + this.width) : PressureData.O;
    return new PNeighbours(t,l,r,b);
  }

  getPressure(pIndx: number): PressureData {
    return new PressureData(this.pressures[pIndx], this.isSolid(pIndx) ? 0 : 1);
  }

  // getPressuresxy(pressureIndex: number): Cell {
  //   const x = pressureIndex % this.width;
  //   const y = Math.floor(pressureIndex / this.width);

  //   return this.getPressures(pressureIndex, x, y);
  // }

  getVelocitiesArr(pressureIndex: number): number[] {
    const r = this.getVelocities(pressureIndex);
    return [r.t, r.l, r.r, r.b];
  }
}