import type { BogEngine } from "../core/bog_engine";
import { WindowManager, WindowType } from "./window_manager";

export class UIManager {
  // Dependencies
  private readonly bogEngine: BogEngine;
  private readonly windowManager: WindowManager;

  private isAppMenuOpen: boolean = false;

  constructor(
    bogEngine: BogEngine,
    windowManager: WindowManager,
    appMenuEl: HTMLDivElement,
    canvasEl: HTMLCanvasElement,
    width: number,
    height: number
  ) {
    this.bogEngine = bogEngine;
    this.windowManager = windowManager;

    // Set up app menu
    this.setupAppMenu(appMenuEl);

    // Configure canvas and canvas context
    canvasEl.addEventListener("contextmenu", this.onViewportContextMenu);
    canvasEl.width = width;
    canvasEl.height = height;
    canvasEl.style.aspectRatio = (width / height).toString();
    const ctx = canvasEl.getContext("2d") as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(0, height);
    ctx.scale(1, -1);
    ctx.transform(1, 0, 0, -1, 0, canvasEl.height);

    // Display palette window on startup
    windowManager.openWindow(WindowType.Palette);
  }

  private setupAppMenu(appMenuEl: HTMLDivElement) {
    const menuData = [
      { id: "bog-menu-item", items: ["Settings", "Quit"] },
      { id: "world-item", items: ["Particle Palette"] },
      { id: "debug-item", items: ["Quick Look", "Stats", "Debug Menu"] },
      { id: "help-item", items: ["About", "Report Issue"] },
    ];

    // Create dropdowns for each menu
    const dropdownItems: HTMLDivElement[] = [];
    for (let i = 0; i < menuData.length; i++) {
      const data = menuData[i]!;

      // Get app menu button
      const menuButtonEl = appMenuEl.querySelector(`#${data.id}`);
      if (!(menuButtonEl instanceof HTMLDivElement)) {
        throw new Error(`Menu button of id ${data.id} not found on App menu.`);
      }

      // Create a dropdown for this menu
      const dropdown = this.createMenuDropdown(menuButtonEl, data.items);
      dropdown.items.forEach((item) => {
        dropdownItems.push(item);
      });

      // Bind event listeners for this menu
      const dropdownEl = dropdown.element;
      menuButtonEl.addEventListener("click", (e) => {
        this.onAppMenuButtonClick(e, dropdownEl);
      });
      menuButtonEl.addEventListener("mouseenter", () => {
        this.onAppMenuButtonMouseEnter(dropdownEl);
      });
    }

    // Add event listeners for each dropdown items
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

    // Add a global listener for closing any opened app menu on left click
    document.addEventListener("click", () => {
      const openDropdownEl = document.querySelector(".app-menu__dropdown.is-open");
      if (openDropdownEl instanceof HTMLDivElement) {
        openDropdownEl.classList.remove("is-open");
        this.isAppMenuOpen = false;
      }
    });
  }

  // ========================================================
  // ----------------- Helper Functions ---------------------

  private createMenuDropdown(buttonEl: HTMLDivElement, itemNames: string[]): { element: HTMLDivElement; items: HTMLDivElement[] } {
    const menuEl = document.createElement("div");
    menuEl.classList.add("app-menu__dropdown");

    // Create dropmenu items and add them to the menu
    let items: HTMLDivElement[] = [];
    itemNames.forEach((name) => {
      const itemEl = document.createElement("div");
      itemEl.classList.add("app-menu__dropdown-item", "is-disabled");
      itemEl.textContent = name;
      menuEl.appendChild(itemEl);
      items.push(itemEl);
    });

    buttonEl.appendChild(menuEl);
    return { element: menuEl, items: items };
  }

  // ========================================================
  // -------------- Event Listener Functions ----------------

  private onAppMenuButtonClick = (e: MouseEvent, dropdownEl: HTMLDivElement) => {
    e.stopPropagation();

    // Close previously openned dropdown
    const openDropdownEl = document.querySelector(".app-menu__dropdown.is-open");
    if (openDropdownEl && openDropdownEl !== dropdownEl) {
      openDropdownEl.classList.remove("is-open");
    }

    // Toggle dropdown for this button
    const isOpen = dropdownEl.classList.toggle("is-open");
    this.isAppMenuOpen = isOpen;
  };

  private onAppMenuButtonMouseEnter = (dropdownEl: HTMLDivElement) => {
    // App menu is open and dropdown element is not opened
    if (this.isAppMenuOpen && !dropdownEl.classList.contains("is-open")) {
      // Close previously openned dropdown
      const openDropdownEl = document.querySelector(".app-menu__dropdown.is-open");
      if (openDropdownEl && openDropdownEl !== dropdownEl) {
        openDropdownEl.classList.remove("is-open");
      }

      // Open dropdown for this button
      dropdownEl.classList.add("is-open");
    }
  };

  private onViewportContextMenu = (e: PointerEvent) => {
    e.preventDefault();
  };
}
