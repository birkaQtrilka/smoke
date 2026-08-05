import { Pair } from "./pair";
import { Vec2 } from "./vec";

export class Grid {
  public pressures: Float32Array;
  public velocities: Pair<Vec2>[]; //to do: flatten it later
  constructor(
  public width: number,
  public height: number,
  ) {
    this.pressures = new Float32Array(width * height);
    this.velocities = new Array<Pair<Vec2>>(width * height * 2);
    const invalid = new Vec2(Number.MIN_VALUE, Number.MIN_VALUE);

    const l = this.pressures.length;
    for (let i = 0; i < l; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      const vi = i + y;

      this.velocities[vi] = new Pair(Vec2.RandomSin(), Vec2.RandomSin());
      if(x == width-1) {
        this.velocities[vi + 1] = new Pair(invalid, Vec2.RandomSin()); // min value means invalid
      }
      if( y == height - 1) {
        this.velocities[vi + width + 1] = new Pair(Vec2.RandomSin(), invalid);
      }
    }
  }

  updatePressures(){
    const l = this.pressures.length;
    for (let i = 0; i < l; i++) {
      const x = i % this.width;
      const y = Math.floor(i / this.width);
      const vi = i + y;

      const t_l = this.velocities[vi];
      const t = t_l.top;
      const l = t_l.left;
      const r = this.velocities[vi + 1].left;
      const b = this.velocities[vi + this.width + 1].top;

      this.pressures[i] = t.len() + l.len() + b.len() + r.len(); 
    }
  }

  getVelocities(pressureIndex: number): Vec2[] {
    const x = pressureIndex % this.width;
    const y = Math.floor(pressureIndex / this.width);
    const vi = pressureIndex + y;
    const t_l = this.velocities[vi];
    const t = t_l.top;
    const l = t_l.left;
    const r = this.velocities[vi + 1].left;
    const b = this.velocities[vi + this.width + 1].top;

    return [t,l,r,b]
  }

}