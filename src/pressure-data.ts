import { Cell } from "./cell";

export class PressureData {
  constructor(
    public val: number,
    public notSolid: number
  ){}
  static readonly O = new PressureData(0,0);
}

export class PNeighbours {
  constructor(
    public t: PressureData,
    public l: PressureData,
    public r: PressureData,
    public b: PressureData,
  ){}  
}