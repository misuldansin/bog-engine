import type { Color, ContentBarOrientation, Index, Size, Vector2, ParticleData } from "../types";
import { Window } from "../io/window";
import { WindowContent } from "../io/window_content";
import { color } from "../structs/color_utils";
import type { BogEngine } from "../core/bog_engine";

export enum WindowType {
  Palette = 1,
  DebugStats = 2,
  DebugQuickLook = 3,
}

export class WindowManager {
  // Dependencies and DOM elemements
  private readonly bogEngine: BogEngine;
  private readonly host: HTMLDivElement;

  // Window instances
  private windows = new Map<WindowType, Window | null>();

  // Window specific properties
  private selectedElementButton: HTMLButtonElement | null = null;

  constructor(bogEngine: BogEngine, hostEl: HTMLDivElement) {
    this.bogEngine = bogEngine;
    this.host = hostEl;

    this.addWindowDropdownListener();
  }

  // ========================================================
  // ------------------ Public Functions --------------------

  public openWindow(type: WindowType, position?: Vector2) {
    const windowInstance = this.getOrCreateWindow(type);

    if (windowInstance && !windowInstance.isVisible) {
      windowInstance.setVisibility(true);
    }
  }

  public closeWindow(type: WindowType) {
    const windowInstance = this.windows.get(type);

    if (windowInstance && windowInstance.isVisible) {
      windowInstance.setVisibility(false);
    }
  }

  public toggleWindow(type: WindowType, position?: Vector2) {
    const windowInstance = this.getOrCreateWindow(type);

    if (windowInstance) {
      if (windowInstance.isVisible) {
        windowInstance.setVisibility(false);
      } else {
        windowInstance.setVisibility(true);
      }
    }
  }

  // ========================================================
  // ------------------ Helper Functions --------------------

  private getOrCreateWindow(type: WindowType): Window | undefined {
    let windowInstance = this.windows.get(type);

    // If window doesn't exists, try and make one
    if (!windowInstance) {
      switch (type) {
        case WindowType.Palette:
          windowInstance = this.createPaletteWindow();
          break;
        case WindowType.DebugStats:
          windowInstance = this.createDebugStatsWindow();
          break;
        case WindowType.DebugQuickLook:
          windowInstance = this.createQuickLookWindow();
          break;
        default:
          return undefined;
      }
      this.windows.set(type, windowInstance);
    }

    return windowInstance;
  }

  private createPaletteWindow(): Window {
    const setupContents = (paletteWindow: Window): HTMLDivElement[] => {
      const outcContents: HTMLDivElement[] = [];

      // Add content for each categories
      const solidsContent = document.createElement("div");
      solidsContent.classList.add("particle-palette-container");
      paletteWindow.addNewContent(solidsContent, "Solids", "./assets/icons/solid.svg");
      outcContents.push(solidsContent);

      const liquidsContent = document.createElement("div");
      liquidsContent.classList.add("particle-palette-container");
      paletteWindow.addNewContent(liquidsContent, "Liquids", "./assets/icons/liquid.svg");
      outcContents.push(liquidsContent);

      const gasesContent = document.createElement("div");
      gasesContent.classList.add("particle-palette-container");
      paletteWindow.addNewContent(gasesContent, "Gases", "./assets/icons/gas.svg");
      outcContents.push(gasesContent);

      const sandsContent = document.createElement("div");
      sandsContent.classList.add("particle-palette-container");
      paletteWindow.addNewContent(sandsContent, "Sands", "./assets/icons/sand.svg");
      outcContents.push(sandsContent);

      const electronicsContent = document.createElement("div");
      electronicsContent.classList.add("particle-palette-container");
      paletteWindow.addNewContent(electronicsContent, "Electronics", "./assets/icons/electronics.svg");
      outcContents.push(electronicsContent);

      // Add a settings content at the end

      const settingsContent = new WindowContent();
      let { button, items } = settingsContent.addDropdownButton(
        "Orientation",
        ["Top", "Left", "Right", "Bottom"],
        3,
        "palette-orientation"
      );
      items.forEach((item) => {
        item.addEventListener("click", () => {
          const newOrientation = item.dataset.value as ContentBarOrientation;
          if (newOrientation) paletteWindow.setContentBarOrientation(newOrientation);
        });
      });
      paletteWindow.addContentBarSeparator(true); // Separate the settings content
      paletteWindow.addNewContent(settingsContent.contentElement, "Settings", "./assets/icons/settings.svg");
      outcContents.push(settingsContent.contentElement);

      return outcContents;
    };
    const addContentListener = (contentEl: HTMLDivElement, contentBarButtonEl: HTMLButtonElement, index: Index) => {
      contentBarButtonEl.addEventListener("click", () => {
        // Content is the same, don't select a new element button
        if (this.bogEngine.getSelectedCategory() === index + 1) {
          return;
        }

        // Deselect previously selected button
        if (this.selectedElementButton) {
          this.selectedElementButton.classList.remove("selected");
        }

        // Select the first element button in this content
        const firstElementButtonEl = contentEl.querySelector<HTMLButtonElement>(".particle-button");
        if (firstElementButtonEl) {
          firstElementButtonEl.classList.add("selected");
          this.selectedElementButton = firstElementButtonEl;

          // Update global states
          this.bogEngine.setSelectedParticle(parseInt(firstElementButtonEl.dataset.Id || "0", 10));
          this.bogEngine.setSelectedCategory(parseInt(firstElementButtonEl.dataset.category || "0", 10));
        } else {
          // Update global states to 0 on fallbacc
          this.bogEngine.setSelectedParticle(0);
          this.bogEngine.setSelectedCategory(0);
        }
      });
    };
    const createElementButton = (particle: ParticleData): HTMLButtonElement => {
      const outButtonEl = document.createElement("button");
      outButtonEl.className = "particle-button";
      outButtonEl.textContent = particle.name;

      const chooseDark = color.getLuminance(particle.baseColor) > 210;
      const textColor = chooseDark ? "#323238" : "#FFFFFF";
      const shadowColor = chooseDark ? "#FFFFFF" : "#323238";
      outButtonEl.style.setProperty("--particle-button-base-color", color.colorToHex(particle.baseColor));
      outButtonEl.style.setProperty("--particle-button-variant-color", color.colorToHex(particle.highlightColor));
      outButtonEl.style.color = textColor;
      outButtonEl.style.textShadow = `1px 1px 2px rgba(${shadowColor[0]}, ${shadowColor[1]}, ${shadowColor[2]}, 0.6)`;

      // Create datasets for this button
      outButtonEl.dataset.Id = particle.id.toString();
      outButtonEl.dataset.category = particle.category.toString();

      return outButtonEl;
    };

    // Create a new window
    const name = "Particle Palette";
    const position: Vector2 = { x: 390, y: 124 };
    const size: Size = { width: 332, height: 206 };
    const maxSize: Size = { width: 420, height: 400 };
    const paletteWindow = new Window(this.host, name, position, size, maxSize);

    // Setup contents to this window
    const contents = setupContents(paletteWindow);

    // Add event listener to all content (expect for the last settings content)
    for (let i = 0; i < contents.length - 1; i++) {
      const contentEl = contents[i]!;
      const contentBarButtonEl = paletteWindow.getContentBarButtonAtIndex(i);
      if (contentBarButtonEl === undefined) continue;

      addContentListener(contentEl, contentBarButtonEl, i);
    }

    // Show content bar and set it's orientation
    paletteWindow.setContentBarVisibility(true);
    paletteWindow.setContentBarOrientation("bottom");

    // Select liquids content
    const selectedCategory = 4;
    paletteWindow.displayContentAtIndex(selectedCategory - 1);

    // Populate palette window's content with element buttons
    const elementsMap = this.bogEngine.particleData;
    let selectedParticleButtonEl: HTMLButtonElement | null = null;
    for (const key in elementsMap) {
      const element = elementsMap[key]!;

      // Get content for this element
      const content = contents[element.category - 1];
      if (!content) continue;

      // Create a new element button
      const particleButtonEl = createElementButton(element);

      // Add element button event listener
      particleButtonEl.addEventListener("click", () => {
        // Deselect previously selected button
        if (this.selectedElementButton) {
          this.selectedElementButton.classList.remove("selected");
        }

        // Select this button
        particleButtonEl.classList.add("selected");
        this.selectedElementButton = particleButtonEl;

        // Update global states
        this.bogEngine.setSelectedParticle(element.id);
        this.bogEngine.setSelectedCategory(element.category);
      });

      // Append it to it's content
      content.appendChild(particleButtonEl);

      // Select the first element with selected category
      if (!this.selectedElementButton && element.category === selectedCategory) {
        this.selectedElementButton = particleButtonEl;

        // Select this button
        this.selectedElementButton.classList.add("selected");

        // Update global states
        this.bogEngine.setSelectedParticle(element.id);
        this.bogEngine.setSelectedCategory(element.category);
      }
    }

    return paletteWindow;
  }

  private createDebugStatsWindow(): Window {
    // Create a new window
    const windowTitle = "Debug Stats";
    const windowPosition = { x: 80, y: 80 };
    const windowSize = { width: 260, height: 46 };
    const windowMaxSize = { width: 260, height: 46 };
    const outWindow = new Window(this.host, windowTitle, windowPosition, windowSize, windowMaxSize);

    // Setup content for this window
    const statsContentEl = document.createElement("div");
    statsContentEl.classList.add("debug__stats-content");
    outWindow.addNewContent(statsContentEl, "Stats Content", "./assets/icons/settings.svg");

    // Customise the stats content
    const fpsStatEl = document.createElement("div");
    fpsStatEl.classList.add("debug__stats-content__info-container");
    statsContentEl.appendChild(fpsStatEl);

    const tpsStatEl = document.createElement("div");
    tpsStatEl.classList.add("debug__stats-content__info-container");
    statsContentEl.appendChild(tpsStatEl);

    // Store references
    const debugInstance = this.bogEngine.debug;
    debugInstance.setStatsElements(fpsStatEl, tpsStatEl);

    return outWindow;
  }

  private createQuickLookWindow(): Window {
    // Create a new window
    const windowTitle = "Quick Look";
    const windowPosition = { x: 160, y: 120 };
    const windowSize = { width: 340, height: 460 };
    const windowMaxSize = { width: 420, height: 600 };
    const outWindow = new Window(this.host, windowTitle, windowPosition, windowSize, windowMaxSize);

    // Setup content for this window
    const lookUpContent = new WindowContent();
    outWindow.addNewContent(lookUpContent.contentElement, "Look up", "./assets/icons/settings.svg");

    // // Customize the content
    // const dropperEl = lookUpContent.addDropperPanel("Select Particle");
    // lookUpContent.addSeparator(0);
    // lookUpContent.addSection("Properties:");
    // let nameEl = lookUpContent.addPropertyPanel("Name", "Undefined");
    // let colorEl = lookUpContent.addPropertyPanel("Color", "#000000");
    // let posEl = lookUpContent.addPropertyPanel("Position", "NaN");
    // let indexEl = lookUpContent.addPropertyPanel("Index", "NaN");
    // let handleEl = lookUpContent.addPropertyPanel("Handle", "NaN");
    // let idEl = lookUpContent.addPropertyPanel("Particle ID", "NaN");
    // let isMovableEl = lookUpContent.addPropertyPanel("Is Movable", "NaN");
    // let densityEl = lookUpContent.addPropertyPanel("Density", "NaN");

    // // Add custom events
    // dropperEl.querySelector("button")?.addEventListener("click", () => {
    //   if (this.boggedState.isInspectingParticle) {
    //     this.boggedState.isInspectingParticle = false;
    //   } else {
    //     this.boggedState.canvasElement?.classList.add("cursor-picker");
    //     this.boggedState.isInspectingParticle = true;
    //   }
    // });
    // this.boggedState.canvasElement?.addEventListener("pointerdown", () => {
    //   if (this.boggedState.isInspectingParticle) {
    //     this.boggedState.canvasElement?.classList.remove("cursor-picker");
    //     this.boggedState.isInspectingParticle = false;
    //     const mouseX = this.boggedState.mouseX;
    //     const mouseY = this.boggedState.mouseY;
    //     const particle = this.boggedState.currentGrid?.getParticleAt(Math.floor(mouseX), Math.floor(mouseY));
    //     if (particle) {
    //       let handleVal = handleEl.querySelector("span");
    //       if (handleVal) handleVal.textContent = particle.handle.toString();
    //       let idVal = idEl.querySelector("span");
    //       if (idVal) idVal.textContent = particle.id.toString();
    //       let nameVal = nameEl.querySelector("span");
    //       if (nameVal) nameVal.textContent = particle.name;
    //       let colorVal = colorEl.querySelector("span");
    //       if (colorVal) {
    //         let colorHex = color.colorToHex(particle.color);
    //         colorVal.textContent = colorHex;
    //         colorVal.style.backgroundColor = colorHex;
    //       }
    //       let posVal = posEl.querySelector("span");
    //       if (posVal) posVal.textContent = `X: ${particle.position.x},Y: ${particle.position.y}`;
    //       let indexVal = indexEl.querySelector("span");
    //       if (indexVal) indexVal.textContent = particle.index.toString();
    //       let isMovableVal = isMovableEl.querySelector("span");
    //       if (isMovableVal) isMovableVal.textContent = particle.isMovable.toString();
    //       let densityVal = densityEl.querySelector("span");
    //       if (densityVal) densityVal.textContent = particle.density.toString();
    //     }
    //   }
    // });

    return outWindow;
  }

  // ========================================================
  // -------------- Event Listener Functions ----------------

  private addWindowDropdownListener() {
    document.addEventListener("click", (event: MouseEvent) => {
      document.querySelectorAll(".ui-window__content__dropdown-list.is-open").forEach((list) => {
        const originId = (list as HTMLElement).dataset.originId;
        const originContainer = originId ? document.getElementById(originId) : null;
        if (!list.contains(event.target as Node) && !originContainer?.contains(event.target as Node)) {
          list.classList.remove("is-open");
          originContainer?.appendChild(list);
        }
      });
    });
  }
}
