import {
  Component,
  ElementRef,
  afterNextRender,
  viewChild,
} from '@angular/core';
import { Grid } from '../grid';
import { Vec2 } from '../vec';
import { VelocityInteractor } from '../velocity-interactor';
import { GridDrawer } from '../drawer';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  ctx: CanvasRenderingContext2D | undefined;
  readonly width = 900;
  readonly height = 900;
  readonly timeStep = 0.001;
  readonly density = 1;
  interactor: VelocityInteractor | null = null; 
  
  r = ["top", "left", "right", "bottom"];
  grid: Grid | null = null;
  drawer: GridDrawer | undefined;

  solver = true;
  advect = true;
  
  constructor() {
    afterNextRender(() => {
      const canvas = this.canvas().nativeElement;
      canvas.width = this.width;
      canvas.height = this.height;

      const scaleFactor = 1;
      
      this.grid = new Grid(30, 30, this.density, this.timeStep);
      this.grid.cellSize = new Vec2(canvas.width / this.grid.width, canvas.height / this.grid.height);
      const grid = this.grid;

      this.drawer = new GridDrawer(grid,canvas, scaleFactor);      

      this.interactor = new VelocityInteractor(canvas, grid, this.drawer.offsetX, this.drawer.offsetY, scaleFactor);
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
          this.interactor?.applyVelocities();
          if(this.solver) grid.iteratePressureUpdates();
          grid.updateVelocities();

          if(this.advect) grid.advectVelocities();
          accumulator -= fixedTimeStepMs;
          simulationUpdated = true;
        }

        if (simulationUpdated) {
          this.drawer?.draw();
        }
      };

      requestAnimationFrame(render);
    });
  }

  getDrawer(): GridDrawer {
    if(!this.drawer) throw new Error("grid not initialized");

    return this.drawer;
  }
}