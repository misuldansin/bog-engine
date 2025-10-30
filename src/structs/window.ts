import type { Index, Size, Vector2, ContentBarOrientation } from "../types";

export class Window {
  static currentZIndex = 100;

  // Properties
  title: string;
  position: Vector2;
  size: Size;
  maxSize: Size;

  contentBarButtons: HTMLButtonElement[];
  contents: HTMLDivElement[];
  selectedContent: number;
  contentBarOrientation: ContentBarOrientation;

  // DOM elements
  hostEl: HTMLDivElement;
  windowEl!: HTMLDivElement;
  titlebarEl!: HTMLDivElement;
  closeButtonEl!: HTMLButtonElement;
  contentWrapperEl!: HTMLDivElement;
  contentBarEl!: HTMLDivElement;
  contentContainer!: HTMLDivElement;

  // Event listener states and flags
  _isFocused: boolean;
  _isDragging: boolean;
  _dragOffset: Vector2;

  constructor(host: HTMLDivElement, title: string, position: Vector2, size: Size, maxSize: Size) {
    // Set window properties
    this.title = title;
    this.position = position;
    this.size = size;
    this.maxSize = maxSize;

    this.contentBarButtons = [];
    this.contents = [];
    this.selectedContent = 0;
    this.contentBarOrientation = "left";

    // Set dependencies
    this.hostEl = host;

    // Create window DOM elements
    this._initWindow(title, position);

    // Set startup values for event listener states and flags
    this._isFocused = false;
    this._isDragging = false;
    this._dragOffset = { x: 0, y: 0 };

    // And add event listeners
    this._addEventListener();
  }

  destroy() {
    this._closeWindow();
  }

  // ------ Helper Functions ------

  // ..
  _initWindow(title: string, position: Vector2) {
    // Create root window element and assign it to host
    this.windowEl = document.createElement("div");
    this.windowEl.classList.add("ui-window");
    this.windowEl.style.left = `${position.x}px`;
    this.windowEl.style.top = `${position.y}px`;
    this.windowEl.style.width = `${this.size.width}px`;
    this.windowEl.style.height = `${this.size.height}px`;
    this.windowEl.style.maxWidth = `${this.maxSize.width}px`;
    this.windowEl.style.maxHeight = `${this.maxSize.height}px`;
    this.windowEl.style.zIndex = Window.currentZIndex.toString();
    this.hostEl.appendChild(this.windowEl);

    // Create title bar element
    this.titlebarEl = document.createElement("div");
    this.titlebarEl.classList.add("ui-window__title-bar");
    const titleBarSpanEl = document.createElement("span");
    titleBarSpanEl.classList.add("ui-window__title");
    titleBarSpanEl.textContent = title;
    this.titlebarEl.appendChild(titleBarSpanEl);
    this.windowEl.appendChild(this.titlebarEl);

    // Create close button
    const buttonWrapperEl = document.createElement("div");
    buttonWrapperEl.classList.add("ui-window__title-bar__button__wrapper");
    this.closeButtonEl = document.createElement("button");
    this.closeButtonEl.classList.add("ui-window__title-bar__button");
    const closeIcon = document.createElement("img");
    closeIcon.src = "./assets/icons/close.svg";
    this.closeButtonEl.appendChild(closeIcon);
    buttonWrapperEl.appendChild(this.closeButtonEl);
    this.titlebarEl.appendChild(buttonWrapperEl);

    // Create content wrapper
    this.contentWrapperEl = document.createElement("div");
    this.contentWrapperEl.classList.add("ui-window__content__wrapper", `${"left"}`);
    this.windowEl.appendChild(this.contentWrapperEl);

    // Create content bar and content container
    this.contentBarEl = document.createElement("div");
    this.contentBarEl.classList.add("ui-window__content-bar");
    this.contentWrapperEl.appendChild(this.contentBarEl);

    this.contentContainer = document.createElement("div");
    this.contentContainer.classList.add("ui-window__content-container");
    this.contentWrapperEl.appendChild(this.contentContainer);

    // ! temp: mockup                 8 + (28 * i + 1)
    const tempDivEl = document.createElement("div");
    tempDivEl.style.position = "absolute";
    tempDivEl.style.left = "40px";
    tempDivEl.style.borderRadius = "0.6rem";
  }

  // ..
  _addEventListener() {
    // Add event listener for on window focus
    this.windowEl.addEventListener("mousedown", this._onFocus);

    // Add event listeners for window drag
    this.titlebarEl.addEventListener("pointerdown", this._onPointerDown);
    this.titlebarEl.addEventListener("pointermove", this._onPointerMove);
    this.titlebarEl.addEventListener("pointerup", this._onPointerUp);

    // Add even listener for close button
    this.closeButtonEl.addEventListener("click", this._onCloseButtonClick);
    this.closeButtonEl.addEventListener("pointerdown", this._stopDragPropagation);

    // Add event listener for viewport resize
    window.addEventListener("resize", this._onViewportResize);
  }
  _onFocus = () => {
    if (!this._isFocused) {
      Window.currentZIndex++;
      this.windowEl.style.zIndex = Window.currentZIndex.toString();
    }
  };
  _onPointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    this._onFocus();

    if (e.button === 0) {
      this.titlebarEl.setPointerCapture(e.pointerId);
      const rect = this.windowEl.getBoundingClientRect();
      this._dragOffset.x = e.clientX - rect.left;
      this._dragOffset.y = e.clientY - rect.top;
      this._isDragging = true;
    } else {
      this._isDragging = false;
    }
  };
  _onPointerUp = (e: PointerEvent) => {
    if (this._isDragging) {
      this.titlebarEl.releasePointerCapture(e.pointerId);
      this._isDragging = false;
    }
  };
  _onPointerMove = (e: PointerEvent) => {
    if (this._isDragging) {
      const hostRect = this.hostEl.getBoundingClientRect();
      const newX = e.clientX - this._dragOffset.x - hostRect.left;
      const newY = e.clientY - this._dragOffset.y - hostRect.top;
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
    this.titlebarEl.removeEventListener("pointerdown", this._onPointerDown);
    this.titlebarEl.removeEventListener("pointermove", this._onPointerMove);
    this.titlebarEl.removeEventListener("pointerup", this._onPointerUp);
    this.windowEl.removeEventListener("mousedown", this._onFocus);

    if (this.windowEl && this.windowEl.parentElement) {
      this.windowEl.parentElement.removeChild(this.windowEl);
    }

    this.windowEl! = null as any;
    this.titlebarEl != (null as any);
    this.closeButtonEl != (null as any);
    this.contentWrapperEl != (null as any);
    this.contentBarEl != (null as any);
    this.contentContainer != (null as any);
  }

  // ..
  _moveWindow(newPosition: Vector2) {
    const windowWidth = this.windowEl.offsetWidth;
    const windowHeight = this.windowEl.offsetHeight;

    const hostWidth = this.hostEl.offsetWidth;
    const hostHeight = this.hostEl.offsetHeight;
    const finalX = Math.max(0, Math.min(newPosition.x, hostWidth - windowWidth));
    const finalY = Math.max(0, Math.min(newPosition.y, hostHeight - windowHeight));

    // 3. Apply the clamped position
    this.windowEl.style.left = `${finalX}px`;
    this.windowEl.style.top = `${finalY}px`;
  }

  // ..
  _snapWindowBacc() {
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

  // ------ Public Methods ------

  // ..
  setContentOrientation(orientation: ContentBarOrientation) {
    // Remove old orientation from the wrapper
    this.contentWrapperEl.classList.remove("top", "bottom", "left", "right");

    // Add the new orientation
    this.contentWrapperEl.classList.add(orientation);

    // Store the new orientation
    this.contentBarOrientation = orientation;
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
    this.contentContainer.appendChild(content);

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
    newButtonEl.addEventListener("click", () => this.displayContent(newIndex));

    // Show content bar if more than 1 content exists for this window
    if (this.contents.length > 0) {
      this.contentBarEl.style.display = "flex";
    }

    //
    this.contentBarButtons.push(newButtonEl);
    this.contents.push(content);
  }

  // ..
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

  // ..
  addContentBarSeparator(isSpacer: boolean = false): HTMLDivElement {
    const dividerEl = document.createElement("div");
    dividerEl.classList.add("ui-window__content-bar__separator");

    if (isSpacer) {
      dividerEl.classList.add("is-spacer");
    }

    this.contentBarEl.appendChild(dividerEl);
    return dividerEl;
  }
}
