import "./style.css";

// App layout
document.body.innerHTML = `
  <div class="app-container">
    <h1>Deno 2: Sticker Sketchpad</h1>
    <canvas id="gameCanvas" width="256" height="256"></canvas>
    <div class="button-row">
      <button id="undoButton">Undo</button>
      <button id="redoButton">Redo</button>
      <button id="clearButton">Clear Canvas</button>
    </div>
  </div>
`;

// MarkerLine class (represents one drawn stroke)
class MarkerLine {
  private points: { x: number; y: number }[] = [];

  constructor(startX: number, startY: number) {
    this.points.push({ x: startX, y: startY });
  }

  // Extend the line with a new point
  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  // Draw the line on the canvas
  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;

    ctx.beginPath();
    const first = this.points[0]!;
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < this.points.length; i++) {
      const pt = this.points[i]!;
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Drawing data (Display List)
let drawing: MarkerLine[] = []; // All finished lines
let redoStack: MarkerLine[] = []; // Undone lines waiting to be redone
let currentLine: MarkerLine | null = null;
let isDrawing = false;

// Button Elements
const undoButton = document.getElementById("undoButton") as HTMLButtonElement;
const redoButton = document.getElementById("redoButton") as HTMLButtonElement;
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;

// Redraw function
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const line of drawing) {
    line.display(ctx);
  }
  updateButtonStates();
}

// Observer pattern: redraw on event
canvas.addEventListener("drawing-changed", redraw);

// Mouse Input
canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  currentLine = new MarkerLine(event.offsetX, event.offsetY);
  drawing.push(currentLine);
  redoStack = []; // Clear redo history once a new line begins
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (event) => {
  if (!isDrawing || !currentLine) return;
  currentLine.drag(event.offsetX, event.offsetY);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  currentLine = null;
});

canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
  currentLine = null;
});

// Undo & Redo Logic
undoButton.addEventListener("click", () => {
  if (drawing.length === 0) return;
  const undone = drawing.pop()!;
  redoStack.push(undone);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

redoButton.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  const redone = redoStack.pop()!;
  drawing.push(redone);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// Clear Canvas
clearButton.addEventListener("click", () => {
  drawing = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// Enable/disable undo and redo buttons
function updateButtonStates() {
  undoButton.disabled = drawing.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

// Initialize button states
updateButtonStates();
