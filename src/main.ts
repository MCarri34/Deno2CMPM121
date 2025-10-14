import "./style.css";

// Create the initial non-interactive UI layout
document.body.innerHTML = `
  <div class="app-container">
    <h1>Deno 2: Sticker Sketchpad</h1>
    <canvas id="gameCanvas" width="256" height="256"></canvas>
  </div>
`;

// Verify the canvas exists
const canvas = document.getElementById("gameCanvas") as
  | HTMLCanvasElement
  | null;
if (!canvas) {
  console.error("Canvas element not found!");
} else {
  console.log("Canvas initialized successfully:", canvas);
}
