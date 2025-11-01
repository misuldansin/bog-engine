import type { BoggedState } from "../core/bogged_state";
import type { Engine } from "../core/engine";

export class Debug {
  // Dependencies
  private readonly boggedState: BoggedState;

  // Debug properties
  private elements: Map<string, HTMLElement>;
  public isEnabled: boolean;
  public isOverlayEnabled: boolean;

  private isStatsEnabled = false;
  private fpsElement: HTMLDivElement | null = null;
  private tpsElement: HTMLDivElement | null = null;

  // Time tracking for FPS/ TPS
  private frameCount: number = 0;
  private fps: number = 0;
  private tps: number = 0;
  private lastStatsUpdateTime: number = 0;

  constructor(boggedStateInstance: BoggedState, containerToAttach: HTMLDivElement, isEnabled: boolean = false) {
    this.boggedState = boggedStateInstance;

    this.isEnabled = isEnabled;
    this.isOverlayEnabled = false;
    this.elements = new Map();

    // Initialise debug UI
    this.initDebug(containerToAttach);
  }

  public setStatsElements(fpsElement: HTMLDivElement, tpsElement: HTMLDivElement) {
    this.fpsElement = fpsElement;
    this.tpsElement = tpsElement;
    this.isStatsEnabled = true;
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
  public updateDisplay(timestamp: number, engineInstance: Engine) {
    // If debugger is disabled, don't bother
    if (!this.isEnabled) return;

    this.frameCount++;
    if (timestamp >= this.lastStatsUpdateTime + 1000) {
      const timeElapsed = timestamp - this.lastStatsUpdateTime;

      this.fps = (this.frameCount * 1000) / timeElapsed;
      this.tps = (engineInstance.tickCount * 1000) / timeElapsed;

      this.frameCount = 0;
      engineInstance.tickCount = 0;
      this.lastStatsUpdateTime = timestamp;
    }

    if (this.fpsElement) {
      this.fpsElement.textContent = `FPS: ${this.fps.toFixed(0)}`;
    }

    if (this.tpsElement) {
      this.tpsElement.textContent = `TPS: ${this.tps.toFixed(0)}`;
    }
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
  }
}
