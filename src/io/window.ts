import type { Index, Size, Vector2, ContentBarOrientation } from "../types";

export class Window {
  // Window Properties
  static currentZIndex = 100;
  public title: string;
  public position: Vector2;
  public size: Size;
  public maxSize: Size;
  public isVisible: boolean;

  // Window DOM Elements
  private hostEl: HTMLDivElement;
  private windowEl: HTMLDivElement;
  private titlebarEl: HTMLDivElement;
  private controlBarEl: HTMLDivElement;
  private contentWrapperEl: HTMLDivElement;
  private contentBarEl: HTMLDivElement;
  private contentContainerEl: HTMLDivElement;

  private contents: HTMLDivElement[] = [];
  private contentBarButtons: HTMLButtonElement[] = [];
  private selectedContent: number = 0;
  private contentBarOrientation: ContentBarOrientation = "left";

  // Event listener states and flags
  private isFocused: boolean = false;
  private isDragging: boolean = false;
  private dragOffset: Vector2 = { x: 0, y: 0 };

  constructor(host: HTMLDivElement, title: string, position: Vector2, size: Size, maxSize: Size) {
    this.title = title;
    this.position = position;
    this.size = size;
    this.maxSize = maxSize;
    this.isVisible = false;

    this.hostEl = host;
    this.windowEl = this.createWindowElement(position, size, maxSize, Window.currentZIndex);
    this.titlebarEl = this.createTitlebarElement(title);
    this.controlBarEl = this.createControlBarElement();
    this.contentWrapperEl = this.createContentWrapperElement();
    this.contentBarEl = this.createContentBarElement();
    this.contentContainerEl = this.createContentContainerElement();

    // Assemble the window's content
    this.hostEl.appendChild(this.windowEl);
    this.titlebarEl.appendChild(this.controlBarEl);
    this.windowEl.appendChild(this.titlebarEl);
    this.contentWrapperEl.appendChild(this.contentBarEl);
    this.contentWrapperEl.appendChild(this.contentContainerEl);
    this.windowEl.appendChild(this.contentWrapperEl);

    // Add event listener to update window's position
    window.addEventListener("resize", this.onViewportResize);
  }

  destroy() {
    // Remove any global event listeners
    window.removeEventListener("resize", this.onViewportResize);

    // Remove window's own event listeners
    this.windowEl.removeEventListener("mousedown", this.onWindowFocus);
    this.titlebarEl.removeEventListener("pointerdown", this.onPointerDown);
    this.titlebarEl.removeEventListener("pointermove", this.onPointerMove);
    this.titlebarEl.removeEventListener("pointerup", this.onPointerUp);

    // Remove window from it's host
    if (this.windowEl && this.windowEl.parentElement) {
      this.windowEl.parentElement.removeChild(this.windowEl);
    }

    // Clear references
    this.windowEl = null as any;
    this.titlebarEl = null as any;
    this.controlBarEl = null as any;
    this.contentWrapperEl = null as any;
    this.contentBarEl = null as any;
    this.contentContainerEl = null as any;
  }

  // ========================================================
  // ---------------- Window Core Functions -----------------

  public setVisibility(isVisible: boolean) {
    if (isVisible) {
      this.windowEl.classList.add("is-visible");
    } else {
      this.windowEl.classList.remove("is-visible");
    }
    this.isVisible = isVisible;
  }

  public setContentBarVisibility(isVisible: boolean) {
    if (isVisible) {
      this.contentBarEl.classList.add("is-visible");
    } else {
      this.contentBarEl.classList.remove("is-visible");
    }
  }

  public getContentBarButtonAtIndex(index: Index): HTMLButtonElement | undefined {
    return this.contentBarButtons[index];
  }

  public setPosition(position: Vector2) {
    const windowWidth = this.windowEl.offsetWidth;
    const windowHeight = this.windowEl.offsetHeight;
    const hostWidth = this.hostEl.offsetWidth;
    const hostHeight = this.hostEl.offsetHeight;

    // Clamp the new position to the host element's bounds
    const finalX = Math.max(0, Math.min(position.x, hostWidth - windowWidth));
    const finalY = Math.max(0, Math.min(position.y, hostHeight - windowHeight));

    // 3. Apply the clamped position
    this.windowEl.style.left = `${finalX}px`;
    this.windowEl.style.top = `${finalY}px`;
  }

  public setContentBarOrientation(orientation: ContentBarOrientation) {
    // Remove old orientation from the wrapper
    this.contentWrapperEl.classList.remove("top", "bottom", "left", "right");

    // Add the new orientation
    this.contentWrapperEl.classList.add(orientation);

    // Store the new orientation
    this.contentBarOrientation = orientation;
  }

  public addNewContent(content: HTMLDivElement, name: string, icon: string) {
    let newIndex: number = this.contents.length;

    // Hide this content by default
    if (this.contents.length !== 0) {
      content.style.display = "none";
    }

    // Assign properties and add it to the content container
    content.id = "container-" + newIndex;
    this.contentContainerEl.appendChild(content);

    // Create new content bar button for this content
    const newButtonEl = document.createElement("button");
    newButtonEl.classList.add("ui-window__content-bar__button");
    newButtonEl.title = name;
    this.contentBarEl.appendChild(newButtonEl);

    // Create a icon for this button
    const contentIconEl = document.createElement("img");
    contentIconEl.classList.add("ui-window__content-bar__button__icon");
    contentIconEl.alt = name;
    contentIconEl.src = icon;
    newButtonEl.appendChild(contentIconEl);

    // Bind listener for this button
    newButtonEl.addEventListener("click", () => this.displayContentAtIndex(newIndex));

    // Store references
    this.contentBarButtons.push(newButtonEl);
    this.contents.push(content);
  }

  public displayContent(contentToDisplay: HTMLDivElement) {
    const contents = this.contents;
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      if (content !== contentToDisplay) {
        continue;
      }

      // Hide all contents
      this.contents.forEach((item, i) => {
        item.style.display = "none";
      });

      // Show this content
      content.style.display = "";

      // Assign new selected content index
      this.selectedContent = i;

      // Update content bar buttons
      this.contentBarButtons.forEach((btn, index) => {
        if (index === i) btn.classList.add("active");
        else btn.classList.remove("active");
      });

      return;
    }
  }

  public displayContentAtIndex(index: Index) {
    const contentToDisplay = this.contents[index];
    if (contentToDisplay) {
      this.displayContent(contentToDisplay);
    }
  }

  public addContentBarSeparator(isSpacer: boolean = false): HTMLDivElement {
    const separatorEl = document.createElement("div");
    separatorEl.classList.add("ui-window__content-bar__separator");

    if (isSpacer) {
      separatorEl.classList.add("is-spacer");
    }

    this.contentBarEl.appendChild(separatorEl);
    return separatorEl;
  }

  // ========================================================
  // ------------------- Helper Functions -------------------

  private createWindowElement(position: Vector2, size: Size, maxSize: Size, zIndex: number): HTMLDivElement {
    const windowEl = document.createElement("div");
    windowEl.classList.add("ui-window");

    // Set properties
    windowEl.style.left = `${position.x}px`;
    windowEl.style.top = `${position.y}px`;
    windowEl.style.width = `${size.width}px`;
    windowEl.style.height = `${size.height}px`;
    windowEl.style.maxWidth = `${maxSize.width}px`;
    windowEl.style.maxHeight = `${maxSize.height}px`;
    windowEl.style.zIndex = zIndex.toString();

    // Add listeners
    windowEl.addEventListener("mousedown", this.onWindowFocus);

    return windowEl;
  }

  private createTitlebarElement(title: string): HTMLDivElement {
    const titlebarEl = document.createElement("div");
    titlebarEl.classList.add("ui-window__title-bar");

    // Create span element for titlebar
    const titleBarSpanEl = document.createElement("span");
    titleBarSpanEl.classList.add("ui-window__title");
    titleBarSpanEl.textContent = title;
    titlebarEl.appendChild(titleBarSpanEl);

    // Add listeners
    titlebarEl.addEventListener("pointerdown", this.onPointerDown);
    titlebarEl.addEventListener("pointermove", this.onPointerMove);
    titlebarEl.addEventListener("pointerup", this.onPointerUp);

    return titlebarEl;
  }

  private createControlBarElement(): HTMLDivElement {
    const controlBarEl = document.createElement("div");
    controlBarEl.classList.add("ui-window__title-bar__button__wrapper");

    // Create close button and add it to the control bar
    const closeButtonEl = document.createElement("button");
    closeButtonEl.classList.add("ui-window__title-bar__button");
    const closeIcon = document.createElement("img");
    closeIcon.src = "./assets/icons/close.svg";
    closeButtonEl.appendChild(closeIcon);
    controlBarEl.appendChild(closeButtonEl);

    // Add listeners
    closeButtonEl.addEventListener("pointerdown", (e: PointerEvent) => {
      e.stopPropagation();
    });
    closeButtonEl.addEventListener("click", () => {
      this.setVisibility(false);
    });

    return controlBarEl;
  }

  private createContentWrapperElement(): HTMLDivElement {
    const contentWrapperEl = document.createElement("div");
    contentWrapperEl.classList.add("ui-window__content__wrapper", `${"left"}`);
    return contentWrapperEl;
  }

  private createContentBarElement(): HTMLDivElement {
    const contentBarEl = document.createElement("div");
    contentBarEl.classList.add("ui-window__content-bar");
    return contentBarEl;
  }

  private createContentContainerElement(): HTMLDivElement {
    const contentContainerEl = document.createElement("div");
    contentContainerEl.classList.add("ui-window__content-container");
    return contentContainerEl;
  }

  private snapWindowBacc() {
    const windowWidth = this.windowEl.offsetWidth;
    const windowHeight = this.windowEl.offsetHeight;
    const hostWidth = this.hostEl.offsetWidth;
    const hostHeight = this.hostEl.offsetHeight;
    const maxX = Math.max(0, hostWidth - windowWidth);
    const maxY = Math.max(0, hostHeight - windowHeight);

    const currentX = this.windowEl.offsetLeft;
    const currentY = this.windowEl.offsetTop;
    const newX = Math.max(0, Math.min(currentX, maxX));
    const newY = Math.max(0, Math.min(currentY, maxY));

    if (newX !== currentX || newY !== currentY) {
      this.windowEl.style.left = `${newX}px`;
      this.windowEl.style.top = `${newY}px`;
    }
  }

  // ========================================================
  // --------------- Event Listener Functions ---------------

  private onViewportResize = () => {
    this.snapWindowBacc();
  };

  private onWindowFocus = () => {
    if (!this.isFocused) {
      Window.currentZIndex++;
      this.windowEl.style.zIndex = Window.currentZIndex.toString();
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    e.stopPropagation();

    // Focus this window
    this.onWindowFocus();

    if (e.button === 0) {
      this.titlebarEl.setPointerCapture(e.pointerId);
      const rect = this.windowEl.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      this.isDragging = true;
    } else {
      this.isDragging = false;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.isDragging) {
      this.titlebarEl.releasePointerCapture(e.pointerId);
      this.isDragging = false;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.isDragging) {
      const hostRect = this.hostEl.getBoundingClientRect();
      const newX = e.clientX - this.dragOffset.x - hostRect.left;
      const newY = e.clientY - this.dragOffset.y - hostRect.top;
      this.setPosition({ x: newX, y: newY });
    }
  };
}
