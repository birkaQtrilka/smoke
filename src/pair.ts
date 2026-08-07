export class Pair<T> {
  constructor(
    public top: T,
    public left: T,
  ){

  }
  static copy<T>(p: Pair<T>): Pair<T> {
    return new Pair(p.top, p.left);
  }
}