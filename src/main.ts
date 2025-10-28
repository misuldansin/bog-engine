import type { GameSettings } from "./types";

import { Settings } from "./settings";
import { loadParticleData } from "./loader";
import { Renderer } from "./io/renderer";
import { Engine } from "./core/engine";
import { InputManager } from "./io/inputManager";
import { Debug } from "./io/debug";
import { Window } from "./structs/window";

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
    const canvas: HTMLElement | null = document.getElementById("main-canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("HTML element 'main-canvas' does not exist.");
    }
    const mainContainer: HTMLElement | null = document.getElementById("main-panel");
    if (!(mainContainer instanceof HTMLDivElement)) {
      throw new Error("HTML element 'main-panel' does not exist.");
    }

    // Init Renderer
    const renderer = new Renderer(canvas, settings);

    // Retrieve particle data
    const loadedParticleData = await loadParticleData("./src/data/particles.data");

    // Init Input Manager
    const inputManager: InputManager = new InputManager(loadedParticleData, mainContainer, canvas, settings, renderer);

    // Init Debugger
    const debug: Debug = new Debug(mainContainer);
    debug.enableDebug(false);

    // Init Engine
    const engine = new Engine(loadedParticleData, settings, renderer, inputManager, debug);

    // Start the engine
    engine.start();

    // ! debug: .. <
    console.log(loadedParticleData);
    // addDemoWindow(mainContainer);
    // ! debug: .. >

    // ..
  } catch (error) {
    console.error("ERROR: Failed to initialize engine due to data loading failure.", error);
  }
}

// ! temp: ..
function addDemoWindow(hostElement: HTMLDivElement) {
  const newWindow = new Window(
    hostElement,
    "New Window",
    { x: 80, y: 80 },
    { width: 400, height: 600 },
    { width: 400, height: 600 },
    "left",
    "Emitor",
    "./assets/icons/solid.svg"
  );

  // newWindow.addCategorySpacer();
  // newWindow.addCategory("Settings", "./assets/icons/liquid.svg");
  // newWindow.addCategoryDivider();
  // newWindow.addCategory("Settings", "./assets/icons/liquid.svg");

  newWindow.addTitle(0, "Particle Emitter Controls");

  newWindow.addImage(0, "assets/preview_image.jpg", "Preview Image", { width: 300, height: 100 });
  newWindow.addText(0, "Status: Core System Active", "#4cae50");
  newWindow.addDivider(0);

  newWindow.addSection(0, "Emitter");
  newWindow.addTextInput(0, "Emittor Name", "Enter emitor name...", "", "emitter-name");
  newWindow.addDivider(0);

  newWindow.addSection(0, "Brush Parameters");
  newWindow.addSlider(0, "Brush Size", "brush-size", { x: 1, y: 100 }, 20);
  newWindow.addSlider(0, "Opacity", "opacity-val", { x: 0, y: 1 }, 0.7);
  newWindow.addToggleSwitch(0, "Smooth", "brush-smooth", false);
  newWindow.addDropdown(0, "Render Mode", "render-mode", ["Fastest", "High Quality", "Wireframe", "Debug"]);
  newWindow.addDivider(0);

  newWindow.addSection(0, "Particle Type");
  for (let i = 1; i <= 3; i++) {
    newWindow.addButton(0, `Particle Type ${i}`, `particle-${i}`);
  }

  newWindow.addDivider(0);
  newWindow.addButton(0, "Start Simulation", "start-sim", "#5a6cd4ff");
  newWindow.addButton(0, "Save Preset", "save-preset");
}

// Initialise App
initialize();
