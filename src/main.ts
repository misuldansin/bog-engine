import type { GameSettings } from "./types";
import { Renderer } from "./io/renderer";
import { Engine } from "./core/engine";
import { InputManager } from "./io/inputManager";
import { Debug } from "./io/debug";
import { Window } from "./io/window";
import { WindowContent } from "./io/window_content";
import { loadParticleData, loadSettings } from "./loader";
import { BoggedState } from "./core/bogged_state";

// App initilization function
async function initialize(): Promise<void> {
  try {
    // Get DOM elements
    const viewport = getElement<HTMLDivElement>("viewport", HTMLDivElement);
    const canvas = getElement("render-surface", HTMLCanvasElement);

    // Load data
    const particleData = await loadParticleData("./src/data/particles.data");
    if (!particleData) {
      throw new Error(`Failed to load particle data from "./src/data/particles.data"`);
    }
    const settings: GameSettings = await loadSettings("./src/data/settings.data");
    if (!settings) {
      throw new Error(`Failed to load settings from "./src/data/settings.data"`);
    }

    // Initialise global state
    const boggedState = new BoggedState(settings);

    // Initialise Renderer
    const renderer = new Renderer(boggedState, canvas);

    // Initialise Input Manager
    const inputManager = new InputManager(boggedState, viewport, canvas, particleData);

    // Initialise Debugger
    const debug = new Debug(boggedState, viewport, false);

    // Initialise Engine
    const engine = new Engine(boggedState, renderer, inputManager, debug, particleData);

    // Start the engine
    engine.start();

    // ! debug: .. <
    console.log(particleData);
    addDemoWindow(viewport);
    // ! debug: .. >

    // ..
  } catch (error) {
    console.error("ERROR: Failed to initialize app:", error);
  }
}

// Helper function for getting a DOM element using id, handles error if element with id does not exists
function getElement<T extends HTMLElement>(elementId: string, expectedType: new () => T): T {
  const element = document.getElementById(elementId);
  if (!(element instanceof expectedType)) {
    throw new Error(`Missing or invalid <${expectedType.name.toLowerCase()} id='${elementId}'> element in DOM.`);
  }
  return element;
}

// Initialise the app
initialize();

//
//
//
//
// ------ DEBUG ZONE ------
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
