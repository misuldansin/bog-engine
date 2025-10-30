import type { GameSettings } from "./types";

import { Settings } from "./settings";
import { loadParticleData } from "./loader";
import { Renderer } from "./io/renderer";
import { Engine } from "./core/engine";
import { InputManager } from "./io/inputManager";
import { Debug } from "./io/debug";
import { Window } from "./structs/window";
import { WindowContent } from "./structs/window_content";

async function initialize() {
  try {
    // Retrieve game states
    let settings: GameSettings = Settings;
    const MAX_DIMENTION = 400;
    const MIN_DIMENTION = 40;
    const MAX_INTERVAL = 1000;
    const MIN_INTERVAL = 4;

    // Correct ahem them settings
    settings.GAME_WIDTH = Math.max(MIN_DIMENTION, Math.min(MAX_DIMENTION, settings.GAME_WIDTH));
    settings.GAME_HEIGHT = Math.max(MIN_DIMENTION, Math.min(MAX_DIMENTION, settings.GAME_HEIGHT));
    settings.PHYSICS_UPDATE_INTERVAL = Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, settings.PHYSICS_UPDATE_INTERVAL));

    // Freeze so settings is read-only properties
    Object.freeze(settings);

    // Get DOM references
    const viewport: HTMLElement | null = document.getElementById("viewport");
    if (!(viewport instanceof HTMLDivElement)) {
      throw new Error("HTML element 'main-panel' does not exist.");
    }
    const canvas: HTMLElement | null = document.getElementById("render-surface");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("HTML element 'main-canvas' does not exist.");
    }
    canvas.style.aspectRatio = (settings.GAME_WIDTH / settings.GAME_HEIGHT).toString();

    // Init Renderer
    const renderer = new Renderer(canvas, settings);

    // Retrieve particle data
    const loadedParticleData = await loadParticleData("./src/data/particles.data");

    // Init Input Manager
    const inputManager: InputManager = new InputManager(loadedParticleData, viewport, canvas, settings, renderer);

    // Init Debugger
    const debug: Debug = new Debug(viewport);
    debug.enableDebug(false);

    // Init Engine
    const engine = new Engine(loadedParticleData, settings, renderer, inputManager, debug);

    // Start the engine
    engine.start();

    // ! debug: .. <
    console.log(loadedParticleData);
    addDemoWindow(viewport);
    // ! debug: .. >

    // ..
  } catch (error) {
    console.error("ERROR: Failed to initialize engine due to data loading failure.", error);
  }
}

// ! temp: ..
function addDemoWindow(hostEl: HTMLDivElement) {
  // Create a window
  const position = { x: 80, y: 80 };
  const size = { width: 380, height: 600 };
  const maxSize = { width: 800, height: 1200 };
  const demoWindow = new Window(hostEl, "Demo Window", position, size, maxSize);

  // --- Emitor Controls ---
  const newContent = new WindowContent();
  newContent.addTitle("Emitter Controls");

  const imageSize = { width: 300, height: 100 };
  newContent.addImage(imageSize, "./assets/preview_image.jpg", "Windows XP Background Image");

  newContent.addText("Server Status: Source code loaded.", "#4cae50");
  newContent.addSeparator(1);

  newContent.addSection("Emitor Settings");
  newContent.addSlider("Emitor Size", 0, 38, 14, 1);
  newContent.addSlider("Opacity", 0, 1, 0.9, 0.01);
  newContent.addToggleSwitch("Anti-aliasing");
  newContent.addDropdownButton("GPU Render Mode", ["Fastest", "High Quality", "Wireframe", "Debug"]);
  newContent.addSeparator(1);

  newContent.addSection("Save & Load");
  newContent.addButton("Save Emitor", "save-emitor", "#73a2e0ff");
  newContent.addButton("Load Emitor", "load-emitor", "#84da62ff");
  newContent.addButton("Delete Emitor", "delete-emitor", "#e04e4eff");

  // Add this content to the window
  demoWindow.addNewContent(newContent.contentElement, "Emitor Controls", "./assets/icons/electronics.svg");

  // --- Settings Content ---
  const settingsContent = new WindowContent();
  settingsContent.addTitle("Application Settings");

  settingsContent.addSection("Display");
  settingsContent.addDropdownButton("Theme", [
    "Light",
    "Dark",
    "System Default",
    "Cyan",
    "party",
    "Amogus",
    "Sus",
    "nerd",
    "nerd2",
    "nerd3",
  ]);
  settingsContent.addSlider("Brightness", 0, 100, 75, 1);
  settingsContent.addToggleSwitch("Enable Animations");
  settingsContent.addSeparator(1);

  settingsContent.addSection("Performance");
  settingsContent.addDropdownButton("Render Backend", ["Auto", "WebGPU", "WebGL"]);
  settingsContent.addToggleSwitch("Use Hardware Acceleration");
  settingsContent.addSlider("Max FPS", 30, 240, 120, 10);
  settingsContent.addSeparator(1);

  settingsContent.addSection("System");
  settingsContent.addButton("Reset Settings", "reset-settings", "#e04e4eff");
  settingsContent.addButton("Check for Updates", "check-updates");

  // Add this content to the window
  demoWindow.addContentBarSeparator(true);
  demoWindow.addNewContent(settingsContent.contentElement, "Settings", "./assets/icons/settings.svg");
}

// Initialise App
initialize();
