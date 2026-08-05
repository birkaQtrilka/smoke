import { Cell } from "./cell";
import { Pair } from "./pair";
import { Vec2 } from "./vec";

export class Grid {
  public pressures: Float32Array;
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
    const invalid =  Number.MIN_VALUE;

    const l = this.pressures.length;
    for (let i = 0; i < l; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      const vi = i + y;

      this.velocities[vi] = new Pair(Grid.RandomSin(), Grid.RandomSin());
      if(x == width-1) {
        this.velocities[vi + 1] = new Pair(invalid, Grid.RandomSin()); // min value means invalid
      }
      if(y == height - 1) {
        this.velocities[vi + width + 1] = new Pair(Grid.RandomSin(), invalid);
      }
    }
    this.velocities[width * height + height + width] = new Pair(invalid, invalid); 
    // console.log("Last element: " +(width * height + height + width));
    
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

  updatePressures(){
    const l = this.pressures.length;
    for (let i = 0; i < l; i++) {
      const v = this.getVelocities(i);
      const p = this.getPressures(i);

      const pSum = p.t + p.l + p.r + p.b;
      const deltaVelocitySum = v.r - v.l + v.t - v.b; 
      // to do: figure out what needs to change for varied cellsize
      this.pressures[i] = (pSum - this.density * this.cellSize.x * deltaVelocitySum / this.timeStep) *.25; 
    }
  }

  setVelocities(pressureIndex: number, t: number = Number.MIN_VALUE, l: number = Number.MIN_VALUE, b: number = Number.MIN_VALUE, r: number = Number.MIN_VALUE) {
    const y = Math.floor(pressureIndex / this.width);
    const vi = pressureIndex + y;
    function orDefault(n: number, def: number): number {
      return n == Number.MIN_VALUE ? def : n;
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

  getPressures(pressureIndex: number): Cell {
    const x = pressureIndex % this.width;
    const y = Math.floor(pressureIndex / this.width);

    const t = y-1 > 0 ? this.pressures[pressureIndex - this.width] : 0;
    const l = x-1 > 0 ? this.pressures[pressureIndex - 1] : 0;
    const r = x+1 < this.width ? this.pressures[pressureIndex + 1] : 0;
    const b = y+1 < this.height ? this.pressures[pressureIndex + this.width] : 0;
    return new Cell(t,l,r,b);
  }

  getVelocitiesArr(pressureIndex: number): number[] {
    const r = this.getVelocities(pressureIndex);
    return [r.t, r.l, r.r, r.b];
  }

}