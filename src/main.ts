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

type Point = { x: number; y: number };
type Stroke = Point[];

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Drawing data
let drawing: Stroke[] = [];
let redoStack: Stroke[] = [];
let currentStroke: Stroke = [];
let isDrawing = false;

// Buttons
const undoButton = document.getElementById("undoButton") as HTMLButtonElement;
const redoButton = document.getElementById("redoButton") as HTMLButtonElement;
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;

// Helper: redraw everything
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  for (const stroke of drawing) {
    if (stroke.length < 2) continue;
    const first = stroke[0]!;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < stroke.length; i++) {
      const pt = stroke[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  updateButtonStates();
}

// Observer: redraw when changed
canvas.addEventListener("drawing-changed", redraw);

// Helper: update Undo/Redo button state
function updateButtonStates() {
  undoButton.disabled = drawing.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

// Mouse input
canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  currentStroke = [{ x: event.offsetX, y: event.offsetY }];
  drawing.push(currentStroke);
  redoStack = []; // clear redo history when new stroke begins
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mousemove", (event) => {
  if (!isDrawing) return;
  currentStroke.push({ x: event.offsetX, y: event.offsetY });
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
});

canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
});

// Undo / Redo / Clear
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

clearButton.addEventListener("click", () => {
  drawing = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// Initialize button state on load
updateButtonStates();
