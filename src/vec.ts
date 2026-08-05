export class Vec2 {
  constructor(
    public x: number,
    public y: number,
  )
  {
    
  }

  static GetRandom(min: number, max: number): Vec2 {
    return new Vec2(
      Math.random() * (max - min) + min,
      Math.random() * (max - min) + min
    );
  }

  static RandomSin(): Vec2 {
    return Vec2.GetRandom(-1,1);
  }

  len(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y); 
  }

  toString() {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`
  }

  static readonly Zero: Vec2 = new Vec2(0,0);
}