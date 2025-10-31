import type { Color, ContentBarOrientation, ParticleMap, Size, Vector2 } from "../types";
import type { BoggedState } from "../core/bogged_state";
import { Window } from "../io/window";
import { WindowContent } from "../io/window_content";
import { color } from "../structs/color_utils";

export class WindowManager {
  private readonly boggedState: BoggedState;
  private readonly host: HTMLDivElement;

  constructor(boggedStateInstance: BoggedState, hostEl: HTMLDivElement) {
    this.boggedState = boggedStateInstance;
    this.host = hostEl;

    // Add global event listener for closing any opened dropdown menus
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

  // ..
  addPaletteWindow(particleData: ParticleMap) {
    // Create a new window
    const name = "Particle Palette";
    const position: Vector2 = { x: 320, y: 300 };
    const size: Size = { width: 250, height: 200 };
    const maxSize: Size = { width: 420, height: 400 };
    const paletteWindow = new Window(this.host, name, position, size, maxSize);
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
    let { button, items } = settingsContent.addDropdownButton("Orientation", ["Top", "Left", "Right", "Bottom"], 3, "palette-orientation");
    items.forEach((item) => {
      item.addEventListener("click", () => {
        const newOrientation = item.dataset.value as ContentBarOrientation;
        if (newOrientation) paletteWindow.setContentOrientation(newOrientation);
      });
    });
    paletteWindow.addContentBarSeparator(true);
    paletteWindow.addNewContent(settingsContent.contentElement, "Settings", "./assets/icons/settings.svg");

    // Select category liquids
    paletteWindow.displayContent(liquidsContent);

    // Add custom event listener for category buttons
    const categoryButtons: HTMLButtonElement[] = paletteWindow.contentBarButtons;
    const categoryContainers: HTMLDivElement[] = paletteWindow.contents;
    for (let i = 0; i < categoryButtons.length - 1; i++) {
      categoryButtons[i]!.addEventListener("click", () => {
        if (this.boggedState.selectedCategoryId === i + 1) return;

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
            this.boggedState.selectedParticleId = parseInt(firstParticleButton.dataset.particleId || "0", 10);
            this.boggedState.selectedCategoryId = parseInt(firstParticleButton.dataset.category || "0", 10);
          } else {
            this.boggedState.selectedParticleId = 0;
            this.boggedState.selectedCategoryId = 0;
          }
        }
      });
    }

    // Create particle buttons and append them to each category
    let particleSelected = false;
    for (const key in particleData) {
      const data = particleData[key];
      if (!data) {
        continue;
      }

      const categoryContainer = categoryContainers[data.category - 1];
      if (!categoryContainer) {
        continue;
      }

      // Calculate colors
      const baseColor: string = data.baseColor;
      const variantColor: string = data.variantColor;
      const luminance: number = color.getLuminance(color.hexToColor(baseColor));
      const textColor: string = luminance > 210 ? "#323238" : "#FFFFFFFF";
      const shadowColor: Color = color.hexToColor(textColor);

      // Create a new particle button
      const newButton = document.createElement("button");
      newButton.className = "particle-button";
      newButton.textContent = data.name;
      newButton.style.setProperty("--particle-button-base-color", baseColor);
      newButton.style.setProperty("--particle-button-variant-color", variantColor);
      newButton.style.color = textColor;
      newButton.style.textShadow = `1px 1px 2px rgba(${shadowColor[0]}, ${shadowColor[1]}, ${shadowColor[2]}, 0.6)`;

      // Create datasets for it
      newButton.dataset.particleId = data.id.toString();
      newButton.dataset.category = data.category.toString();

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
        this.boggedState.selectedParticleId = data.id;
        this.boggedState.selectedCategoryId = data.category;
      });

      // Append them to their category
      categoryContainer.appendChild(newButton);

      // Select the first particle with selected category
      if (!particleSelected && data.category === this.boggedState.selectedCategoryId) {
        newButton.classList.add("selected");
        this.boggedState.selectedParticleId = data.id;
        particleSelected = true;
      }
    }
  }
}
