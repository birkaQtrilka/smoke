import {
  Component,
  ElementRef,
  afterNextRender,
  viewChild,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Grid } from '../grid';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  ctx: CanvasRenderingContext2D | undefined;
  readonly width = 800;
  readonly height = 800;
  grid = new Grid(10, 10);
  r = ["top", "left", "right", "bottom"];

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvas().nativeElement;
      const grid = this.grid;
      canvas.width = this.width;
      canvas.height = this.height;
      this.ctx = canvas.getContext('2d') ?? undefined; 
      const ctx = this.ctx;
      console.log(grid.velocities.length);
      console.log(grid.pressures.length);
      
      if (!ctx) {
        throw new Error('Could not get 2D rendering context.');
      }
      const scaleFactor = 0.8;
      
      const offsetX = (canvas.width * (1 - scaleFactor)) / 2;
      const offsetY = (canvas.height * (1 - scaleFactor)) / 2;
    
      const cellWidth = canvas.width / grid.width;
      const cellHeight = canvas.height / grid.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    
      ctx.translate(offsetX, offsetY);
      ctx.scale(scaleFactor, scaleFactor);

      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
      // Clear background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'black';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      grid.updatePressures();

      for (let i = 0; i < grid.pressures.length; i++) {
        const pressure = grid.pressures[i];
      
        const x = i % grid.width;
        const y = Math.floor(i / grid.width);
      
        const px = x * cellWidth;
        const py = y * cellHeight;
      
        ctx.strokeRect(px, py, cellWidth, cellHeight);
      
        ctx.fillText(
          pressure.toFixed(2),
          px + cellWidth / 2,
          py + cellHeight / 2
        );
      }

      this.drawVelocities();

      canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
      
        // Mouse position relative to canvas
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
      
        // Convert to cell coordinates
        const cellX = Math.floor(mouseX / cellWidth);
        const cellY = Math.floor(mouseY / cellHeight);
      
        // Check bounds
        if (
          cellX >= 0 &&
          cellX < grid.width &&
          cellY >= 0 &&
          cellY < grid.height
        ) {
          const index = cellY * grid.width + cellX;
          grid.getVelocitiesArr(index).forEach((element, i) => {
            console.log(this.r[i] + ": "+ element.toFixed(2));
          }); 
        }
      });
    });
  }

  drawVelocities() {
    const grid = this.grid;
    const canvas = this.canvas().nativeElement;
    const ctx = this.ctx;
    
    if (canvas == null || ctx == null) return;
    
    const cellWidth = canvas.width / grid.width;
    const cellHeight = canvas.height / grid.height;

    const vel_w = grid.width + 1;

    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < grid.velocities.length; i++) {
      const v = grid.velocities[i];
      const x = i % vel_w;
      const y = Math.floor(i / vel_w);

      let px = (x + .5) * cellWidth;
      let py = (y) * cellHeight;

      let dy = v.top == Number.MIN_VALUE ? 0 : v.top;

      const scale = 30; 

      const endY = py + dy * scale;

      if (dy !== 0) {
        this.drawArrow(ctx, px, py, px, endY);
      }

      px = x * cellWidth;
      py = (y + .5) * cellHeight;
      let dx = v.left == Number.MIN_VALUE ? 0 : v.left;
      
      const endX = px + dx * scale;

      if (dx !== 0) {
        this.drawArrow(ctx, px, py, endX, py);
      }
    }
  }

  private drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) {
    const headLength = 6; // length of the arrow head in pixels
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(toX, toY);
    ctx.fill();
  }
}