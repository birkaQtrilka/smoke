import { Grid } from "./grid";
import { INVALID } from "./invalid.const";
import { Queue } from "./queue";

export class VelocityInteractor {
  private isDragging = false;
  private lastMousePos: { x: number, y: number } | null = null;
  private q: Queue<{ i: number, t: number, l: number, b: number, r: number }> = new Queue();
  // Radius of the brush (in scaled pixels)
  private readonly brushRadius = 30; // Increased radius to act as a proper brush

  constructor(
    private canvas: HTMLCanvasElement,
    private grid: Grid,
    private offsetX: number,
    private offsetY: number,
    private scaleFactor: number
  ) {}

  attach() {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  detach() {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  private getAdjustedPos(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    return {
      x: (mouseX - this.offsetX) / this.scaleFactor,
      y: (mouseY - this.offsetY) / this.scaleFactor
    };
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.lastMousePos = this.getAdjustedPos(e);
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging || !this.lastMousePos) return;

    const pos = this.getAdjustedPos(e);
    const deltaX = pos.x - this.lastMousePos.x;
    const deltaY = pos.y - this.lastMousePos.y;
    this.lastMousePos = pos;

    // Prevent unnecessary loops if the mouse didn't actually move
    if (deltaX === 0 && deltaY === 0) return; 

    const cw = this.grid.cellSize.x;
    const ch = this.grid.cellSize.y;

    // Calculate a bounding box of cells to avoid checking the entire grid
    const minX = Math.max(0, Math.floor((pos.x - this.brushRadius) / cw));
    const maxX = Math.min(this.grid.width - 1, Math.floor((pos.x + this.brushRadius) / cw));
    const minY = Math.max(0, Math.floor((pos.y - this.brushRadius) / ch));
    const maxY = Math.min(this.grid.height - 1, Math.floor((pos.y + this.brushRadius) / ch));

    const forceX = deltaX * 3;
    const forceY = deltaY * 3;

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const pIndex = cy * this.grid.width + cx;
        const cellX_px = cx * cw;
        const cellY_px = cy * ch;

        // Define center points for the 4 edges of the current cell
        const edges = {
          t: { x: cellX_px + cw / 2, y: cellY_px },
          l: { x: cellX_px, y: cellY_px + ch / 2 },
          b: { x: cellX_px + cw / 2, y: cellY_px + ch },
          r: { x: cellX_px + cw, y: cellY_px + ch / 2 }
        };

        const velocities = this.grid.getVelocities(pIndex);
        let t = INVALID, l = INVALID, b = INVALID, r = INVALID;
        let changed = false;

        // Linear falloff helper: 1 at the center of the brush, scaling down to 0 at the edge
        const getFalloff = (edgeX: number, edgeY: number) => {
          const dist = Math.sqrt((pos.x - edgeX) ** 2 + (pos.y - edgeY) ** 2);
          return dist < this.brushRadius ? 1 - (dist / this.brushRadius) : 0;
        };

        // Y-axis Velocities
        const falloffT = getFalloff(edges.t.x, edges.t.y);
        if (falloffT > 0) {
          t = velocities.t + forceY * falloffT;
          changed = true;
        }

        const falloffB = getFalloff(edges.b.x, edges.b.y);
        if (falloffB > 0) {
          b = velocities.b + forceY * falloffB;
          changed = true;
        }

        // X-axis Velocities
        const falloffL = getFalloff(edges.l.x, edges.l.y);
        if (falloffL > 0) {
          l = velocities.l + forceX * falloffL;
          changed = true;
        }

        const falloffR = getFalloff(edges.r.x, edges.r.y);
        if (falloffR > 0) {
          r = velocities.r + forceX * falloffR;
          changed = true;
        }

        // Update the grid cell only if it was affected by the brush
        if (changed) {
          this.q.enqueue({i: pIndex, t, l, b, r})
        }
      }
    }
  }

  public applyVelocities(){
    while(!this.q.isEmpty()) {
      const data = this.q.dequeue();
      if(!data) continue;
      this.grid.setVelocities(data.i,data.t, data.l, data.b, data.r);
    }
  }

  private onMouseUp = () => {
    this.isDragging = false;
    this.lastMousePos = null;
  }
}
