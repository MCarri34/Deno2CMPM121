import "./style.css";

// App layout
document.body.innerHTML = `
  <div class="app-container">
    <h1>Deno 2: Sticker Sketchpad</h1>
    <canvas id="gameCanvas" width="256" height="256"></canvas>
    <button id="clearButton">Clear Canvas</button>
  </div>
`;

type Point = { x: number; y: number };
type Stroke = Point[];

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Drawing data (display list)
let drawing: Stroke[] = [];
let currentStroke: Stroke = [];
let isDrawing = false;

// Redraw the entire canvas
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  for (const stroke of drawing) {
    if (stroke.length < 2) continue;

    // With noUncheckedIndexedAccess, assert elements exist after our guard:
    const first = stroke[0]!;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < stroke.length; i++) {
      const pt = stroke[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }
}

// Observer: redraw whenever the drawing changes
canvas.addEventListener("drawing-changed", redraw);

// Mouse input -> update model, then dispatch change event
canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  currentStroke = [{ x: event.offsetX, y: event.offsetY }];
  drawing.push(currentStroke);
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

// Clear button: reset model and notify observer
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
clearButton.addEventListener("click", () => {
  drawing = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});
