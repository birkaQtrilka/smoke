import { Grid } from "./grid";
import { INVALID } from "./invalid.const";

export const VELOCITY_SCALE = 1;
type drawMode = 'pressure' | 'speed';

export class GridDrawer {
  private readonly ctx: CanvasRenderingContext2D;
  public readonly offsetX: number;
  public readonly offsetY: number;
  public showPressureTxt: boolean = false;
  public showVelocities: boolean = true;
  public showField: boolean = true;
  public drawMode: drawMode = 'pressure';

  constructor(
    private readonly grid: Grid,
    private readonly canvas: HTMLCanvasElement,
    private scaleFactor: number,
  ){
    const ctx = canvas.getContext('2d');
    if(ctx == null) throw new Error('Could not get 2D rendering context.'); 
    this.ctx = ctx; 
    this.offsetX = (canvas.width * (1 - scaleFactor))  * .5;
    this.offsetY = (canvas.height * (1 - scaleFactor)) * .5;
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(scaleFactor, scaleFactor);
  }

  public draw(){
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0,this.canvas.width, this.canvas.height);
    this.ctx.restore();
    switch (this.drawMode) {
      case 'pressure':
        this.drawPressures();
        break;
      
    }
    if(this.showVelocities) this.drawVelocities();
    if(this.showField) this.drawFlow();
  }

  private hexToRgb(hex: string): [number, number, number] {
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  private lerpColor(color1: [number, number, number], color2: [number, number, number], t: number): string {
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } 

  rgbToString(rgb: [number,number,number]): string{
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`; 
  }

  drawPressures() {
    const { grid, ctx } = this;

    const colorNegative = this.hexToRgb('#0ea5e9');
    const colorZero     = this.hexToRgb('#f8fafc');
    const colorPositive = this.hexToRgb('#f43f5e');

    ctx.strokeStyle = 'rgba(0,0,0, 0.2)'; // Softer border color
    ctx.lineWidth = 1;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let maxPressure = 400 * grid.cellSize.x;

    for (let i = 0; i < grid.pressures.length; i++) {
      const pressure = grid.pressures[i];
    
      const x = i % grid.width;
      const y = Math.floor(i / grid.width);
    
      const px = x * grid.cellSize.x;
      const py = y * grid.cellSize.y;
      const intensity = Math.min(Math.abs(pressure) / maxPressure, 1);
      
      if (pressure > 0) {
        ctx.fillStyle = this.lerpColor(colorZero, colorPositive, intensity);
      } else {
        ctx.fillStyle = this.lerpColor(colorZero, colorNegative, intensity);
      }
      if(grid.isSolid(i)) ctx.fillStyle = this.rgbToString(colorNegative);
      // else ctx.fillStyle = this.rgbToString(colorPositive);
      ctx.fillRect(px, py, grid.cellSize.x, grid.cellSize.y);
    
      if(!this.showPressureTxt) continue;
      ctx.fillStyle = '#1e293b';
      ctx.fillText(
        pressure.toFixed(2),
        px + grid.cellSize.x * .5,
        py + grid.cellSize.y * .5
      );
    }
  }

  drawVelocities() {
    const { grid, ctx, canvas } = this;
    
    const cellWidth = canvas.width / grid.width;
    const cellHeight = canvas.height / grid.height;
    const vel_w = grid.width + 1;
    
    
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < grid.velocities.length; i++) {
      const { top, left } = grid.velocities[i];
      
      const x = i % vel_w;
      const y = Math.floor(i / vel_w);

      const dy = top === INVALID ? 0 : top;
      
      const topX = (x + 0.5) * cellWidth;
      const topY = y * cellHeight;
      if (dy !== 0) {
        const endY = topY + dy * VELOCITY_SCALE;
        this.drawArrow(ctx, topX, topY, topX, endY);
      } else {
        this.drawArrow(ctx, topX, topY, topX, topY + 2 * VELOCITY_SCALE, false);
      }

      const dx = left === INVALID ? 0 : left;
      
      const leftX = x * cellWidth;
      const leftY = (y + 0.5) * cellHeight;
      if (dx !== 0) {
        const endX = leftX + dx * VELOCITY_SCALE;
        this.drawArrow(ctx, leftX, leftY, endX, leftY);
      }else {
        this.drawArrow(ctx, leftX, leftY, leftX + 2 * VELOCITY_SCALE, leftY, false);
      }
    }
  }

  drawFlow() {
    const { grid, ctx, canvas } = this;
    
    const vel_w = grid.width * 5;
    const vel_h = grid.height * 5;
    const cellWidth = canvas.width / vel_w;
    const cellHeight = canvas.height / vel_h;
    
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'red';
    ctx.lineWidth = .6;
    for (let y = 0; y < vel_w; y++) {
      for (let x = 0; x < vel_h; x++) {
        const leftX = x * cellWidth;
        const topY = y * cellHeight;
        const vel = grid.sampleBilinear(leftX, topY);
        const {x: end, y: end2} = this.clampVectorLength(vel.left , vel.top , 10);
        const endX = leftX + end * VELOCITY_SCALE;
        const endY = topY + end2 * VELOCITY_SCALE;

        this.drawArrow(ctx, leftX, topY, endX, endY, false);
      }
    }
       
  }

  clampVectorLength(x: number, y: number, maxLength: number): { x: number; y: number } {
  const length = Math.sqrt(x * x + y * y);
  
  if (length > maxLength && length > 0) {
    const scale = maxLength / length;
    return { 
      x: x * scale, 
      y: y * scale 
    };
  }
  
  return { x, y };
}

  private drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, head: boolean = true) {
    const headLength = 6; // length of the arrow head in pixels
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    if(!head) return;

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(toX, toY);
    ctx.fill();
  }
}