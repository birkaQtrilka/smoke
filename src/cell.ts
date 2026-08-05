import { Vec2 } from "./vec";

export class Cell{
  constructor(
    public t: number,
    public l: number,
    public r: number,
    public b: number,
    public cellSize: number = 1,
  ){}

  getDivergence(): number {
    const gradientX = (this.r - this.l) / this.cellSize ;
    const gradientY = (this.t - this.b) / this.cellSize ;

    return gradientX + gradientY;
  }
}