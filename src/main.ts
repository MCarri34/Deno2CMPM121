import "./style.css";

// App layout
document.body.innerHTML = `
  <div class="app-container">
    <h1>Deno 2: Sticker Sketchpad</h1>
    <canvas id="gameCanvas" width="256" height="256"></canvas>
    <div class="button-row">
      <button id="thinButton">Thin Marker</button>
      <button id="thickButton">Thick Marker</button>
    </div>
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
  private thickness: number;

  constructor(startX: number, startY: number, thickness: number) {
    this.points.push({ x: startX, y: startY });
    this.thickness = thickness;
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
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

// ToolPreview class (represents the floating marker preview)
class ToolPreview {
  constructor(
    private x: number,
    private y: number,
    private thickness: number,
  ) {}

  // Update preview position and thickness
  update(x: number, y: number, thickness: number) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
  }

  // Draw the preview circle on the canvas
  display(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 1;
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

// Tool data
let currentThickness = 2; // Default to thin marker
let preview: ToolPreview | null = null; // Current tool preview object

// Button Elements
const thinButton = document.getElementById("thinButton") as HTMLButtonElement;
const thickButton = document.getElementById("thickButton") as HTMLButtonElement;
const undoButton = document.getElementById("undoButton") as HTMLButtonElement;
const redoButton = document.getElementById("redoButton") as HTMLButtonElement;
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;

// Redraw function
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const line of drawing) {
    line.display(ctx);
  }

  // Draw tool preview if available and not drawing
  if (!isDrawing && preview) {
    preview.display(ctx);
  }

  updateButtonStates();
}

// Observer pattern: redraw on event
canvas.addEventListener("drawing-changed", redraw);
canvas.addEventListener("tool-moved", redraw);

// Enable/disable undo and redo buttons
function updateButtonStates() {
  undoButton.disabled = drawing.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

// Tool Selection
function selectTool(thickness: number, button: HTMLButtonElement) {
  currentThickness = thickness;

  // Remove selection from all tool buttons
  thinButton.classList.remove("selectedTool");
  thickButton.classList.remove("selectedTool");

  // Highlight the active one
  button.classList.add("selectedTool");
}

// Default to thin marker
selectTool(2, thinButton);

// Mouse Input
canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  currentLine = new MarkerLine(event.offsetX, event.offsetY, currentThickness);
  drawing.push(currentLine);
  redoStack = []; // Clear redo history once a new line begins
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (event) => {
  // Update or create tool preview
  if (!preview) {
    preview = new ToolPreview(event.offsetX, event.offsetY, currentThickness);
  } else {
    preview.update(event.offsetX, event.offsetY, currentThickness);
  }

  // If drawing, add points to current line
  if (isDrawing && currentLine) {
    currentLine.drag(event.offsetX, event.offsetY);
    canvas.dispatchEvent(new Event("drawing-changed"));
  } else {
    // Otherwise, just move the tool preview
    canvas.dispatchEvent(new Event("tool-moved"));
  }
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  currentLine = null;
  canvas.dispatchEvent(new Event("tool-moved"));
});

canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
  preview = null; // Hide preview when mouse leaves the canvas
  canvas.dispatchEvent(new Event("drawing-changed"));
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

// Tool Button Events
thinButton.addEventListener("click", () => selectTool(2, thinButton));
thickButton.addEventListener("click", () => selectTool(6, thickButton));

// Initialize button states
updateButtonStates();
