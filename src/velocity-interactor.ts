import { Grid } from "./grid";
import { INVALID } from "./invalid.const";

export class VelocityInteractor {
  private isDragging = false;
  private activeEdge: { pressureIndex: number, type: 't' | 'l' | 'b' | 'r' } | null = null;
  private lastMousePos: { x: number, y: number } | null = null;
  
  // Max distance from edge center to click (in scaled pixels)
  private readonly interactionRadius = 15; 
  private readonly VELOCITY_SCALE = 30; // Matches your drawing scale

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
    const pos = this.getAdjustedPos(e);
    const cellX = Math.floor(pos.x / this.grid.cellSize.x);
    const cellY = Math.floor(pos.y / this.grid.cellSize.y);

    if (cellX < 0 || cellX >= this.grid.width || cellY < 0 || cellY >= this.grid.height) return;

    const cx = cellX * this.grid.cellSize.x;
    const cy = cellY * this.grid.cellSize.y;
    const cw = this.grid.cellSize.x;
    const ch = this.grid.cellSize.y;

    // Define center points for the 4 edges of the current cell
    const edges = [
      { type: 't', x: cx + cw / 2, y: cy },
      { type: 'l', x: cx, y: cy + ch / 2 },
      { type: 'b', x: cx + cw / 2, y: cy + ch },
      { type: 'r', x: cx + cw, y: cy + ch / 2 }
    ];

    let closestEdge = null;
    let minDistance = Infinity;

    for (const edge of edges) {
      const dx = pos.x - edge.x;
      const dy = pos.y - edge.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
        closestEdge = edge;
      }
    }

    if (minDistance <= this.interactionRadius && closestEdge) {
      this.isDragging = true;
      this.activeEdge = {
        pressureIndex: cellY * this.grid.width + cellX,
        type: closestEdge.type as 't' | 'l' | 'b' | 'r'
      };
      this.lastMousePos = pos;
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging || !this.activeEdge || !this.lastMousePos) return;

    const pos = this.getAdjustedPos(e);
    const deltaX = pos.x - this.lastMousePos.x;
    const deltaY = pos.y - this.lastMousePos.y;
    this.lastMousePos = pos;

    const pIndex = this.activeEdge.pressureIndex;
    const y = Math.floor(pIndex / this.grid.width);
    const vi = pIndex + y;

    // Use INVALID to preserve untouched values inside your setVelocities method
    let t = INVALID, l = INVALID, b = INVALID, r = INVALID;

    // Add delta scaled down by drawing scale so the arrow perfectly follows the cursor
    if (this.activeEdge.type === 't') {
      t = this.grid.velocities[vi].top + (deltaY / this.VELOCITY_SCALE);
    } else if (this.activeEdge.type === 'l') {
      l = this.grid.velocities[vi].left + (deltaX / this.VELOCITY_SCALE);
    } else if (this.activeEdge.type === 'b') {
      b = this.grid.velocities[vi + this.grid.width + 1].top + (deltaY / this.VELOCITY_SCALE);
    } else if (this.activeEdge.type === 'r') {
      r = this.grid.velocities[vi + 1].left + (deltaX / this.VELOCITY_SCALE);
    }

    // Call your implemented method on the grid
    this.grid.setVelocities(pIndex, t, l, b, r);
  }

  private onMouseUp = () => {
    this.isDragging = false;
    this.activeEdge = null;
    this.lastMousePos = null;
  }
}
