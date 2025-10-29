import type { Index, Size, Vector2, ContentBarOrientation } from "../types";

export class Window {
  // Window properties
  hostEl: HTMLDivElement;
  title: string;
  position: Vector2;
  size: Size;
  maxSize: Size;
  contentBarButtons: HTMLButtonElement[] = [];
  contents: HTMLDivElement[] = [];
  selectedContent: number = 0;
  static currentZIndex = 100;

  // DOM elements
  _windowEl!: HTMLDivElement;
  _titlebarEl!: HTMLDivElement;
  _closeButtonEl!: HTMLButtonElement;
  _contentAreaEl!: HTMLDivElement;
  _contentBarEl!: HTMLDivElement;
  _contentContainer!: HTMLDivElement;

  // Event listener states and flags
  _isFocused: boolean;
  _isDragging: boolean;
  _dragOffset: Vector2;

  constructor(host: HTMLDivElement, title: string, position: Vector2, size: Size, maxSize: Size) {
    this.hostEl = host;
    this.title = title;
    this.position = position;
    this.size = size;
    this.maxSize = maxSize;

    this._isFocused = false;
    this._isDragging = false;
    this._dragOffset = { x: 0, y: 0 };

    this._initWindow(title, position);
    this._addEventListener();
    this._onFocus();
  }

  destroy() {
    this._closeWindow();
  }

  // ------ Helper Functions ------

  // ..
  _initWindow(title: string, position: Vector2) {
    // Create root window element and append it to host
    this._windowEl = document.createElement("div");
    this._windowEl.classList.add("ui-window");
    this._windowEl.style.left = `${position.x}px`;
    this._windowEl.style.top = `${position.y}px`;
    this._windowEl.style.width = `${this.size.width}px`;
    this._windowEl.style.height = `${this.size.height}px`;
    this._windowEl.style.maxWidth = `${this.maxSize.width}px`;
    this._windowEl.style.maxHeight = `${this.maxSize.height}px`;
    this.hostEl.appendChild(this._windowEl);

    // Create title bar element and add it at the top
    this._titlebarEl = document.createElement("div");
    this._titlebarEl.classList.add("ui-window__titlebar");
    const titleBarSpanEl = document.createElement("span");
    titleBarSpanEl.classList.add("ui-window__title");
    titleBarSpanEl.textContent = title;
    this._titlebarEl.appendChild(titleBarSpanEl);
    this._windowEl.appendChild(this._titlebarEl);

    // Create close button and add it on the title bar
    const controlsContentEl = document.createElement("div");
    controlsContentEl.classList.add("ui-window__controls");

    this._closeButtonEl = document.createElement("button");
    this._closeButtonEl.classList.add("ui-window__title-button");
    const closeIcon = document.createElement("img");
    closeIcon.src = "./assets/icons/close.svg";
    this._closeButtonEl.appendChild(closeIcon);

    controlsContentEl.appendChild(this._closeButtonEl);
    this._titlebarEl.appendChild(controlsContentEl);

    // Create content area and content bar
    this._contentAreaEl = document.createElement("div");
    this._contentAreaEl.classList.add("ui-window__content-area");
    this._contentAreaEl.style.flexDirection = "row";
    this._windowEl.appendChild(this._contentAreaEl);

    this._contentBarEl = document.createElement("div");
    this._contentBarEl.classList.add("ui-window__category-strip", `strip-${"left"}`);
    this._contentAreaEl.appendChild(this._contentBarEl);

    this._contentContainer = document.createElement("div");
    this._contentContainer.classList.add("ui-window__content-container");
    this._contentAreaEl.appendChild(this._contentContainer);
  }

  // ..
  _addEventListener() {
    // Add event listener for on window focus
    this._windowEl.addEventListener("mousedown", this._onFocus);

    // Add event listeners for window drag
    this._titlebarEl.addEventListener("pointerdown", this._onPointerDown);
    this._titlebarEl.addEventListener("pointermove", this._onPointerMove);
    this._titlebarEl.addEventListener("pointerup", this._onPointerUp);

    // Add even listener for close button
    this._closeButtonEl.addEventListener("click", this._onCloseButtonClick);
    this._closeButtonEl.addEventListener("pointerdown", this._stopDragPropagation);

    // Add event listener for viewport resize
    window.addEventListener("resize", this._onViewportResize);
  }
  _onFocus = () => {
    if (!this._isFocused) {
      Window.currentZIndex++;
      this._windowEl.style.zIndex = Window.currentZIndex.toString();
    }
  };
  _onPointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    this._onFocus();

    if (e.button === 0) {
      this._titlebarEl.setPointerCapture(e.pointerId);
      const rect = this._windowEl.getBoundingClientRect();
      this._dragOffset.x = e.clientX - rect.left;
      this._dragOffset.y = e.clientY - rect.top;
      this._isDragging = true;
    } else {
      this._isDragging = false;
    }
  };
  _onPointerUp = (e: PointerEvent) => {
    if (this._isDragging) {
      this._titlebarEl.releasePointerCapture(e.pointerId);
      this._isDragging = false;
    }
  };
  _onPointerMove = (e: PointerEvent) => {
    if (this._isDragging) {
      const newX = e.clientX - this._dragOffset.x;
      const newY = e.clientY - this._dragOffset.y;
      this._moveWindow({ x: newX, y: newY });
    }
  };
  _onCloseButtonClick = (e: PointerEvent) => {
    this._closeWindow();
  };
  _onViewportResize = () => {
    this._snapWindowBacc();
  };
  _stopDragPropagation = (e: PointerEvent) => {
    e.stopPropagation();
  };

  // ------ Window Core Functions ------

  // ..
  _closeWindow() {
    window.removeEventListener("resize", this._onViewportResize);
    this._titlebarEl.removeEventListener("pointerdown", this._onPointerDown);
    this._titlebarEl.removeEventListener("pointermove", this._onPointerMove);
    this._titlebarEl.removeEventListener("pointerup", this._onPointerUp);
    this._windowEl.removeEventListener("mousedown", this._onFocus);

    if (this._windowEl && this._windowEl.parentElement) {
      this._windowEl.parentElement.removeChild(this._windowEl);
    }

    this._windowEl! = null!;
    this._titlebarEl! = null!;
    this._closeButtonEl! = null!;
    this._contentBarEl! = null!;
    this._contentAreaEl! = null!;
  }

  // ..
  _moveWindow(newPosition: Vector2) {
    const windowWidth = this._windowEl.offsetWidth;
    const windowHeight = this._windowEl.offsetHeight;
    const finalX = Math.max(0, Math.min(newPosition.x, window.innerWidth - windowWidth));
    const finalY = Math.max(0, Math.min(newPosition.y, window.innerHeight - windowHeight));
    this._windowEl.style.left = `${finalX}px`;
    this._windowEl.style.top = `${finalY}px`;
  }

  // ..
  _snapWindowBacc() {
    const windowWidth = this._windowEl.offsetWidth;
    const windowHeight = this._windowEl.offsetHeight;
    const maxX = Math.max(0, window.innerWidth - windowWidth);
    const maxY = Math.max(0, window.innerHeight - windowHeight);

    const currentX = this._windowEl.offsetLeft;
    const currentY = this._windowEl.offsetTop;
    const newX = Math.max(0, Math.min(currentX, maxX));
    const newY = Math.max(0, Math.min(currentY, maxY));

    if (newX !== currentX || newY !== currentY) {
      this._windowEl.style.left = `${newX}px`;
      this._windowEl.style.top = `${newY}px`;
    }
  }

  displayContent(index: Index) {
    // Get the content to display
    const contentToDisplay = this.contents[index];
    if (!contentToDisplay) {
      return;
    }

    // Hide all contents
    this.contents.forEach((item, i) => {
      item.style.display = "none";
    });

    // Show this content
    contentToDisplay.style.display = "";

    // Assign new selected content index
    this.selectedContent = index;

    // Update content bar buttons
    this.contentBarButtons.forEach((btn, i) => {
      if (i === index) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  }

  // ------ Public Methods ------

  // ..
  addContentBarDivider(): HTMLDivElement {
    const dividerEl = document.createElement("div");
    dividerEl.classList.add("ui-flex-divider");
    this._contentBarEl.appendChild(dividerEl);

    return dividerEl;
  }

  // ..
  addContentBarSpacer(): HTMLDivElement {
    const spacerEl = document.createElement("div");
    spacerEl.classList.add("ui-flex-spacer");
    this._contentBarEl.appendChild(spacerEl);

    return spacerEl;
  }

  // ..
  addNewContent(content: HTMLDivElement, name: string, icon: string) {
    let newIndex: number = this.contents.length;

    // Hide this content by default
    if (this.contents.length !== 0) {
      content.style.display = "none";
    }

    // Assign properties and add it to the content container
    content.id = "container-" + newIndex;
    this._contentContainer.appendChild(content);

    // Create new content bar button for this content
    const newButtonEl = document.createElement("button");
    newButtonEl.classList.add("ui-window__category-button");
    newButtonEl.title = name;
    this._contentBarEl.appendChild(newButtonEl);

    // Create a icon for this button
    const contentIconEl = document.createElement("img");
    contentIconEl.classList.add("ui-window__category-icon");
    contentIconEl.alt = name;
    contentIconEl.src = icon;
    newButtonEl.appendChild(contentIconEl);

    // Bind listener for this button
    newButtonEl.addEventListener("click", () => this.displayContent(newIndex));

    // Show content bar if more than 1 content exists for this window
    if (this.contents.length > 0) {
      this._contentBarEl.style.display = "flex";
    }

    //
    this.contentBarButtons.push(newButtonEl);
    this.contents.push(content);
  }

  // ..
  setContentOrientation(orientation: ContentBarOrientation) {
    // Content bar goes first for orientation left and top
    if (orientation === "left" || orientation === "top") {
      this._contentAreaEl.appendChild(this._contentBarEl);
      this._contentAreaEl.appendChild(this._contentContainer);
    } else {
      this._contentAreaEl.appendChild(this._contentContainer);
      this._contentAreaEl.appendChild(this._contentBarEl);
    }

    // Content area flex row by row for orientation left and right
    if (orientation === "left" || orientation === "right") {
      this._contentAreaEl.style.flexDirection = "row";
    } else {
      this._contentAreaEl.style.flexDirection = "column";
    }

    // Update the content bar inner flex
    this._contentBarEl.classList.forEach((cls) => {
      if (cls.startsWith("strip-")) {
        this._contentBarEl.classList.remove(cls);
      }
    });
    this._contentBarEl.classList.add("ui-window__category-strip", `strip-${orientation}`);
  }
}
