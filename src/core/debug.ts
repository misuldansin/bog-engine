import type { BogEngine } from "../core/bog_engine";

export class Debug {
  // Dependencies
  private readonly bogEngine: BogEngine;

  // Debug properties
  public isEnabled: boolean = true;
  public isOverlayEnabled: boolean = false;

  private isStatsEnabled = false;
  private fpsElement: HTMLDivElement | null = null;
  private tpsElement: HTMLDivElement | null = null;

  // Time tracking for FPS/ TPS
  private frameCount: number = 0;
  private fps: number = 0;
  private tps: number = 0;
  private lastStatsUpdateTime: number = 0;

  constructor(bogEngine: BogEngine) {
    this.bogEngine = bogEngine;
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
  public updateDisplay(timestamp: number) {
    // If debugger is disabled, don't bother
    if (!this.isEnabled) return;

    // this.frameCount++;
    // if (timestamp >= this.lastStatsUpdateTime + 1000) {
    //   const timeElapsed = timestamp - this.lastStatsUpdateTime;

    //   this.fps = (this.frameCount * 1000) / timeElapsed;
    //   this.tps = (engineInstance.tickCount * 1000) / timeElapsed;

    //   this.frameCount = 0;
    //   engineInstance.tickCount = 0;
    //   this.lastStatsUpdateTime = timestamp;
    // }

    if (this.fpsElement) {
      this.fpsElement.textContent = `FPS: ${this.fps.toFixed(0)}`;
    }

    if (this.tpsElement) {
      this.tpsElement.textContent = `TPS: ${this.tps.toFixed(0)}`;
    }
  }
}
