import type { Renderer } from "../io/renderer";
import type { Grid } from "../structs/grid";
import type { BoggedState } from "../core/bogged_state";
import { WindowManager } from "./window_manager";
import type { ParticleMap } from "../types";

export class InputManager {
  // Dependencies & DOM References
  private readonly boggedState: BoggedState;
  private readonly windowManager: WindowManager;
  private readonly viewport: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;

  // Input States
  private activePointerId: number | null = null;
  private isAppMenuOpen: boolean = false;

  constructor(boggedStateInstance: BoggedState, vieportEl: HTMLDivElement, canvasEl: HTMLCanvasElement, particleData: ParticleMap) {
    // Initialise fields
    this.boggedState = boggedStateInstance;
    this.windowManager = new WindowManager(boggedStateInstance, vieportEl);
    this.viewport = vieportEl;
    this.canvas = canvasEl;

    // Particle palette is openned at startup
    this.windowManager.addPaletteWindow(particleData);

    // Bind inputs to DOM elements
    this.bindAppMenuEvents();
    this.bindCanvasEvents();

    // Disable right click context menu on viewport
    this.viewport.addEventListener("contextmenu", (e: PointerEvent) => {
      e.preventDefault();
    });

    // Global listener for closing any opened app menu
    document.addEventListener("click", (event) => {
      // App menu is closed, return
      if (!this.isAppMenuOpen) {
        return;
      }

      // Close app menu if the click occured outside the app menu's item
      const isClickOnMenubar = (event.target as HTMLElement)?.closest(".app-menu__menu-item");
      if (!isClickOnMenubar) {
        const openDropdowns = document.querySelectorAll(".app-menu__dropdown[style*='block']");
        openDropdowns.forEach((el) => {
          (el as HTMLDivElement).style.display = "none";
        });
        this.isAppMenuOpen = false;
      }
    });
  }

  // --------- Helper Functions ---------

  // Bind app menu event lisnteners
  private bindAppMenuEvents() {
    this._processAppMenuItem("bog-menu-item", ["About bog engine", "Settings", "Quit"]);
    this._processAppMenuItem("file-item", ["Save", "Load", "New scene", "Exit"]);
    this._processAppMenuItem("edit-item", ["Undo", "Redo", "Preferences"]);
    this._processAppMenuItem("view-item", ["Zoom In", "Zoom Out", "Reset View"]);
    this._processAppMenuItem("help-item", ["Documentation", "Report Issue"]);
  }
  _processAppMenuItem(id: string, items: string[]) {
    const createAppMenuDropBar = (itemEl: HTMLDivElement, itemList: string[]) => {
      const listEl = document.createElement("div");
      listEl.classList.add("app-menu__dropdown");
      listEl.style.display = "none";
      itemList.forEach((text) => {
        const el = document.createElement("div");
        el.classList.add("app-menu__dropdown-item");
        el.textContent = text;
        listEl.appendChild(el);
      });

      itemEl.appendChild(listEl);
      return listEl;
    };

    const createAppMenuListeners = (itemEl: HTMLDivElement, listEl: HTMLDivElement) => {
      itemEl.addEventListener("click", (event) => {
        event.stopPropagation();

        // Close all other dropdowns
        const currentlyOpen = document.querySelector(".app-menu__dropdown[style*='block']");
        if (currentlyOpen && currentlyOpen !== listEl) {
          (currentlyOpen as HTMLDivElement).style.display = "none";
        }

        // Toggle this dropdown
        if (listEl.style.display === "block") {
          listEl.style.display = "none";
          this.isAppMenuOpen = false;
        } else {
          listEl.style.display = "block";
          this.isAppMenuOpen = true;
        }
      });
      itemEl.addEventListener("mouseenter", () => {
        if (this.isAppMenuOpen && listEl.style.display !== "block") {
          const currentlyOpen = document.querySelector(".app-menu__dropdown[style*='block']");
          if (currentlyOpen && currentlyOpen !== listEl) {
            (currentlyOpen as HTMLDivElement).style.display = "none";
          }
          // Open this dropdown
          listEl.style.display = "block";
        }
      });
    };

    const itemEl = document.getElementById(id);
    if (itemEl instanceof HTMLDivElement) {
      const dropDownEl = createAppMenuDropBar(itemEl, items);
      createAppMenuListeners(itemEl, dropDownEl);
    }
  }

  // Bind canvas related event listeners
  private bindCanvasEvents() {
    // Helper functions for this function
    const releaseCanvasPointerCapture = (e: PointerEvent) => {
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Pointer capture error:", err);
        }
      }
    };
    const setCanvasPointerCapture = (e: PointerEvent) => {
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Pointer capture error:", err);
        }
      }
    };
    const updateMouseCoords = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.boggedState.gameWidth / rect.width;
      const scaleY = this.boggedState.gameHeight / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = this.canvas.height - (e.clientY - rect.top) * scaleY;
      this.boggedState.mouseX = mouseX;
      this.boggedState.mouseY = mouseY;
    };

    // Handle when pointer button is pressed
    this.canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      // Update mouse coordinates
      updateMouseCoords(e);

      switch (e.button) {
        case 0: // Left Click
          this.boggedState.isLeftMouseButtonDown = true;
          break;

        case 2: // Right Clicl
          this.boggedState.isRightMouseButtonDown = true;
          break;

        default:
          this.boggedState.isLeftMouseButtonDown = false;
          this.boggedState.isRightMouseButtonDown = false;
          break;
      }

      // Capture pointer to keep receiving pointer events even if pointer leaves the canvas
      setCanvasPointerCapture(e);
      this.activePointerId = e.pointerId;
    });

    // Handle when pointer moves
    this.canvas.addEventListener("pointermove", (e: PointerEvent) => {
      // Update mouse coordinates
      updateMouseCoords(e);

      // Update pointer button if user changed hold state mid drag
      if (typeof e.buttons === "number") {
        this.boggedState.isLeftMouseButtonDown = (e.buttons & 1) === 1;
        this.boggedState.isRightMouseButtonDown = (e.buttons & 2) === 2;
      }
    });

    // Handle when pointer button is released
    this.canvas.addEventListener("pointerup", (e: PointerEvent) => {
      if (this.activePointerId === e.pointerId) {
        releaseCanvasPointerCapture(e);
        this.activePointerId = null;
      }

      this.boggedState.isLeftMouseButtonDown = false;
      this.boggedState.isRightMouseButtonDown = false;
    });

    // Handle when pointer button aborted unexpectedly
    this.canvas.addEventListener("pointercancel", (e: PointerEvent) => {
      if (this.activePointerId === e.pointerId) {
        releaseCanvasPointerCapture(e);
        this.activePointerId = null;
      }

      this.boggedState.isLeftMouseButtonDown = false;
      this.boggedState.isRightMouseButtonDown = false;
    });

    // Handle when canvas losts pointer
    this.canvas.addEventListener("lostpointercapture", (e: PointerEvent) => {
      if (this.activePointerId === e.pointerId) {
        releaseCanvasPointerCapture(e);
        this.activePointerId = null;
      }

      this.boggedState.isLeftMouseButtonDown = false;
      this.boggedState.isRightMouseButtonDown = false;
    });

    // Handle when pointer enters the canvas area
    this.canvas.addEventListener("pointerenter", () => {
      this.boggedState.isBrushOutlineVisible = true;
    });

    // Handle when pointer leaves the canvas area
    this.canvas.addEventListener("pointerleave", () => {
      this.boggedState.isBrushOutlineVisible = false;
    });

    // Handle when canvas is focused
    this.canvas.addEventListener("focus", () => {
      this.boggedState.isBrushOutlineVisible = true;
    });

    // Handle when canvas is unfocused
    this.canvas.addEventListener("blur", () => {
      this.boggedState.isBrushOutlineVisible = false;
    });

    // Handle when mouse wheel event occurs
    this.canvas.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        e.preventDefault();
        const scrollDelta: number = Math.floor(this.boggedState.currentBrushSize - e.deltaY * this.boggedState.brushSensitivity);
        const newSize: number = Math.max(0, Math.min(scrollDelta, this.boggedState.brushMaxSize));
        this.boggedState.currentBrushSize = newSize;
      },
      { passive: false }
    );

    // Handle window fallback events
    window.addEventListener("pointerup", () => {
      this.boggedState.isLeftMouseButtonDown = false;
      this.boggedState.isRightMouseButtonDown = false;
      this.activePointerId = null;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.boggedState.isLeftMouseButtonDown = false;
        this.boggedState.isRightMouseButtonDown = false;
        this.activePointerId = null;
      }
    });
  }
}
