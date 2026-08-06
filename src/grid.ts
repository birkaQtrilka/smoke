import { Cell } from "./cell";
import { INVALID } from "./invalid.const";
import { Pair } from "./pair";
import { PNeighbours, PressureData } from "./pressure-data";
import { Vec2 } from "./vec";

export class Grid {
  public pressures: Float32Array;
  public solidMap: Array<boolean>;
  public velocities: Pair<number>[]; //to do: flatten it later


  constructor(
  public width: number,
  public height: number,
  public density: number = 1,
  public timeStep: number = 0.1,
  public cellSize: Vec2 = new Vec2(1,1),
  ) {
    this.pressures = new Float32Array(width * height);
    this.velocities = new Array<Pair<number>>((width+1) * (height+1));
    this.solidMap = new Array<boolean>(this.width* this.height);

    this.initSolidMap();
    const l = this.pressures.length;
    for (let i = 0; i < l; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      const vi = i + y;

      this.velocities[vi] = new Pair(Grid.RandomSin(), Grid.RandomSin());
      if(x == width-1) {
        this.velocities[vi + 1] = new Pair(INVALID, 0);
      }
      if(y == height - 1) {
        this.velocities[vi + width + 1] = new Pair(0, INVALID);
      }
    }
    this.velocities[width * height + height + width] = new Pair(INVALID, INVALID); 
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

  //todo: get velocity looks at cell to the right and clamp? 

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