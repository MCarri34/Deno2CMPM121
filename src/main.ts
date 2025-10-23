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

    <div id="stickerRow" class="button-row"></div>

    <div class="button-row">
      <button id="addStickerButton">Add Custom Sticker</button>
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
  constructor(private x: number, private y: number, private emoji: string) {}

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

  // Update preview position and tool info
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
      ctx.fillStyle = "black"; // made preview opaque
      ctx.fillText(this.emoji, this.x, this.y);
    }
  }
}

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Drawing data (Display List)
let drawing: (MarkerLine | Sticker)[] = [];
let redoStack: (MarkerLine | Sticker)[] = [];
let currentCommand: MarkerLine | Sticker | null = null;
let isDrawing = false;

// Tool data
let currentTool: "marker" | "sticker" = "marker";
let currentThickness = 2;
let currentEmoji: string | null = null;
let preview: ToolPreview | null = null;

// Base stickers list (data-driven)
const stickers: Array<{ emoji: string }> = [
  { emoji: "⭐" },
  { emoji: "🐱" },
  { emoji: "🎈" },
];

// Button Elements
const thinButton = document.getElementById("thinButton") as HTMLButtonElement;
const thickButton = document.getElementById("thickButton") as HTMLButtonElement;
const stickerRow = document.getElementById("stickerRow") as HTMLDivElement;
const addStickerButton = document.getElementById(
  "addStickerButton",
) as HTMLButtonElement;
const undoButton = document.getElementById("undoButton") as HTMLButtonElement;
const redoButton = document.getElementById("redoButton") as HTMLButtonElement;
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;

// Dynamically create sticker buttons
function renderStickerButtons() {
  stickerRow.innerHTML = "";
  stickers.forEach((s) => {
    const btn = document.createElement("button");
    btn.textContent = s.emoji;
    btn.addEventListener("click", () => selectSticker(s.emoji, btn));
    stickerRow.appendChild(btn);
  });
}
renderStickerButtons();

// Redraw function
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const item of drawing) item.display(ctx);
  if (!isDrawing && preview) preview.display(ctx);
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

  clearSelections();
  button.classList.add("selectedTool");
  canvas.dispatchEvent(new Event("tool-moved"));
}

// Sticker Selection
function selectSticker(emoji: string, button: HTMLButtonElement) {
  currentTool = "sticker";
  currentEmoji = emoji;

  clearSelections();
  button.classList.add("selectedTool");
  canvas.dispatchEvent(new Event("tool-moved"));
}

// Clear all tool button selections
function clearSelections() {
  document.querySelectorAll(".selectedTool").forEach((btn) =>
    btn.classList.remove("selectedTool")
  );
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

// Custom Sticker Button
addStickerButton.addEventListener("click", () => {
  const text = prompt("Enter your custom sticker:", "🧽");
  if (text && text.trim() !== "") {
    stickers.push({ emoji: text.trim() });
    renderStickerButtons();
    canvas.dispatchEvent(new Event("tool-moved"));
  }
});

// Tool Button Events
thinButton.addEventListener("click", () => selectTool(2, thinButton));
thickButton.addEventListener("click", () => selectTool(6, thickButton));

// Initialize button states
updateButtonStates();
