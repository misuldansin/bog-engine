import type { Color, GameSettings, ParticleMap, Pixel, Size, Vector2 } from "../types";
import type { Renderer } from "../io/renderer";
import type { Grid } from "../structs/grid";

import { color } from "../structs/color_utils";
import { Window } from "../structs/window";
import { WindowContent } from "../structs/window_content";

export class InputManager {
  // DOMs and dependencies
  private _mainContainer: HTMLDivElement;
  private _canvas: HTMLCanvasElement;
  private _renderer: Renderer;

  // Input variables
  private _width: number;
  private _height: number;
  private _brushSizeSensitivity: number;
  private _maxBrushSize: number;

  private _selectedParticle: number;
  private _selectedCategory: number;
  private _currentBrushSize: number;
  private _currentPressure: number;
  private _currentConcentration: number;

  // Input states
  private _activePointerId: number | null;
  public isPainting: boolean;
  public isErasing: boolean;
  public isDrawingOverlay: boolean;
  public shouldChangeBrushSize: boolean;
  public changeBrushSizeDir: number;
  public latestMouseCoords: Vector2;
  public activeButton: string;

  constructor(
    particleDataMap: ParticleMap,
    inputContainer: HTMLDivElement,
    canvas: HTMLCanvasElement,
    settings: GameSettings,
    rendererInstance: Renderer
  ) {
    this._mainContainer = inputContainer;
    this._canvas = canvas;
    this._renderer = rendererInstance;

    this._width = settings.GAME_WIDTH;
    this._height = settings.GAME_HEIGHT;
    this._brushSizeSensitivity = settings.BRUSH_SENSITIVITY;
    this._maxBrushSize = settings.BRUSH_MAX_SIZE;

    this._selectedParticle = settings.SELECTED_PARTICLE;
    this._selectedCategory = settings.SELECTED_CATEGORY;
    this._currentBrushSize = settings.BRUSH_CUR_SIZE;
    this._currentPressure = settings.CURRENT_PRESSURE;
    this._currentConcentration = settings.CURRENT_CONCENTRATION;

    this._activePointerId = null;
    this.isPainting = false;
    this.isErasing = false;
    this.isDrawingOverlay = true;
    this.shouldChangeBrushSize = false;
    this.changeBrushSizeDir = 0;
    this.latestMouseCoords = { x: 0, y: 0 };
    this.activeButton = "none";

    // Bind listeners
    this._addEventListeners();

    // Add particle palette window
    this._addParticlePaletteWindow(particleDataMap);
  }

  // --------- Public Methods ---------

  // ..
  processInput(grid: Grid, renderer: Renderer) {
    const mouseX: number = this.latestMouseCoords.x;
    const mouseY: number = this.latestMouseCoords.y;
    const mousePosition: Vector2 = { x: Math.floor(mouseX), y: Math.floor(mouseY) };

    // --- Handle UI rendering ---
    if (this.isDrawingOverlay) {
      const brushOutlineOverlay: Pixel[] = this._calculateBrushOutline(mousePosition.x, mousePosition.y);
      renderer.queueUIPixels(brushOutlineOverlay);
    }

    // --- Handle input ---

    // Paint particles
    if (this.isPainting || this.isErasing) {
      // Check if the cursor is inside the canvas
      const isInXBounds: boolean = mousePosition.x < this._width + this._currentBrushSize && mousePosition.x >= 0 - this._currentBrushSize;
      const isInYBounds: boolean = mousePosition.y < this._height + this._currentBrushSize && mousePosition.y >= 0 - this._currentBrushSize;
      if (isInXBounds && isInYBounds) {
        const x = mousePosition.x;
        const y = mousePosition.y;
        const particleId: number = this.isPainting ? this._selectedParticle : 0; // We are erasing
        grid.fillCircleAt(x, y - 1, this._currentBrushSize, particleId);
      }
    }

    // Change brush size
    if (this.shouldChangeBrushSize) {
      // Calculate new brush size
      const scrollDelta: number = this.changeBrushSizeDir * this._brushSizeSensitivity;
      let newSize: number = this._currentBrushSize - scrollDelta;

      // Clamp it between 0 and max brush size
      newSize = Math.floor(newSize);
      newSize = Math.min(this._maxBrushSize, newSize);
      newSize = Math.max(0, newSize);

      // Set the new brush size
      this._currentBrushSize = newSize;
      this.changeBrushSizeDir = 0;
    }
  }

  // --------- Helper Functions ---------

  // ..
  _addEventListeners() {
    // Get references to DOM elements
    const canvas = this._canvas;

    // Pointer events (mouse, touch, and stylus)
    canvas.addEventListener("pointerdown", this._onPointerDown);
    canvas.addEventListener("pointermove", this._onPointerMove);
    canvas.addEventListener("pointerup", this._onPointerUp);
    canvas.addEventListener("pointercancel", this._onPointerCancel);
    canvas.addEventListener("lostpointercapture", this._onPointerCancel);
    canvas.addEventListener("pointerenter", this._onPointerEnter);
    canvas.addEventListener("pointerleave", this._onPointerLeave);
    canvas.addEventListener("focus", this._onPointerEnter);
    canvas.addEventListener("blur", this._onPointerLeave);

    // Mouse wheel
    canvas.addEventListener("wheel", this._onWheel, { passive: false });

    // Disable right click context manu
    this._mainContainer.addEventListener("contextmenu", this._onContextMenu);

    // Window fallbacks
    window.addEventListener("pointerup", this._onWindowPointerUp);
    window.addEventListener("mouseup", this._onWindowPointerUp);
    document.addEventListener("visibilitychange", this._onVisibilityChange);
  }
  _onPointerDown = (e: PointerEvent) => {
    this._activePointerId = e.pointerId;

    // Left mouse button
    if (e.button === 0) {
      this.isPainting = true;
      this.isErasing = false;
      this.activeButton = "left";
    }
    // Right mouse button
    else if (e.button === 2) {
      this.isErasing = true;
      this.isPainting = false;
      this.activeButton = "right";
    }
    // Middle mouse button
    else {
      this.isPainting = false;
      this.isErasing = false;
      this.activeButton = "none";
    }

    // Capture pointer to keep receiving pointer events even if pointer leaves the canvas
    try {
      this._canvas.setPointerCapture(e.pointerId);
    } catch (err) {}

    // Get canvas dimensions
    const rect: DOMRect = this._canvas.getBoundingClientRect();
    const scaleX: number = this._width / rect.width;
    const scaleY: number = this._height / rect.height;

    // Calculate mouse position relative to the canvas
    this.latestMouseCoords.x = (e.clientX - rect.left) * scaleX;
    this.latestMouseCoords.y = this._canvas.height - (e.clientY - rect.top) * scaleY; // Flip Y
  };
  _onPointerUp = (e: PointerEvent) => {
    if (this._activePointerId === e.pointerId) {
      this._activePointerId = null;
      this.activeButton = "none";
      try {
        this._canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    // Clear flags on pointerup
    this.isPainting = false;
    this.isErasing = false;
  };
  _onPointerMove = (e: PointerEvent) => {
    // Get canvas dimensions
    const rect: DOMRect = this._canvas.getBoundingClientRect();
    const scaleX: number = this._width / rect.width;
    const scaleY: number = this._canvas.height / rect.height;

    // Calculate mouse position relative to the canvas
    this.latestMouseCoords.x = (e.clientX - rect.left) * scaleX;
    this.latestMouseCoords.y = this._canvas.height - (e.clientY - rect.top) * scaleY; // Flip Y

    // Only update if user actually changed hold state mid drag
    if (typeof e.buttons === "number") {
      const leftPressed: boolean = (e.buttons & 1) === 1;
      const rightPressed: boolean = (e.buttons & 2) === 2;
      this.isPainting = leftPressed;
      this.isErasing = rightPressed;
    }
  };
  _onPointerCancel = (e: PointerEvent) => {
    this.isPainting = false;
    this.isErasing = false;

    if (this._activePointerId === e.pointerId) {
      try {
        this._canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
      this._activePointerId = null;
      this.activeButton = "none";
    }
  };
  _onWindowPointerUp = () => {
    this.isPainting = false;
    this.isErasing = false;
    this._activePointerId = null;
    this.activeButton = "none";
  };
  _onVisibilityChange = () => {
    if (document.hidden) {
      this.isPainting = false;
      this.isErasing = false;
      this._activePointerId = null;
      this.activeButton = "none";
    }
  };
  _onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.shouldChangeBrushSize = true;
    this.changeBrushSizeDir = e.deltaY;
  };
  _onContextMenu = (e: PointerEvent) => {
    e.preventDefault();
  };
  _onPointerEnter = () => {
    this.isDrawingOverlay = true;
  };
  _onPointerLeave = () => {
    this.isDrawingOverlay = false;
  };

  // ..
  _addParticlePaletteWindow(particleDataMap: ParticleMap) {
    // Create a new window
    const position: Vector2 = { x: 320, y: 300 };
    const size: Size = { width: 250, height: 200 };
    const maxSize: Size = { width: 420, height: 400 };
    const paletteWindow = new Window(this._mainContainer, "Particle Palette", position, size, maxSize);
    paletteWindow.setContentOrientation("bottom");

    // Add contents for solids, liquids, gases, sands, electronics and settings
    const solidsContent = document.createElement("div");
    solidsContent.classList.add("particle-palette-container");
    paletteWindow.addNewContent(solidsContent, "Solids", "./assets/icons/solid.svg");
    const liquidsContent = document.createElement("div");
    liquidsContent.classList.add("particle-palette-container");
    paletteWindow.addNewContent(liquidsContent, "Liquids", "./assets/icons/liquid.svg");
    const gasesContent = document.createElement("div");
    gasesContent.classList.add("particle-palette-container");
    paletteWindow.addNewContent(gasesContent, "Gases", "./assets/icons/gas.svg");
    const sandsContent = document.createElement("div");
    sandsContent.classList.add("particle-palette-container");
    paletteWindow.addNewContent(sandsContent, "Sands", "./assets/icons/sand.svg");
    const electronicsContent = document.createElement("div");
    electronicsContent.classList.add("particle-palette-container");
    paletteWindow.addNewContent(electronicsContent, "Electronics", "./assets/icons/electronics.svg");
    const settingsContent = new WindowContent();
    paletteWindow.addContentBarSpacer();
    paletteWindow.addNewContent(settingsContent.contentElement, "Settings", "./assets/icons/settings.svg");

    // Select category liquids
    const liquidsCategory = 2;
    const liquidsCategoryIndex = liquidsCategory - 1;
    paletteWindow.displayContent(liquidsCategoryIndex);
    this._selectedCategory = liquidsCategory;

    // Add custom event listener for category buttons
    const categoryButtons: HTMLButtonElement[] = paletteWindow.contentBarButtons;
    const categoryContainers: HTMLDivElement[] = paletteWindow.contents;
    for (let i = 0; i < categoryButtons.length - 1; i++) {
      categoryButtons[i]!.addEventListener("click", () => {
        // Deselect all currently selected particle buttons
        for (const container of categoryContainers) {
          const selectedButton = container.querySelector(".selected");
          if (selectedButton) {
            selectedButton.classList.remove("selected");
          }
        }

        // Select the first particle button
        const categoryContainer = categoryContainers[i];
        if (categoryContainer) {
          const firstParticleButton = categoryContainer.querySelector<HTMLButtonElement>(".particle-button");
          if (firstParticleButton) {
            firstParticleButton.classList.add("selected");
            this._selectedParticle = parseInt(firstParticleButton.dataset.particleId || "-1", 10);
            this._selectedCategory = parseInt(firstParticleButton.dataset.category || "-1", 10);
          }
        }
      });
    }

    // Create particle buttons and append them to each category
    let particleSelected = false;
    for (const key in particleDataMap) {
      const particleData = particleDataMap[key];
      if (!particleData) {
        continue;
      }

      const categoryContainer = categoryContainers[particleData.category - 1];
      if (!categoryContainer) {
        continue;
      }

      // Calculate colors
      const baseColor: string = particleData.baseColor;
      const variantColor: string = particleData.variantColor;
      const luminance: number = color.getLuminance(color.hexToColor(baseColor));
      const textColor: string = luminance > 210 ? "#323238" : "#FFFFFFFF";
      const shadowColor: Color = color.hexToColor(textColor);

      // Create a new particle button
      const newButton = document.createElement("button");
      newButton.className = "particle-button";
      newButton.textContent = particleData.name;
      newButton.style.setProperty("--particle-button-base-color", baseColor);
      newButton.style.setProperty("--particle-button-variant-color", variantColor);
      newButton.style.color = textColor;
      newButton.style.textShadow = `1px 1px 2px rgba(${shadowColor[0]}, ${shadowColor[1]}, ${shadowColor[2]}, 0.6)`;

      // Create datasets for it
      newButton.dataset.particleId = particleData.id.toString();
      newButton.dataset.category = particleData.category.toString();

      // Add event listener for it
      newButton.addEventListener("click", () => {
        // Deselect previously selected particle buttons
        for (const container of categoryContainers) {
          const selectedButton = container.querySelector(".selected");
          if (selectedButton) {
            selectedButton.classList.remove("selected");
          }
        }

        // Select the clicked one
        newButton.classList.add("selected");

        // Update states
        this._selectedParticle = particleData.id;
        this._selectedCategory = particleData.category;
      });

      // Append them to their category
      categoryContainer.appendChild(newButton);

      // Select the first particle with selected category
      if (!particleSelected && particleData.category === this._selectedCategory) {
        newButton.classList.add("selected");
        this._selectedParticle = particleData.id;
        particleSelected = true;
      }
    }
  }

  // Function to generate the overlay map for the circle outline
  _calculateBrushOutline(centerX: number, centerY: number): Pixel[] {
    const radius: number = this._currentBrushSize;
    const pixels: Pixel[] = [];
    const r: number = 227;
    const g: number = 227;
    const b: number = 227;
    const a: number = 180;

    const width: number = this._width;
    const height: number = this._height;
    const offsets: number[] = [-1, 1];

    const plotOctets = (x: number, y: number) => {
      for (const bigY of offsets) {
        for (const bigX of offsets) {
          const newX = centerX + x * bigX;
          const newY = centerY + y * bigY;
          const newx = centerX + y * bigX;
          const newy = centerY + x * bigY;

          if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            const index = (height - newY) * width + newX;
            pixels.push({ index: index, value: new Uint8ClampedArray([r, g, b, a]) as Color });
          }
          if (newx >= 0 && newx < width && newy >= 0 && newy < height) {
            const index = (height - newy) * width + newx;
            pixels.push({ index: index, value: new Uint8ClampedArray([r, g, b, a]) as Color });
          }
        }
      }
    };

    let x: number = radius;
    let y: number = 0;
    let P: number = radius - radius;

    plotOctets(x, y);

    while (y < x) {
      y++;
      if (P < 0) {
        P += 2 * y + 1;
      } else {
        x--;
        P += 2 * (y - x) + 1;
      }
      plotOctets(x, y);
    }
    return pixels;
  }
}
