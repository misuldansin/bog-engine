import type { BoggedState } from "../core/bogged_state";
import type { Engine } from "../core/engine";

export class Debug {
  private readonly boggedState: BoggedState;

  // Debug states
  public isEnabled: boolean;
  public isOverlayEnabled: boolean;
  private elements: Map<string, HTMLElement>;

  // Time tracking for FPS/ TPS
  private frameCount: number = 0;
  private fps: number = 0;
  private tps: number = 0;
  private lastStatsUpdateTime: number = 0;

  constructor(boggedStateInstance: BoggedState, containerToAttach: HTMLDivElement, isEnabled: boolean = false) {
    this.boggedState = boggedStateInstance;

    this.isEnabled = isEnabled;
    this.isOverlayEnabled = isEnabled;
    this.elements = new Map();

    // Initialise debug UI
    this.initDebug(containerToAttach);
  }

  // ..
  public enableDebug(alsoEnableOverlay: boolean) {
    this.isEnabled = true;

    if (alsoEnableOverlay) {
      this.isOverlayEnabled = true;
    }
  }

  // ..
  public disableDebug() {
    this.isEnabled = false;
    this.isOverlayEnabled = false;
  }

  // ..
  public updateDisplay(timestamp: number, engine: Engine) {
    // If debugger is disabled, don't bother
    if (!this.isEnabled) return;

    this.updateStats(timestamp, engine);

    const fpsElement = this.elements.get("fps");
    if (fpsElement) {
      fpsElement.textContent = `FPS: ${this.fps.toFixed(2)}`;
    }

    const tpsElement = this.elements.get("tps");
    if (tpsElement) {
      tpsElement.textContent = `TPS: ${this.tps.toFixed(2)}`;
    }
  }

  // ..
  private updateStats(timestamp: number, engine: Engine) {
    const delta: number = timestamp - this.lastStatsUpdateTime;
    if (delta >= 1000) {
      this.fps = (this.frameCount * 1000) / delta;
      this.tps = (engine.tickCount * 1000) / delta;
      this.frameCount = 0;
      engine.tickCount = 0;
      this.lastStatsUpdateTime = timestamp;
    }
    this.frameCount++;
  }

  // ..
  private initDebug(containerToAttach: HTMLElement) {
    // Initialise the main debug container
    const debugContainer: HTMLDivElement = document.createElement("div");
    debugContainer.classList.add("debug-container");
    containerToAttach.appendChild(debugContainer);
    this.elements.set("debug-container", debugContainer);

    // Initialise info container
    const infoContainer: HTMLDivElement = document.createElement("div");
    infoContainer.classList.add("debug-info-container");
    debugContainer.appendChild(infoContainer);
    this.elements.set("info-container", infoContainer);

    // Initialise fps and tps elements inside the info container
    const fpsElement: HTMLDivElement = document.createElement("div");
    fpsElement.classList.add("debug-info");
    infoContainer.appendChild(fpsElement);
    this.elements.set("fps", fpsElement);

    const tpsElement: HTMLDivElement = document.createElement("div");
    tpsElement.classList.add("debug-info");
    infoContainer.appendChild(tpsElement);
    this.elements.set("tps", tpsElement);
  }
}
