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
      <button id="starSticker">⭐</button>
      <button id="catSticker">🐱</button>
      <button id="balloonSticker">🎈</button>
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

// Sticker class (represents a placed emoji)
class Sticker {
  private x: number;
  private y: number;
  private emoji: string;

  constructor(x: number, y: number, emoji: string) {
    this.x = x;
    this.y = y;
    this.emoji = emoji;
  }

  // Move sticker (drag behavior)
  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  // Draw the sticker on the canvas
  display(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

// ToolPreview class (for marker or sticker preview)
class ToolPreview {
  constructor(
    private x: number,
    private y: number,
    private type: "marker" | "sticker",
    private thickness: number,
    private emoji: string | null,
  ) {}

  // Update preview position and type
  update(
    x: number,
    y: number,
    type: "marker" | "sticker",
    thickness: number,
    emoji: string | null,
  ) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.thickness = thickness;
    this.emoji = emoji;
  }

  // Draw the preview shape or sticker
  display(ctx: CanvasRenderingContext2D) {
    if (this.type === "marker") {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "gray";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (this.type === "sticker" && this.emoji) {
      ctx.font = "32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillText(this.emoji, this.x, this.y);
    }
  }
}

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Drawing data (Display List)
let drawing: (MarkerLine | Sticker)[] = []; // All drawn items
let redoStack: (MarkerLine | Sticker)[] = []; // Undone items waiting to be redone
let currentCommand: MarkerLine | Sticker | null = null;
let isDrawing = false;

// Tool data
let currentTool: "marker" | "sticker" = "marker";
let currentThickness = 2; // Default marker thickness
let currentEmoji: string | null = null; // Currently selected sticker
let preview: ToolPreview | null = null; // Preview object

// Button Elements
const thinButton = document.getElementById("thinButton") as HTMLButtonElement;
const thickButton = document.getElementById("thickButton") as HTMLButtonElement;
const starSticker = document.getElementById("starSticker") as HTMLButtonElement;
const catSticker = document.getElementById("catSticker") as HTMLButtonElement;
const balloonSticker = document.getElementById(
  "balloonSticker",
) as HTMLButtonElement;
const undoButton = document.getElementById("undoButton") as HTMLButtonElement;
const redoButton = document.getElementById("redoButton") as HTMLButtonElement;
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;

// Redraw function
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const item of drawing) {
    item.display(ctx);
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
  currentTool = "marker";
  currentThickness = thickness;
  currentEmoji = null;

  thinButton.classList.remove("selectedTool");
  thickButton.classList.remove("selectedTool");
  starSticker.classList.remove("selectedTool");
  catSticker.classList.remove("selectedTool");
  balloonSticker.classList.remove("selectedTool");

  button.classList.add("selectedTool");
  canvas.dispatchEvent(new Event("tool-moved"));
}

// Sticker Selection
function selectSticker(emoji: string, button: HTMLButtonElement) {
  currentTool = "sticker";
  currentEmoji = emoji;

  thinButton.classList.remove("selectedTool");
  thickButton.classList.remove("selectedTool");
  starSticker.classList.remove("selectedTool");
  catSticker.classList.remove("selectedTool");
  balloonSticker.classList.remove("selectedTool");

  button.classList.add("selectedTool");
  canvas.dispatchEvent(new Event("tool-moved"));
}

// Default to thin marker
selectTool(2, thinButton);

// Mouse Input
canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;

  if (currentTool === "marker") {
    currentCommand = new MarkerLine(
      event.offsetX,
      event.offsetY,
      currentThickness,
    );
  } else if (currentTool === "sticker" && currentEmoji) {
    currentCommand = new Sticker(event.offsetX, event.offsetY, currentEmoji);
  }

  if (currentCommand) {
    drawing.push(currentCommand);
    redoStack = [];
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

canvas.addEventListener("mousemove", (event) => {
  // Update or create tool preview
  if (!preview) {
    preview = new ToolPreview(
      event.offsetX,
      event.offsetY,
      currentTool,
      currentThickness,
      currentEmoji,
    );
  } else {
    preview.update(
      event.offsetX,
      event.offsetY,
      currentTool,
      currentThickness,
      currentEmoji,
    );
  }

  // If drawing a marker, extend line; if sticker, move position
  if (isDrawing && currentCommand) {
    currentCommand.drag(event.offsetX, event.offsetY);
    canvas.dispatchEvent(new Event("drawing-changed"));
  } else {
    canvas.dispatchEvent(new Event("tool-moved"));
  }
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  currentCommand = null;
  canvas.dispatchEvent(new Event("tool-moved"));
});

canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
  preview = null;
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
starSticker.addEventListener("click", () => selectSticker("⭐", starSticker));
catSticker.addEventListener("click", () => selectSticker("🐱", catSticker));
balloonSticker.addEventListener(
  "click",
  () => selectSticker("🎈", balloonSticker),
);

// Initialize button states
updateButtonStates();
