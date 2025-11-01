import type { Debug } from "../io/debug";
import type { GameSettings, ParticleMap } from "../types";

export class BoggedState {
  // Game State
  public readonly gameWidth: number;
  public readonly gameHeight: number;
  public readonly particleData: ParticleMap;
  public renderInterval: number;
  public physicsInterval: number;

  // Top dogs
  public debugInstance: Debug | null = null;

  readonly brushMaxSize: number;
  readonly brushSensitivity: number;
  public currentBrushSize: number;
  public selectedParticleId: number;
  public selectedCategoryId: number;

  // Input States
  public mouseX: number = 0;
  public mouseY: number = 0;
  public isLeftMouseButtonDown: boolean = false;
  public isRightMouseButtonDown: boolean = false;
  public isBrushOutlineVisible: boolean = true;

  constructor(settings: GameSettings, particleData: ParticleMap) {
    this.gameWidth = settings.gameWidth;
    this.gameHeight = settings.gameHeight;
    this.particleData = particleData;
    this.brushMaxSize = settings.brushMaxSize;
    this.brushSensitivity = settings.brushSensitivity;

    this.selectedParticleId = 0;
    this.selectedCategoryId = 2;
    this.renderInterval = settings.renderInterval;
    this.physicsInterval = settings.physicsInterval;

    this.currentBrushSize = settings.brushSize;
  }
}
