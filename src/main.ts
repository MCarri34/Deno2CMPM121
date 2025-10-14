import "./style.css";

// Create the basic app structure
document.body.innerHTML = `
  <div class="app-container">
    <h1>Deno 2: Sticker Sketchpad</h1>
    <canvas id="gameCanvas" width="256" height="256"></canvas>
    <button id="clearButton">Clear Canvas</button>
  </div>
`;

// Grab canvas and context
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if (!ctx) {
  console.error("Canvas rendering context not found!");
  throw new Error("Canvas context initialization failed");
}

// Drawing state variables
let isDrawing = false;

// Handle mouse down (start drawing)
canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  ctx.beginPath();
  ctx.moveTo(event.offsetX, event.offsetY);
});

// Handle mouse move (draw line)
canvas.addEventListener("mousemove", (event) => {
  if (!isDrawing) return;
  ctx.lineTo(event.offsetX, event.offsetY);
  ctx.strokeStyle = "black"; // simple black marker
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.stroke();
});

// Handle mouse up and leave (stop drawing)
canvas.addEventListener("mouseup", () => {
  isDrawing = false;
});
canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
});

// Clear canvas button logic
const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
