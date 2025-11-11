import type { Index, Particle, Offset2, Category, Vector2, Phase, ParticleData } from "../types";
import { GameSettings } from "../settings";
import { Renderer } from "../io/renderer";
import { InputManager } from "../io/inputManager";
import { Debug } from "../core/debug";
import { WindowManager } from "../io/window_manager";
import { UIManager } from "../io/ui_manager";
import { Window } from "../io/window";
import { WindowContent } from "../io/window_content";
import { color } from "../structs/color_utils";
import { Categories, NEIGHBORHOOD, Utilities } from "../structs/utils";

export class BogEngine {
  // Static
  public readonly gameWidth!: number;
  public readonly gameHeight!: number;
  public readonly renderInterval!: number;
  public readonly physicsInterval!: number;
  public readonly brushMaxSize!: number;
  public readonly brushSensitivity!: number;

  // States
  private selectedParticleId!: number;
  private selectedCategoryId!: number;
  private currentBrushSize!: number;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private isCanvasHovered: boolean = false;

  // Da World 🤌
  private particles: Particle[];
  private colors: Uint8ClampedArray;
  private dirtyParticles: Set<Index> = new Set();
  private particlesProcessed: Set<Index> = new Set();

  // Components (a.k.a top dawgs)
  public readonly appMenuElement: HTMLDivElement;
  public readonly viewportElement: HTMLDivElement;
  public readonly canvasElement: HTMLCanvasElement;

  public readonly particleData: Record<number, ParticleData>;
  public readonly renderer: Renderer;
  public readonly windowManager: WindowManager;
  public readonly uiManager: UIManager;
  public readonly inputManager: InputManager;
  public readonly debug: Debug;

  // Loop variables
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private accumulator: number = 0;
  private renderAccumulator: number = 0;
  private lastFrameTime: number = 0;
  private tickCount: number = 0;

  constructor(settings: typeof GameSettings, particleData: Record<number, ParticleData>) {
    // Apply settings
    this.applySettings(settings);

    // Populate variables
    this.particleData = particleData;
    Object.freeze(this.particleData);

    const width = this.gameWidth;
    const height = this.gameHeight;
    const gridSize = width * height;

    this.particles = [];
    this.colors = new Uint8ClampedArray(gridSize * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.createParticleAt(x, y, this.particleData[0]!);
      }
    }

    // Get DOM elements
    this.appMenuElement = this.getElement<HTMLDivElement>("app-menu", HTMLDivElement);
    this.viewportElement = this.getElement<HTMLDivElement>("viewport", HTMLDivElement);
    this.canvasElement = this.getElement<HTMLCanvasElement>("render-surface", HTMLCanvasElement);

    // Initalise renderer
    this.renderer = new Renderer(this, this.canvasElement);

    // Initialise window manager
    this.windowManager = new WindowManager(this, this.viewportElement);

    // Initialise ui manager
    this.uiManager = new UIManager(this, this.windowManager, this.appMenuElement, this.canvasElement, this.gameWidth, this.gameHeight);

    // Initalise input manager
    this.inputManager = new InputManager(this, this.canvasElement);

    // Initalise debug
    this.debug = new Debug(this);

    // Start the engin량ㅇe
    this.start();

    // ! temp: ..
    console.log(this.particleData);
  }

  public getSelectedParticle(): number {
    return this.selectedParticleId;
  }

  public getSelectedCategory(): number {
    return this.selectedCategoryId;
  }

  public getBrushSize(): number {
    return this.currentBrushSize;
  }

  public getMousePosition(): Vector2 {
    return { x: this.mouseX, y: this.mouseY };
  }

  public setSelectedParticle(id: number) {
    this.selectedParticleId = id;
  }

  public setSelectedCategory(id: number) {
    this.selectedCategoryId = id;
  }

  // ========================================================
  // ----------------- Helper Functions ---------------------

  private getElement<T extends HTMLElement>(elementId: string, expectedType: new () => T): T {
    const element = document.getElementById(elementId);
    if (!(element instanceof expectedType)) {
      throw new Error(`Missing or invalid <${expectedType.name.toLowerCase()} id='${elementId}'> element in DOM.`);
    }
    return element;
  }

  private applySettings(settings: typeof GameSettings) {
    (this.gameWidth as number) = settings.gameWidth;
    (this.gameHeight as number) = settings.gameHeight;
    (this.renderInterval as number) = settings.renderInterval;
    (this.physicsInterval as number) = settings.physicsInterval;
    (this.brushMaxSize as number) = settings.brushMaxSize;
    (this.brushSensitivity as number) = settings.brushSensitivity;
    (this.selectedParticleId as number) = settings.defaultSelectedParticle;
    (this.selectedCategoryId as number) = settings.defaultSelectedCategory;
    (this.currentBrushSize as number) = settings.brushSize;
  }

  // ========================================================
  // ------------------ Grid Functions ----------------------
  // ! Todo: Store particle ID sumwhere in the future so it's not just a 'number'

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.gameWidth && y >= 0 && y < this.gameHeight;
  }

  private createParticleAt(x: number, y: number, particleData: ParticleData) {
    // Particle to create is out of grid's bounds, return
    if (!this.isInBounds(x, y)) return false;

    const width = this.gameWidth;
    const index = y * width + x;

    // Update grid properties
    this.particles[index] = {
      data: particleData, // ! temp: ->
      position: { x: x, y: y },
      velocity: { x: 0, y: 0 },
    };

    const colorIndex = index * 4;
    const randomColor = color.lerpColor(particleData.baseColor, particleData.highlightColor, Math.round(Math.random() * 5) / 4);
    this.colors[colorIndex + 0] = randomColor[0];
    this.colors[colorIndex + 1] = randomColor[1];
    this.colors[colorIndex + 2] = randomColor[2];
    this.colors[colorIndex + 3] = randomColor[3];

    // Mark it dirty
    this.markDirty(x, y, true);
  }

  private getParticleAt(x: number, y: number): Particle | undefined {
    if (!this.isInBounds(x, y)) return undefined;
    return this.particles[y * this.gameWidth + x];
  }

  private getNeighborAt(x: number, y: number, offset: Offset2): Particle | undefined {
    const neighborX: number = x + offset.dx;
    const neighborY: number = y + offset.dy;
    return this.getParticleAt(neighborX, neighborY);
  }

  private getNeighborsAt(x: number, y: number, offsets: Offset2[], withCategory?: Category, withId?: number): Particle[] {
    // Get all valid neighbors
    const outNeighbors: Particle[] = [];
    for (const offset of offsets) {
      const particle = this.getNeighborAt(x, y, offset);
      if (particle) outNeighbors.push(particle);
    }

    // Apply filtering and return
    return outNeighbors.filter((neighbor) => {
      const categoryMatches = withCategory === undefined || neighbor.data.category === withCategory;
      const idMatches = withId === undefined || neighbor.data.id === withId;
      return categoryMatches && idMatches;
    });
  }

  private markDirty(x: number, y: number, markNeighborDirty: boolean) {
    // Mark this particle dirty
    this.dirtyParticles.add(y * this.gameWidth + x);

    // Handle marking neighbors dirty
    if (markNeighborDirty) {
      const neighbors: Particle[] = this.getNeighborsAt(x, y, NEIGHBORHOOD.ALL_NEIGHBORS);
      for (const neighbor of neighbors) {
        this.dirtyParticles.add(neighbor.position.y * this.gameWidth + neighbor.position.x);
      }
    }
  }

  private interFillCircleAt(x1: number, y1: number, x2: number, y2: number, radius: number, particleData: ParticleData) {
    const visitedList: Set<Index> = new Set();
    this.getPathBetween(x1, y1, x2, y2).forEach((pos) => this.fillCircleAt(pos.x, pos.y, radius, particleData, visitedList));
  }

  private getPathBetween(x1: number, y1: number, x2: number, y2: number): Vector2[] {
    const outPositions: Vector2[] = [];

    let xDir = x1 < x2 ? 1 : -1;
    let yDir = y1 < y2 ? 1 : -1;
    let xDelta = Math.abs(x2 - x1);
    let yDelta = Math.abs(y2 - y1);

    let isSteep = yDelta > xDelta;
    if (isSteep) [xDelta, yDelta] = [yDelta, xDelta];

    let err = 2 * yDelta - xDelta;
    let xCur = x1;
    let yCur = y1;

    for (let i = 0; i <= xDelta; i++) {
      outPositions.push({ x: xCur, y: yCur });

      if (err >= 0) {
        err = err - 2 * xDelta;
        if (isSteep) xCur = xCur + xDir;
        else yCur = yCur + yDir;
      }

      err = err + 2 * yDelta;
      if (isSteep) yCur = yCur + yDir;
      else xCur = xCur + xDir;
    }

    return outPositions;
  }

  private fillCircleAt(x: number, y: number, radius: number, particleData: ParticleData, visitedList: Set<Index>) {
    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        // Radius bounds
        if (i * i + j * j > radius * radius) continue;

        const px: number = x + i;
        const py: number = y + j;
        const index = py * this.gameWidth + px;

        // Has already visited
        if (visitedList.has(index)) continue;
        visitedList.add(index);

        // Grid bounds
        if (!this.isInBounds(px, py)) continue;

        // Draw
        const isErasing = particleData.id === 0;
        const prevParticle: Particle | undefined = this.particles[py * this.gameWidth + px];
        const isPrevParticleDead = prevParticle === undefined || prevParticle.data.id === 0;
        if (isErasing || isPrevParticleDead) {
          this.createParticleAt(px, py, particleData);
        }
      }
    }
  }

  // ========================================================
  // ------------------ Core Functions ----------------------

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = 0;
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (timestamp: number) => {
    if (!this.isRunning) return;

    const delta = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    this.renderAccumulator += delta;

    if (this.renderAccumulator >= this.renderInterval) {
      this.renderAccumulator -= this.renderInterval;

      // ------- Update stats -------
      this.debug.updateDisplay(timestamp);

      // ------- Handle Input -------
      this.handleInput();

      // ------ Update Physics ------
      this.accumulator += delta;
      let stepsTaken = 0;
      while (this.accumulator >= this.physicsInterval) {
        this.stepPhysics();

        stepsTaken++;
        this.tickCount++;
        this.accumulator -= this.physicsInterval;

        if (stepsTaken > 20) {
          this.accumulator = 0;
          break;
        }
      }

      // ------ Render This Frame ------
      this.renderer.renderThisFrame(this.colors, this.isCanvasHovered);
    }

    // Continue the loop
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private handleInput() {
    // Retreive raw inputs
    const scaleFactorX = this.inputManager.scaleFactorX;
    const scaleFactorY = this.inputManager.scaleFactorY;
    const canvasRectLeft = this.inputManager.canvasRectLeft;
    const canvasRectTop = this.inputManager.canvasRectTop;
    const rawClientX = this.inputManager.rawClientX;
    const rawClientY = this.inputManager.rawClientY;
    const rawScrollDeltaY = this.inputManager.rawScrollDeltaY;
    this.inputManager.rawScrollDeltaY = 0;

    // Update internal states
    this.prevMouseX = this.mouseX;
    this.prevMouseY = this.mouseY;
    this.mouseX = Math.floor((rawClientX - canvasRectLeft) * scaleFactorX);
    this.mouseY = Math.floor((rawClientY - canvasRectTop) * scaleFactorY);
    this.currentBrushSize = Math.max(0, Math.min(this.currentBrushSize - rawScrollDeltaY * this.brushSensitivity, this.brushMaxSize));
    this.isCanvasHovered = this.inputManager.isCanvasHovered;

    // Handle canvas interactions
    const isPainting = this.inputManager.isPrimaryButtonDown;
    const isErasing = this.inputManager.isSecondaryButtonDown;

    if (isErasing) {
      this.interFillCircleAt(this.mouseX, this.mouseY, this.prevMouseX, this.prevMouseY, this.currentBrushSize, this.particleData[0]!);
    } else if (isPainting) {
      const particleData = this.particleData[this.selectedParticleId];
      if (particleData)
        this.interFillCircleAt(this.mouseX, this.mouseY, this.prevMouseX, this.prevMouseY, this.currentBrushSize, particleData);
    }
  }

  private stepPhysics() {
    // Get particle indices to update this frame
    let particlesToUpdate: number[] = [];
    for (let y = 0; y < this.gameHeight; y++) {
      for (let x = 0; x < this.gameWidth; x++) {
        particlesToUpdate.push(y * this.gameWidth + x);
      }
    }

    // Clear dirty particles
    this.dirtyParticles.clear();

    // Shuffle the entire list to randomize the horizontal order
    particlesToUpdate = Utilities.shuffleArray(particlesToUpdate);

    // Sort from bottom to top (y-coordinate)
    // index = y * width + x
    // y = floor(index / width)
    particlesToUpdate.sort((indexA, indexB) => Math.floor(indexA / this.gameWidth) - Math.floor(indexB / this.gameWidth));

    // Loop through previous dirty particles and update them
    this.particlesProcessed.clear();
    for (const index of particlesToUpdate) {
      // If the particle was already processed this frame, don't bother
      if (this.particlesProcessed.has(index)) continue;

      switch (this.particles[index]!.data.category) {
        case Categories.SOLIDS:
          // Handle Solids
          break;
        case Categories.LIQUIDS:
          // Handle liquids
          break;
        case Categories.GASES:
          // Handle Gas
          break;
        case Categories.SANDS:
          // Handle Sands
          // this.handleSands(index);
          this.handleSands(index);
          break;
        case Categories.ELECTRONICS:
          // Handle Electronics
          break;
        default:
          continue;
      }
    }
  }

  private handleSands(index: Index) {}

  private tryPushParticle(index: Index) {}
}

//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
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
  demoWindow.setVisibility(false);

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
