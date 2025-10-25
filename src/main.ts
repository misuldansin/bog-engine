import { Settings } from "./settings";
import { loadParticleData } from "./loader";
import { Renderer } from "./io/renderer";
import { Engine } from "./core/engine";
import { InputManager } from "./io/inputManager";
import { Debug } from "./io/debug";

async function initialize() {
  try {
    // Retrieve game states
    const gameWidth: number = Settings.GAME_WIDTH;
    const gameHeight: number = Settings.GAME_HEIGHT;

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
    const renderer = new Renderer(gameWidth, gameHeight, canvas as HTMLCanvasElement);

    // Retrieve particle data
    const loadedParticleData = await loadParticleData("./src/data/particles.data");

    // Init Input Manager
    const inputManager: InputManager = new InputManager(gameWidth, gameHeight, Settings, loadedParticleData, mainContainer, canvas);

    const debug: Debug = new Debug(mainContainer);
    debug.enableDebug(true);

    // Init Engine
    const engine = new Engine(gameWidth, gameHeight, loadedParticleData, renderer, inputManager, debug);

    // Start the engine
    engine.start();

    console.log(loadedParticleData);

    // ..
  } catch (error) {
    console.error("CRITICAL ERROR: Failed to initialize engine due to data loading failure.", error);
  }
}

// Initialise App
initialize();
