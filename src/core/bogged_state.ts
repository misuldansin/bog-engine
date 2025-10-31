import type { GameSettings } from "../types";

export class BoggedState {
  readonly gameWidth: number;
  readonly gameHeight: number;
  readonly brushMaxSize: number;
  readonly brushSensitivity: number;

  selectedParticleId: number;
  selectedCategoryId: number;
  renderInterval: number;
  physicsInterval: number;

  currentBrushSize: number;

  mouseX: number = 0;
  mouseY: number = 0;
  isLeftMouseButtonDown: boolean = false;
  isRightMouseButtonDown: boolean = false;
  isBrushOutlineVisible: boolean = false;

  constructor(settings: GameSettings) {
    this.gameWidth = settings.gameWidth;
    this.gameHeight = settings.gameHeight;
    this.brushMaxSize = settings.brushMaxSize;
    this.brushSensitivity = settings.brushSensitivity;

    this.selectedParticleId = 0;
    this.selectedCategoryId = 2;
    this.renderInterval = settings.renderInterval;
    this.physicsInterval = settings.physicsInterval;

    this.currentBrushSize = settings.brushSize;
  }
}
