import type { Color, GameSettings, ParticleMap, Pixel, Vector2 } from "../types";
import type { Renderer } from "../io/renderer";
import { color } from "../structs/color_utils";
import type { Grid } from "../structs/grid";

export class InputManager {
  #renderer: Renderer;

  // DOMs and input default settings
  #width: number;
  #height: number;
  #mainContainer: HTMLDivElement;
  #canvas: HTMLCanvasElement;
  #particleDataMap: ParticleMap;

  // Input variables
  #brushSizeSensitivity: number;
  #maxBrushSize: number;
  #selectedParticle: number;
  #selectedCategory: number;
  #currentBrushSize: number;
  #currentPressure: number;
  #currentConcentration: number;

  // Input states
  #selectedParticleButton: HTMLButtonElement | null;
  #selectedCategoryButton: HTMLButtonElement | null;
  #activePointerId: number | null;

  // Event listeners flags and states
  isPainting: boolean;
  isErasing: boolean;
  isDrawingOverlay: boolean;
  shouldChangeBrushSize: boolean;
  changeBrushSizeDir: number;
  latestMouseCoords: Vector2;
  activeButton: string;

  constructor(
    inputWidth: number,
    inputHeight: number,
    settings: GameSettings,
    particleDataMap: ParticleMap,
    inputContainer: HTMLDivElement,
    canvas: HTMLCanvasElement,
    rendererInstance: Renderer
  ) {
    this.#renderer = rendererInstance;

    this.#width = inputWidth;
    this.#height = inputHeight;
    this.#mainContainer = inputContainer;
    this.#canvas = canvas;
    this.#particleDataMap = particleDataMap;

    this.#brushSizeSensitivity = settings.BRUSH_SENSITIVITY;
    this.#maxBrushSize = settings.BRUSH_MAX_SIZE;
    this.#selectedParticle = settings.SELECTED_PARTICLE;
    this.#selectedCategory = settings.SELECTED_CATEGORY;
    this.#currentBrushSize = settings.BRUSH_CUR_SIZE;
    this.#currentPressure = settings.CURRENT_PRESSURE;
    this.#currentConcentration = settings.CURRENT_CONCENTRATION;

    this.#selectedParticleButton = null;
    this.#selectedCategoryButton = null;
    this.#activePointerId = null;

    this.isPainting = false;
    this.isErasing = false;
    this.isDrawingOverlay = true;
    this.shouldChangeBrushSize = false;
    this.changeBrushSizeDir = 0;
    this.latestMouseCoords = { x: 0, y: 0 };
    this.activeButton = "none";

    // Initialise UI elements
    const categoryBar = document.getElementById("particle-category-bar");
    if (!categoryBar) {
      throw new Error("DOM element of id 'particle-category-bar' does not exist.");
    }
    this.#initCategoryButtons(categoryBar as HTMLDivElement);

    const buttonContainer = document.getElementById("particle-button-container");
    if (!buttonContainer) {
      throw new Error("DOM element of id 'particle-button-container' does not exist.");
    }
    this.#initParticleButtons(buttonContainer as HTMLDivElement);

    // Bind listeners
    this.#addEventListeners();

    // Select a default category
    if (this.#selectedCategoryButton) {
      this.#updateParticlePalette(this.#selectedCategoryButton);
    }
  }
  // --------- Public Methods ---------

  processInput(grid: Grid, renderer: Renderer) {
    const mouseX: number = this.latestMouseCoords.x;
    const mouseY: number = this.latestMouseCoords.y;
    const mousePosition: Vector2 = { x: Math.floor(mouseX), y: Math.floor(mouseY) };

    // --- Handle UI rendering ---
    if (this.isDrawingOverlay) {
      const brushOutlineOverlay: Pixel[] = this.#calculateBrushOutline(mousePosition.x, mousePosition.y);
      renderer.queueOverlayPixels(brushOutlineOverlay);
    }

    // --- Handle input ---

    // Paint particles
    if (this.isPainting || this.isErasing) {
      // Check if the cursor is inside the canvas
      const isInXBounds: boolean = mousePosition.x < this.#width + this.#currentBrushSize && mousePosition.x >= 0 - this.#currentBrushSize;
      const isInYBounds: boolean = mousePosition.y < this.#height + this.#currentBrushSize && mousePosition.y >= 0 - this.#currentBrushSize;
      if (isInXBounds && isInYBounds) {
        const x = mousePosition.x;
        const y = mousePosition.y;
        const particleId: number = this.isPainting ? this.#selectedParticle : 0; // We are erasing
        grid.fillCircleAt(x, y - 1, this.#currentBrushSize, particleId);
      }
    }

    // Change brush size
    if (this.shouldChangeBrushSize) {
      // Calculate new brush size
      const scrollDelta: number = this.changeBrushSizeDir * this.#brushSizeSensitivity;
      let newSize: number = this.#currentBrushSize - scrollDelta;

      // Clamp it between 0 and max brush size
      newSize = Math.floor(newSize);
      newSize = Math.min(this.#maxBrushSize, newSize);
      newSize = Math.max(0, newSize);

      // Set the new brush size
      this.#currentBrushSize = newSize;
      this.changeBrushSizeDir = 0;
    }
  }

  // --------- Helper Functions ---------

  // Function to generate the overlay map for the circle outline
  #calculateBrushOutline(centerX: number, centerY: number): Pixel[] {
    const radius: number = this.#currentBrushSize;
    const pixels: Pixel[] = [];
    const r: number = 227;
    const g: number = 227;
    const b: number = 227;
    const a: number = 180;

    const width: number = this.#width;
    const height: number = this.#height;
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

  // ..
  #updateParticlePalette(categoryButton: HTMLButtonElement) {
    // Unselect old category button and selected the new one
    if (this.#selectedCategoryButton) {
      this.#selectedCategoryButton.classList.remove("selected");
    }
    categoryButton.classList.add("selected");

    // Update selected category
    this.#selectedCategoryButton = categoryButton;
    const newSelectedCategory: number | null = parseInt(categoryButton.dataset.categoryId!);
    this.#selectedCategory = newSelectedCategory ? newSelectedCategory : 1;

    // ! Todo : Show only the relevant UI controls based on the selected category

    // Update particle buttons to only show particles of selected category
    let particleButtonToSelect: HTMLButtonElement | null = null;
    if (this.#particleDataMap[this.#selectedParticle] !== undefined) {
      const particleData = this.#particleDataMap[this.#selectedParticle];

      if (particleData && particleData.category === this.#selectedCategory) {
        if (this.#selectedParticleButton) {
          particleButtonToSelect = this.#selectedParticleButton;
        }
      }
    }

    document.querySelectorAll(".particle-button").forEach((element) => {
      const button = element as HTMLButtonElement;
      const categoryValue = button.dataset.category;

      if (categoryValue && parseInt(categoryValue) === this.#selectedCategory) {
        button.style.display = "";

        // Get the first button of selected category to be selected if no initial button was selected
        if (!particleButtonToSelect) {
          particleButtonToSelect = button;
        }
      } else {
        button.style.display = "none";
      }
    });

    // Update select particle
    this.#updateSelectedParticle(particleButtonToSelect);
  }

  #updateSelectedParticle(particleButton: HTMLButtonElement | null) {
    // Do not update selected particle if no valid particle button is given
    if (!particleButton) return;

    // Unselect old particle button and selected the new one
    if (this.#selectedParticleButton) {
      this.#selectedParticleButton.classList.remove("selected");
    }
    particleButton.classList.add("selected");

    // Update selected particle and selected particle button
    this.#selectedParticleButton = particleButton;
    const newSelectedParticle: number = parseInt(particleButton.dataset.particleId!);
    this.#selectedParticle = newSelectedParticle ? newSelectedParticle : 0;
  }

  // ..
  #initCategoryButtons(categoryBar: HTMLDivElement) {
    // Clear category bar of any existing HTML elements
    categoryBar.innerHTML = "";

    // Create and append all category buttons

    // Category: Solid
    let solidCategoryButton = this.#createCategoryButton(1, "Solids", "./assets/icons/solid.svg");
    categoryBar.appendChild(solidCategoryButton);
    if (this.#selectedCategory == 1) {
      this.#selectedCategoryButton = solidCategoryButton;
    }

    // Category: Liquid
    let liquidCategoryButton = this.#createCategoryButton(2, "Liquids", "./assets/icons/liquid.svg");
    categoryBar.appendChild(liquidCategoryButton);
    if (this.#selectedCategory == 2) {
      this.#selectedCategoryButton = liquidCategoryButton;
    }

    // Category: Gas
    let gasCategoryButton = this.#createCategoryButton(3, "Gases", "./assets/icons/gas.svg");
    categoryBar.appendChild(gasCategoryButton);
    if (this.#selectedCategory == 3) {
      this.#selectedCategoryButton = gasCategoryButton;
    }

    // Category: Sand
    let sandCategoryButton = this.#createCategoryButton(4, "Sands", "./assets/icons/sand.svg");
    categoryBar.appendChild(sandCategoryButton);
    if (this.#selectedCategory == 4) {
      this.#selectedCategoryButton = sandCategoryButton;
    }

    // Category: Electronic
    let electronicCategoryButton = this.#createCategoryButton(5, "Electronics", "./assets/icons/electronics.svg");
    categoryBar.appendChild(electronicCategoryButton);
    if (this.#selectedCategory == 5) {
      this.#selectedCategoryButton = electronicCategoryButton;
    }

    // Select a hardcoded default category button
    if (!this.#selectedCategoryButton) {
      this.#selectedCategoryButton = sandCategoryButton;
    }
  }

  // ..
  #createCategoryButton(id: number, name: string, iconSource: string): HTMLButtonElement {
    // Create new category button
    const outButton = document.createElement("button");
    outButton.className = "category-button";

    // Create category image icon for this button
    const categoryIcon = document.createElement("img");
    categoryIcon.src = iconSource;
    categoryIcon.alt = name;
    categoryIcon.classList.add("category-icon");

    // Add datasets and return
    outButton.dataset.categoryId = id.toString();
    outButton.appendChild(categoryIcon);

    return outButton;
  }

  // ..
  #initParticleButtons(buttonContainer: HTMLDivElement) {
    // Clear particle container of any existing HTML elements
    buttonContainer.innerHTML = "";

    // Create and append particle buttons
    for (const key in this.#particleDataMap) {
      const particle = this.#particleDataMap[key];

      // Particle does not exist, don't create a UI button for it
      if (!particle) {
        continue;
      }

      // Create a new particle button
      const newButton = document.createElement("button");
      newButton.className = "particle-button";
      newButton.textContent = particle.name;

      // Apply background and text colors
      const particleBaseColor: string = particle.baseColor;
      const particleVariantColor: string = particle.variantColor;

      // Calculate text and shadow colors
      const luminance: number = color.getLuminance(color.hexToColor(particleBaseColor));
      const particleTextColor: string = luminance > 210 ? "#323238" : "#FFFFFFFF";
      const inverseShadowColor: Color = color.hexToColor(particleTextColor);

      newButton.style.setProperty("--particle-button-base-color", particleBaseColor);
      newButton.style.setProperty("--particle-button-variant-color", particleVariantColor);
      newButton.style.color = particleTextColor;
      newButton.style.textShadow = `1px 1px 2px rgba(${inverseShadowColor[0]}, ${inverseShadowColor[1]}, ${inverseShadowColor[2]}, 0.6)`;

      // Add datasets and append it to particle button container
      newButton.dataset.particleId = particle.id.toString();
      newButton.dataset.category = particle.category.toString();
      buttonContainer.appendChild(newButton);

      if (particle.id === this.#selectedParticle) {
        this.#selectedParticleButton = newButton;
      }
    }
  }

  // ..
  #addEventListeners() {
    // Get references to DOM elements
    const canvas = this.#canvas;
    const particleCategoryBar = document.getElementById("particle-category-bar");
    const particleButtonContainer = document.getElementById("particle-button-container");

    if (!particleCategoryBar || !particleButtonContainer) {
      throw new Error("Cannot find category bar and/ or button container");
    }

    // Pointer events (mouse, touch, and stylus)
    canvas.addEventListener("pointerdown", this.#onPointerDown);
    canvas.addEventListener("pointermove", this.#onPointerMove);
    canvas.addEventListener("pointerup", this.#onPointerUp);
    canvas.addEventListener("pointercancel", this.#onPointerCancel);
    canvas.addEventListener("lostpointercapture", this.#onPointerCancel);
    canvas.addEventListener("pointerenter", this.#onPointerEnter);
    canvas.addEventListener("pointerleave", this.#onPointerLeave);

    // Mouse wheel
    canvas.addEventListener("wheel", this.#onWheel, { passive: false });

    // Disable right click context manu
    this.#mainContainer.addEventListener("contextmenu", this.#onContextMenu);

    // Window fallbacks
    window.addEventListener("pointerup", this.#onWindowPointerUp);
    window.addEventListener("mouseup", this.#onWindowPointerUp); // fallback
    document.addEventListener("visibilitychange", this.#onVisibilityChange);

    // Category bar and button container
    particleCategoryBar.addEventListener("click", (e: MouseEvent) => {
      if (!e.target) {
        return;
      }

      const targetElement = e.target as HTMLElement;
      const button = targetElement.closest(".category-button");
      if (!button) {
        return;
      }
      if (button) this.#updateParticlePalette(button as HTMLButtonElement);
    });
    particleButtonContainer.addEventListener("click", (e: MouseEvent) => {
      if (!e.target) {
        return;
      }

      const targetElement = e.target as HTMLElement;
      const button = targetElement.closest(".particle-button");
      if (button) this.#updateSelectedParticle(button as HTMLButtonElement);
    });
  }
  #onPointerDown = (e: PointerEvent) => {
    this.#activePointerId = e.pointerId;

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
      this.#canvas.setPointerCapture(e.pointerId);
    } catch (err) {}

    // Get canvas dimensions
    const rect: DOMRect = this.#canvas.getBoundingClientRect();
    const scaleX: number = this.#width / rect.width;
    const scaleY: number = this.#height / rect.height;

    // Calculate mouse position relative to the canvas
    this.latestMouseCoords.x = (e.clientX - rect.left) * scaleX;
    this.latestMouseCoords.y = this.#canvas.height - (e.clientY - rect.top) * scaleY; // Flip Y
  };
  #onPointerUp = (e: PointerEvent) => {
    if (this.#activePointerId === e.pointerId) {
      this.#activePointerId = null;
      this.activeButton = "none";
      try {
        this.#canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    // Clear flags on pointerup
    this.isPainting = false;
    this.isErasing = false;
  };
  #onPointerMove = (e: PointerEvent) => {
    // Get canvas dimensions
    const rect: DOMRect = this.#canvas.getBoundingClientRect();
    const scaleX: number = this.#width / rect.width;
    const scaleY: number = this.#canvas.height / rect.height;

    // Calculate mouse position relative to the canvas
    this.latestMouseCoords.x = (e.clientX - rect.left) * scaleX;
    this.latestMouseCoords.y = this.#canvas.height - (e.clientY - rect.top) * scaleY; // Flip Y

    // Only update if user actually changed hold state mid drag
    if (typeof e.buttons === "number") {
      const leftPressed: boolean = (e.buttons & 1) === 1;
      const rightPressed: boolean = (e.buttons & 2) === 2;
      this.isPainting = leftPressed;
      this.isErasing = rightPressed;
    }
  };
  #onPointerCancel = (e: PointerEvent) => {
    this.isPainting = false;
    this.isErasing = false;

    if (this.#activePointerId === e.pointerId) {
      try {
        this.#canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
      this.#activePointerId = null;
      this.activeButton = "none";
    }
  };
  #onWindowPointerUp = () => {
    this.isPainting = false;
    this.isErasing = false;
    this.#activePointerId = null;
    this.activeButton = "none";
  };
  #onVisibilityChange = () => {
    if (document.hidden) {
      this.isPainting = false;
      this.isErasing = false;
      this.#activePointerId = null;
      this.activeButton = "none";
    }
  };
  #onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.shouldChangeBrushSize = true;
    this.changeBrushSizeDir = e.deltaY;
  };
  #onContextMenu = (e: PointerEvent) => {
    e.preventDefault();
  };
  #onPointerEnter = (e: PointerEvent) => {
    this.isDrawingOverlay = true;
  };
  #onPointerLeave = (e: PointerEvent) => {
    this.isDrawingOverlay = false;
  };
}
