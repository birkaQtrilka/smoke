import { Cell } from "./cell";
import { Pair } from "./pair";

export class Grid {
  public pressures: Float32Array;
  public velocities: Pair<number>[]; //to do: flatten it later
  constructor(
  public width: number,
  public height: number,
  ) {
    this.pressures = new Float32Array(width * height);
    this.velocities = new Array<Pair<number>>(width * height * 2);
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
      if( y == height - 1) {
        this.velocities[vi + width + 1] = new Pair(Grid.RandomSin(), invalid);
      }
    }
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
      const c = this.getVelocities(i);

      this.pressures[i] = c.getDivergence(); 
    }
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

  getVelocitiesArr(pressureIndex: number): number[] {
    const r = this.getVelocities(pressureIndex);
    return [r.t, r.l, r.r, r.b];
  }
}