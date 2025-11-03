import type { Index, Element, Particle, Offset2, Category, Vector2 } from "../types";
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
  private isCanvasHovered: boolean = false;

  // World
  private worldGrid: Particle[];
  private dirtyParticles: Set<Index>;
  private particlesProcessed: Set<Index> = new Set();

  // Components (a.k.a top dawgs)
  public readonly appMenuElement: HTMLDivElement;
  public readonly viewportElement: HTMLDivElement;
  public readonly canvasElement: HTMLCanvasElement;

  public readonly elementDataMap: Record<number, Element>;
  public readonly renderer: Renderer;
  public readonly windowManager: WindowManager;
  public readonly uiManager: UIManager;
  public readonly inputManager: InputManager;
  public readonly debug: Debug;

  // Loop variables
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private accumulator: number = 0;
  private lastFrameTime: number = 0;
  private tickCount: number = 0;

  constructor(settings: typeof GameSettings, elementDataMap: Record<number, Element>) {
    // Apply settings
    this.applySettings(settings);

    // Populate variables
    const gridSize = this.gameWidth * this.gameHeight;
    this.elementDataMap = elementDataMap;
    this.worldGrid = this.getPopulatedGrid(0, this.gameWidth, this.gameHeight);
    this.dirtyParticles = new Set();
    for (let i = 0; i < gridSize; i++) this.dirtyParticles.add(i);
    this.appMenuElement = this.getElement<HTMLDivElement>("app-menu", HTMLDivElement);
    this.viewportElement = this.getElement<HTMLDivElement>("viewport", HTMLDivElement);
    this.canvasElement = this.getElement<HTMLCanvasElement>("render-surface", HTMLCanvasElement);

    // Initalise renderer
    this.renderer = new Renderer(this, this.canvasElement, this.gameWidth, this.gameHeight);

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
    console.log(this.elementDataMap);
    this.selectedParticleId = 10;
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

  private getPopulatedGrid(elementId: number, width: number, height: number): Particle[] {
    const outGrid = new Array<Particle>(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        // Create new particle
        let newParticle: Particle = this.createParticle(elementId);

        // Update newly created particle's states
        newParticle.position.x = x;
        newParticle.position.y = y;
        newParticle.index = index;

        // Add it to the data array
        outGrid[index] = newParticle;
      }
    }
    return outGrid;
  }

  private createParticle(elementId: number): Particle {
    // Retrieve element data
    let data: Element | undefined = this.elementDataMap[elementId];

    // If no element with id exists, load the default EMPTY element's data
    if (!data) {
      data = this.elementDataMap[0]!;
    }

    // Create particle's primary element
    const element = { ...data };

    // Calculate particle's color from it's primary element's three colors
    let resolution: number = 6;
    let steps: number = resolution - 1;
    let t: number = Math.round(Math.random() * steps) / steps;
    const newColor = color.lerpColor(element.baseColor, element.highlightColor, t);

    return {
      position: { x: -1, y: -1 },
      index: 0,
      color: newColor,
      category: element.category,
      primary: element,
      secondary: null,

      phase: element.phase,
      mass: element.density,
      temperature: 21.0,
    };
  }

  // ========================================================
  // ------------------ Grid Functions ----------------------

  // ! Todo: Store particle ID sumwhere in the future so it's not just a 'number'
  private createParticleAt(x: number, y: number, elementId: number, markDirty: boolean, markNeighborDirty: boolean): boolean {
    // Particle to create is out of bounds, don't create
    if (!this.isInBounds(x, y)) {
      return false;
    }

    // Create a new particle
    let particle = this.createParticle(elementId);

    // Update newly created particle's states
    particle.position.x = x;
    particle.position.y = y;
    particle.index = y * this.gameWidth + x;

    // Handle dirty
    if (markDirty) {
      this.markDirty(particle, markNeighborDirty);
    }

    // Add the newly created particle to the grid
    this.worldGrid![y * this.gameWidth + x] = particle;

    // Particle was successfully created, return true
    return true;
  }

  private getParticleAt(x: number, y: number): Particle | null {
    if (!this.isInBounds(x, y)) return null;
    return this.worldGrid[y * this.gameWidth + x]!;
  }

  private getNeighborOf(particle: Particle, offset: Offset2): Particle | null {
    const neighborX: number = particle.position.x + offset.dx;
    const neighborY: number = particle.position.y + offset.dy;
    return this.getParticleAt(neighborX, neighborY);
  }

  private getNeighborsOf(particle: Particle, offsets: Offset2[], withCategory?: Category, withId?: number): Particle[] {
    // Get all valid neighbors
    const allNeighbors = offsets
      .map((offset) => this.getNeighborOf(particle, offset))
      .filter((neighbor): neighbor is Particle => neighbor !== null);

    // Apply filtering and return
    return allNeighbors.filter((neighbor) => {
      const categoryMatches = withCategory === undefined || neighbor.category === withCategory;
      const idMatches = withId === undefined || neighbor.primary.id === withId || (neighbor.secondary && neighbor.secondary.id === withId);
      return categoryMatches && idMatches;
    });
  }

  private markDirty(particle: Particle, markNeighborDirty: boolean) {
    // Mark this particle dirty
    this.dirtyParticles.add(particle.index);

    // Handle marking neighbors dirty
    if (markNeighborDirty) {
      const neighbors: Particle[] = this.getNeighborsOf(particle, NEIGHBORHOOD.ALL_NEIGHBORS);
      for (const neighbor of neighbors) {
        this.dirtyParticles.add(neighbor.index);
      }
    }
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.gameWidth && y >= 0 && y < this.gameHeight;
  }

  private fillCircleAt(x: number, y: number, radius: number, particleId: number) {
    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        // Don't draw outside the given radius
        if (i * i + j * j > radius * radius) {
          continue;
        }

        // Particle location to draw
        const px: number = x + i;
        const py: number = y + j;

        // Particle to draw is out of grid's bounds, skip
        if (!this.isInBounds(px, py)) {
          continue;
        }

        // Get previous particle to compare it
        const prevParticle: Particle | null = this.getParticleAt(px, py);
        if (particleId === 0 || prevParticle === null || prevParticle.primary.id === 0) {
          this.createParticleAt(px, py, particleId, true, true);
        }
      }
    }
  }

  private swapParticles(particleA: Particle, particleB: Particle, markAsDirty: boolean, markNeighborsAsDirty: boolean) {
    // Swap particles in the data array
    this.worldGrid[particleA.index] = particleB;
    this.worldGrid[particleB.index] = particleA;

    // Update their postion and indices
    const tempPosition = { x: particleA.position.x, y: particleA.position.y };
    const tempIndex = particleA.index;

    particleA.position = particleB.position;
    particleA.index = particleB.index;

    particleB.position = tempPosition;
    particleB.index = tempIndex;

    // Mark them as dirty
    if (markAsDirty) {
      this.markDirty(particleA, markNeighborsAsDirty);
      this.markDirty(particleB, markNeighborsAsDirty);
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
    if (!this.isRunning) {
      return;
    }

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp;
    }
    const delta = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    // ------- Update stats -------
    // this.debug.updateDisplay(timestamp);

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

      if (stepsTaken > 60) {
        this.accumulator = 0;
        break;
      }
    }

    // ------ Render This Frame ------
    this.renderer.renderThisFrame();

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
    this.mouseX = Math.floor((rawClientX - canvasRectLeft) * scaleFactorX);
    this.mouseY = Math.floor(this.gameHeight - (rawClientY - canvasRectTop) * scaleFactorY);
    this.currentBrushSize = Math.max(0, Math.min(this.currentBrushSize - rawScrollDeltaY * this.brushSensitivity, this.brushMaxSize));
    this.isCanvasHovered = this.inputManager.isCanvasHovered;

    // Handle canvas interactions
    const isPainting = this.inputManager.isPrimaryButtonDown;
    const isErasing = this.inputManager.isSecondaryButtonDown;

    if (isErasing) {
      this.fillCircleAt(this.mouseX, this.mouseY, this.currentBrushSize, 0);
    } else if (isPainting) {
      this.fillCircleAt(this.mouseX, this.mouseY, this.currentBrushSize, this.selectedParticleId);
    }
  }

  private stepPhysics() {
    // Get particles to update this frame
    let particlesToUpdate: Particle[] = [];
    for (const index of this.dirtyParticles) {
      particlesToUpdate.push(this.worldGrid[index]!);
    }

    // Clear dirty particles
    this.dirtyParticles.clear();

    // Clear particles processed array and current grid's dirty particles to initialise for the next part
    this.particlesProcessed.clear();

    // Shuffle the entire list to randomize the horizontal order
    particlesToUpdate = Utilities.shuffleArray(particlesToUpdate);

    // Sort from bottom to top (y-coordinate)
    particlesToUpdate.sort((particleA, particleB) => particleA.position.y - particleB.position.y);

    // Loop through previous dirty particles and update them
    for (const particle of particlesToUpdate) {
      if (!particle) continue; // If particle is null, don't bother

      // If the particle was already processed this frame, don't bother
      if (this.particlesProcessed.has(particle.index)) continue;

      switch (particle.category) {
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
          break;
        case Categories.ELECTRONICS:
          // Handle Electronics
          break;
        default:
          continue;
      }
    }

    // At the end ...
    this.renderer.queueParticles(particlesToUpdate);
  }
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
