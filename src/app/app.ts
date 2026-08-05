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

  readonly width = 800;
  readonly height = 800;



  constructor() {
    const grid = new Grid(10, 8);

    afterNextRender(() => {
      const canvas = this.canvas().nativeElement;
    
      canvas.width = this.width;
      canvas.height = this.height;
    
      const ctx = canvas.getContext('2d');
    
      if (!ctx) {
        throw new Error('Could not get 2D rendering context.');
      }
    
      const cellWidth = canvas.width / grid.width;
      const cellHeight = canvas.height / grid.height;
    
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
          const r = ["top", "left", "right", "bottom"];
          grid.getVelocities(index).forEach((element, i) => {
            console.log(r[i] + ": "+ element.toString());
            
          }); 
        }
      });
    });

    
  }
}