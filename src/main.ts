import "./style.css";

// App layout
document.body.innerHTML = `
  <div class="app-container">
    <h1>Doodle Deck</h1>
    <h2>Deno 2: Sticker Sketchpad</h2>
    <canvas id="gameCanvas" width="256" height="256"></canvas>

    <div class="button-row">
      <button id="pencilButton">Fine Pen</button>
      <button id="markerButton">Bold Brush</button>
    </div>

    <div class="button-row">
      <label for="colorSlider">Brush Hue:</label>
      <input type="range" id="colorSlider" min="0" max="360" value="0">
    </div>

    <div class="button-row">
      <label for="rotationSlider">Sticker Rotation:</label>
      <input type="range" id="rotationSlider" min="0" max="360" value="0">
    </div>

    <div id="stickerRow" class="button-row"></div>

    <div class="button-row">
      <button id="addStickerButton">Add Custom Sticker</button>
    </div>

    <div class="button-row">
      <button id="undoButton">Undo</button>
      <button id="redoButton">Redo</button>
      <button id="clearButton">Clear</button>
      <button id="exportButton">Export PNG</button>
    </div>
  </div>
`;

// DoodleLine class (represents one drawn stroke)
class DoodleLine {
  private points: { x: number; y: number }[] = [];
  private thickness: number;
  private color: string;

  constructor(
    startX: number,
    startY: number,
    thickness: number,
    color: string,
  ) {
    this.points.push({ x: startX, y: startY });
    this.thickness = thickness;
    this.color = color;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;
    ctx.beginPath();
    const first = this.points[0]!;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.points.length; i++) {
      const pt = this.points[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

// Sticker class (represents a placed emoji)
class Sticker {
  constructor(
    private x: number,
    private y: number,
    private emoji: string,
    private rotation: number,
  ) {}

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.font = "36px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";
    ctx.globalAlpha = 1.0;
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

// ToolPreview class (for pen or sticker preview)
class ToolPreview {
  constructor(
    private x: number,
    private y: number,
    private type: "pen" | "sticker",
    private thickness: number,
    private emoji: string | null,
    private color: string,
    private rotation: number,
  ) {}

  update(
    x: number,
    y: number,
    type: "pen" | "sticker",
    thickness: number,
    emoji: string | null,
    color: string,
    rotation: number,
  ) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.thickness = thickness;
    this.emoji = emoji;
    this.color = color;
    this.rotation = rotation;
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.type === "pen") {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (this.type === "sticker" && this.emoji) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.font = "36px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.4;
      ctx.fillText(this.emoji, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1.0;
    }
  }
}

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Drawing data (Display List)
let drawing: (DoodleLine | Sticker)[] = [];
let redoStack: (DoodleLine | Sticker)[] = [];
let currentCommand: DoodleLine | Sticker | null = null;
let isDrawing = false;

// Tool data
let currentTool: "pen" | "sticker" = "pen";
let currentThickness = 1.8;
let currentColor = "hsl(0, 100%, 50%)"; // bright red default
let currentRotation = 0;
let currentEmoji: string | null = null;
let preview: ToolPreview | null = null;

// Base sticker set
const stickers: Array<{ emoji: string }> = [
  { emoji: "🌸" },
  { emoji: "🌈" },
  { emoji: "🔥" },
  { emoji: "🐸" },
];

// Buttons and sliders
const pencilButton = document.getElementById(
  "pencilButton",
) as HTMLButtonElement;
const markerButton = document.getElementById(
  "markerButton",
) as HTMLButtonElement;
const stickerRow = document.getElementById("stickerRow") as HTMLDivElement;
const addStickerButton = document.getElementById(
  "addStickerButton",
) as HTMLButtonElement;
const undoButton = document.getElementById("undoButton") as HTMLButtonElement;
const redoButton = document.getElementById("redoButton") as HTMLButtonElement;
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
const exportButton = document.getElementById(
  "exportButton",
) as HTMLButtonElement;
const colorSlider = document.getElementById("colorSlider") as HTMLInputElement;
const rotationSlider = document.getElementById(
  "rotationSlider",
) as HTMLInputElement;

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

// Observer pattern
canvas.addEventListener("drawing-changed", redraw);
canvas.addEventListener("tool-moved", redraw);

// Update undo/redo state
function updateButtonStates() {
  undoButton.disabled = drawing.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

// Tool selection
function selectPen(thickness: number, button: HTMLButtonElement) {
  currentTool = "pen";
  currentThickness = thickness;
  currentEmoji = null;
  clearSelections();
  button.classList.add("selectedTool");
  canvas.dispatchEvent(new Event("tool-moved"));
}

function selectSticker(emoji: string, button: HTMLButtonElement) {
  currentTool = "sticker";
  currentEmoji = emoji;
  clearSelections();
  button.classList.add("selectedTool");
  canvas.dispatchEvent(new Event("tool-moved"));
}

function clearSelections() {
  document.querySelectorAll(".selectedTool").forEach((btn) =>
    btn.classList.remove("selectedTool")
  );
}

// Default to pen
selectPen(1.8, pencilButton);

// Color slider: controls pen hue
colorSlider.addEventListener("input", () => {
  const hue = Number(colorSlider.value);
  currentColor = `hsl(${hue}, 100%, 50%)`;
  canvas.dispatchEvent(new Event("tool-moved"));
});

// Rotation slider: controls sticker rotation
rotationSlider.addEventListener("input", () => {
  const angle = Number(rotationSlider.value);
  currentRotation = angle;
  canvas.dispatchEvent(new Event("tool-moved"));
});

// Mouse input
canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  if (currentTool === "pen") {
    currentCommand = new DoodleLine(
      event.offsetX,
      event.offsetY,
      currentThickness,
      currentColor,
    );
  } else if (currentTool === "sticker" && currentEmoji) {
    currentCommand = new Sticker(
      event.offsetX,
      event.offsetY,
      currentEmoji,
      currentRotation,
    );
  }

  if (currentCommand) {
    drawing.push(currentCommand);
    redoStack = [];
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

canvas.addEventListener("mousemove", (event) => {
  if (!preview) {
    preview = new ToolPreview(
      event.offsetX,
      event.offsetY,
      currentTool,
      currentThickness,
      currentEmoji,
      currentColor,
      currentRotation,
    );
  } else {
    preview.update(
      event.offsetX,
      event.offsetY,
      currentTool,
      currentThickness,
      currentEmoji,
      currentColor,
      currentRotation,
    );
  }

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

// Undo / Redo / Clear
undoButton.addEventListener("click", () => {
  if (!drawing.length) return;
  redoStack.push(drawing.pop()!);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

redoButton.addEventListener("click", () => {
  if (!redoStack.length) return;
  drawing.push(redoStack.pop()!);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

clearButton.addEventListener("click", () => {
  drawing = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// Custom sticker
addStickerButton.addEventListener("click", () => {
  const text = prompt("Enter your custom sticker:", "✨");
  if (text && text.trim()) {
    stickers.push({ emoji: text.trim() });
    renderStickerButtons();
    canvas.dispatchEvent(new Event("tool-moved"));
  }
});

// Export PNG
exportButton.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d")!;
  exportCtx.scale(4, 4);
  for (const item of drawing) item.display(exportCtx);
  const anchor = document.createElement("a");
  anchor.href = exportCanvas.toDataURL("image/png");
  anchor.download = "doodledeck.png";
  anchor.click();
});

// Tool buttons
pencilButton.addEventListener("click", () => selectPen(1.8, pencilButton));
markerButton.addEventListener("click", () => selectPen(5, markerButton));

// Initialize
updateButtonStates();
