import type { Engine } from "../core/engine";

export class Debug {
  // Debug states
  #isEnabled: boolean;
  #isOverlayEnabled: boolean;
  #elements: Map<string, HTMLElement>;

  // Time tracking for FPS/ TPS
  #frameCount: number;
  #fps: number;
  #tps: number;
  #lastStatsUpdateTime: number;

  constructor(containerToAttach: HTMLDivElement) {
    this.#isEnabled = false;
    this.#isOverlayEnabled = false;
    this.#elements = new Map();

    this.#frameCount = 0;
    this.#fps = 0;
    this.#tps = 0;
    this.#lastStatsUpdateTime = 0;

    // Initialise debug UI
    this.#initDebug(containerToAttach);
  }

  public get isOverlayEnabled(): boolean {
    return this.#isOverlayEnabled;
  }

  // ..
  enableDebug(alsoEnableOverlay: boolean) {
    this.#isEnabled = true;

    if (alsoEnableOverlay) {
      this.#isOverlayEnabled = true;
    }
  }

  // ..
  disableDebug() {
    this.#isEnabled = false;
    this.#isOverlayEnabled = false;
  }

  // ..
  updateDisplay(timestamp: number, engine: Engine) {
    // If debugger is disabled, don't bother
    if (!this.#isEnabled) return;

    this.#updateStats(timestamp, engine);

    const fpsElement = this.#elements.get("fps");
    if (fpsElement) {
      fpsElement.textContent = `FPS: ${this.#fps.toFixed(2)}`;
    }

    const tpsElement = this.#elements.get("tps");
    if (tpsElement) {
      tpsElement.textContent = `TPS: ${this.#tps.toFixed(2)}`;
    }
  }

  // ..
  #updateStats(timestamp: number, engine: Engine) {
    const delta: number = timestamp - this.#lastStatsUpdateTime;
    if (delta >= 1000) {
      this.#fps = (this.#frameCount * 1000) / delta;
      this.#tps = (engine.tickCount * 1000) / delta;
      this.#frameCount = 0;
      engine.tickCount = 0;
      this.#lastStatsUpdateTime = timestamp;
    }
    this.#frameCount++;
  }

  // ..

  #initDebug(containerToAttach: HTMLElement) {
    // Initialise the main debug container
    const debugContainer: HTMLDivElement = document.createElement("div");
    debugContainer.classList.add("debug-container");
    containerToAttach.appendChild(debugContainer);
    this.#elements.set("debug-container", debugContainer);

    // Initialise info container
    const infoContainer: HTMLDivElement = document.createElement("div");
    infoContainer.classList.add("debug-info-container");
    debugContainer.appendChild(infoContainer);
    this.#elements.set("info-container", infoContainer);

    // Initialise fps and tps elements inside the info container
    const fpsElement: HTMLDivElement = document.createElement("div");
    fpsElement.classList.add("debug-info");
    infoContainer.appendChild(fpsElement);
    this.#elements.set("fps", fpsElement);

    const tpsElement: HTMLDivElement = document.createElement("div");
    tpsElement.classList.add("debug-info");
    infoContainer.appendChild(tpsElement);
    this.#elements.set("tps", tpsElement);
  }
}
