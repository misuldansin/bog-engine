import type { BoggedState } from "../core/bogged_state";
import { WindowManager, WindowType } from "./window_manager";
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

  constructor(boggedStateInstance: BoggedState, vieportEl: HTMLDivElement, canvasEl: HTMLCanvasElement) {
    // Initialise fields
    this.boggedState = boggedStateInstance;
    this.windowManager = new WindowManager(vieportEl, boggedStateInstance);
    this.viewport = vieportEl;
    this.canvas = canvasEl;

    // Particle palette is openned at startup

    // Bind inputs to DOM elements
    this.initAppMenu();
    this.bindCanvasEvents();

    // Disable right click context menu on viewport
    this.viewport.addEventListener("contextmenu", (e: PointerEvent) => {
      e.preventDefault();
    });

    // Global listener for closing any opened app menu
    document.addEventListener("click", () => {
      const openDropdown = document.querySelector(".app-menu__dropdown.is-open");
      if (openDropdown instanceof HTMLDivElement) {
        openDropdown.classList.remove("is-open");
        this.isAppMenuOpen = false;
      }
    });

    // Open palette window on startup
    this.windowManager.openWindow(WindowType.Palette);
  }

  // --------- Helper Functions ---------

  // Initiale app menu and it's dropdowns and populate them
  private initAppMenu() {
    const menuData = [
      { id: "bog-menu-item", items: ["Settings", "Quit"] },
      { id: "world-item", items: ["Particle Palette"] },
      { id: "debug-item", items: ["Quick Look", "Stats", "Debug Menu"] },
      { id: "help-item", items: ["About", "Report Issue"] },
    ];

    // Create dropdown menus and bind events for appmenu buttons
    const dropdownItems: HTMLDivElement[] = [];
    for (let i = 0; i < menuData.length; i++) {
      const data = menuData[i];
      if (!data) continue;

      // Get menu button elements
      const menuEl = document.getElementById(data.id);
      if (!(menuEl instanceof HTMLDivElement)) continue;

      // Create dropdown for this menu
      const dropdown = this.createAppMenuDropdowns(menuEl, data.items);
      dropdown.items.forEach((item) => {
        dropdownItems.push(item);
      });

      // Bind event listeners for this menu
      const dropdownMenu = dropdown.menu;
      menuEl.addEventListener("click", (event) => {
        event.stopPropagation();

        // Close any previously openned dropdown menu
        const openDropdown = document.querySelector(".app-menu__dropdown.is-open");
        if (openDropdown && openDropdown !== dropdownMenu) {
          openDropdown.classList.remove("is-open");
        }

        // Toggle this dropdown
        const isOpen = dropdownMenu.classList.toggle("is-open");
        this.isAppMenuOpen = isOpen;
      });
      menuEl.addEventListener("mouseenter", () => {
        if (this.isAppMenuOpen && !dropdownMenu.classList.contains("is-open")) {
          // Close any previously openned dropdown menu
          const openDropdown = document.querySelector(".app-menu__dropdown.is-open");
          if (openDropdown && openDropdown !== dropdownMenu) {
            openDropdown.classList.remove("is-open");
          }

          // Open this dropdown
          dropdownMenu.classList.add("is-open");
        }
      });
    }

    // Bind event listeners for dropdown items
    dropdownItems.forEach((itemEl) => {
      const text = itemEl.textContent;

      switch (text) {
        case "Particle Palette":
          itemEl.classList.remove("is-disabled");
          itemEl.addEventListener("click", () => {
            this.windowManager.openWindow(WindowType.Palette);
          });
          break;
        case "Stats":
          itemEl.classList.remove("is-disabled");
          itemEl.addEventListener("click", () => {
            this.windowManager.openWindow(WindowType.DebugStats);
          });
          break;
        case "Quick Look":
          itemEl.classList.remove("is-disabled");
          itemEl.addEventListener("click", () => {
            this.windowManager.openWindow(WindowType.DebugQuickLook);
          });
          break;
        case "About":
          itemEl.classList.remove("is-disabled");
          itemEl.addEventListener("click", () => {
            window.open("https://github.com/misuldansin/bog-engine/", "_blank");
          });
          break;
        case "Report Issue":
          itemEl.classList.remove("is-disabled");
          itemEl.addEventListener("click", () => {
            window.open("https://github.com/misuldansin/bog-engine/issues/new", "_blank");
          });
          break;
        default:
          break;
      }
    });
  }

  // Creates app menu dropdown menus and populates it's items
  private createAppMenuDropdowns(buttonEl: HTMLDivElement, itemNames: string[]): { menu: HTMLDivElement; items: HTMLDivElement[] } {
    const menuEl = document.createElement("div");
    menuEl.classList.add("app-menu__dropdown");

    // Create dropmenu items and append them to the menu element
    let items: HTMLDivElement[] = [];
    itemNames.forEach((name) => {
      const itemEl = document.createElement("div");
      itemEl.classList.add("app-menu__dropdown-item", "is-disabled");
      itemEl.textContent = name;
      menuEl.appendChild(itemEl);
      items.push(itemEl);
    });
    buttonEl.appendChild(menuEl);
    return { menu: menuEl, items: items };
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
