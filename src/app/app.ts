import {
  Component,
  ElementRef,
  afterNextRender,
  viewChild,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Grid } from '../grid';
import { Vec2 } from '../vec';
import { VelocityInteractor } from '../velocity-interactor';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  ctx: CanvasRenderingContext2D | undefined;
  readonly width = 800;
  readonly height = 800;
  readonly timeStep = 0.1;
  readonly density = 1;
  interactor: VelocityInteractor | null = null; 
  
  r = ["top", "left", "right", "bottom"];
  grid: Grid | null = null;

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvas().nativeElement;
      canvas.width = this.width;
      canvas.height = this.height;

      this.ctx = canvas.getContext('2d') ?? undefined; 
      const ctx = this.ctx;
      
      if (!ctx) {
        throw new Error('Could not get 2D rendering context.');
      }
      
      const scaleFactor = 0.8;
      const offsetX = (canvas.width * (1 - scaleFactor))  * .5;
      const offsetY = (canvas.height * (1 - scaleFactor)) * .5;
      
      this.grid = new Grid(10, 10, this.density, this.timeStep);
      this.grid.cellSize = new Vec2(canvas.width / this.grid.width, canvas.height / this.grid.height);
      const grid = this.grid;
    
      ctx.translate(offsetX, offsetY);
      ctx.scale(scaleFactor, scaleFactor);
       this.interactor = new VelocityInteractor(canvas, grid, offsetX, offsetY, scaleFactor);
      this.interactor.attach();
      

      let lastTime = 0;
      let accumulator = 0;
      
      const fixedTimeStepMs = this.timeStep * 1000; 

      const render = (currentTime: number) => {
        requestAnimationFrame(render);

        if (lastTime === 0) {
          lastTime = currentTime;
        }

        let deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        if (deltaTime > 250) {
          deltaTime = 250; 
        }

        accumulator += deltaTime;

        let simulationUpdated = false;

        while (accumulator >= fixedTimeStepMs) {
          for (let i = 0; i < 5; i++) {
            grid.updatePressures();
          }
          
          accumulator -= fixedTimeStepMs;
          simulationUpdated = true;
        }

        if (simulationUpdated) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();

          this.drawVelocities();
          this.drawPressures();
        }
      };

      requestAnimationFrame(render);
    });
  }

  drawPressures() {
    const canvas = this.canvas()?.nativeElement;
    const { grid, ctx } = this;
    
    if (!canvas || !ctx || !grid) return;

    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    ctx.lineWidth = 1;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < grid.pressures.length; i++) {
        const pressure = grid.pressures[i];
      
        const x = i % grid.width;
        const y = Math.floor(i / grid.width);
      
        const px = x * grid.cellSize.x;
        const py = y * grid.cellSize.y;
      
        ctx.strokeRect(px, py, grid.cellSize.x, grid.cellSize.y);
      
        ctx.fillText(
          pressure.toFixed(2),
          px + grid.cellSize.x * .5,
          py + grid.cellSize.y * .5
        );
      }
  }

  drawVelocities() {
    const canvas = this.canvas()?.nativeElement;
    const { grid, ctx } = this;
    
    if (!canvas || !ctx || !grid) return;
    
    const cellWidth = canvas.width / grid.width;
    const cellHeight = canvas.height / grid.height;
    const vel_w = grid.width + 1;
    
    const VELOCITY_SCALE = 30;
    
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < grid.velocities.length; i++) {
      const { top, left } = grid.velocities[i];
      
      const x = i % vel_w;
      const y = Math.floor(i / vel_w);

      const dy = top === Number.MIN_VALUE ? 0 : top;
      
      if (dy !== 0) {
        const topX = (x + 0.5) * cellWidth;
        const topY = y * cellHeight;
        const endY = topY + dy * VELOCITY_SCALE;
        
        this.drawArrow(ctx, topX, topY, topX, endY);
      }

      const dx = left === Number.MIN_VALUE ? 0 : left;
      
      if (dx !== 0) {
        const leftX = x * cellWidth;
        const leftY = (y + 0.5) * cellHeight;
        const endX = leftX + dx * VELOCITY_SCALE;
        
        this.drawArrow(ctx, leftX, leftY, endX, leftY);
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