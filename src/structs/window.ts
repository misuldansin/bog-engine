import type { Vector2 } from "../types";

export class Window {
  // DOM elements
  hostElement: HTMLDivElement;
  _window!: HTMLDivElement;
  _titlebar!: HTMLDivElement;
  _closeButton!: HTMLButtonElement;
  _pinButton!: HTMLButtonElement;
  _settingsButton!: HTMLButtonElement;
  _container!: HTMLDivElement;

  // Window properties
  _size: Vector2;
  _maxSize: Vector2;

  // Event Listener States and Flags
  _isFocused: boolean;
  _isDragging: boolean;
  _dragOffset: Vector2;

  // DOM static variables
  static currentZIndex = 100;
  static DROPDOWN_ITEM_HEIGHT = 30;
  static DROPDOWN_BUTTON_HEIGHT = 30;

  constructor(hostElement: HTMLDivElement, title: string, position: Vector2, size: Vector2, maxSize: Vector2) {
    this.hostElement = hostElement;
    size.x = Math.max(40, Math.min(size.x, maxSize.x));
    size.y = Math.max(40, Math.min(size.y, maxSize.y));
    this._size = size;
    this._maxSize = maxSize;

    this._isFocused = false;
    this._isDragging = false;
    this._dragOffset = { x: 0, y: 0 };

    this._initWindow(title, position);
    this._addEventListener();
    this._onFocus();

    document.addEventListener("click", this._handleGlobalClick);
  }

  destroy() {
    this._closeWindow();
    document.removeEventListener("click", this._handleGlobalClick);
  }

  // ..
  _initWindow(title: string, position: Vector2) {
    // Create a window element
    const window = document.createElement("div");
    window.classList.add("ui-window");
    this.hostElement.appendChild(window);
    this._window = window;

    // Set it's size constraints
    this._window.style.width = `${this._size.x}px`;
    this._window.style.height = `${this._size.y}px`;
    this._window.style.maxWidth = `${this._maxSize.x}px`;
    this._window.style.maxHeight = `${this._maxSize.y}px`;

    // Create a titlebar
    const titlebar = document.createElement("div");
    titlebar.classList.add("ui-window__titlebar");
    this._window.appendChild(titlebar);
    this._titlebar = titlebar;

    const titleSpan = document.createElement("span");
    titleSpan.classList.add("ui-window__title");
    titleSpan.textContent = title;
    titlebar.appendChild(titleSpan);

    // Create title bar buttons
    const controlsContainer = document.createElement("div");
    controlsContainer.classList.add("ui-window__controls");
    this._titlebar.appendChild(controlsContainer);

    const settingsButton = document.createElement("button");
    settingsButton.classList.add("ui-window__title-button");
    const settingsIcon = document.createElement("img");
    settingsIcon.src = "./assets/icons/settings.svg";
    settingsButton.appendChild(settingsIcon);
    controlsContainer.appendChild(settingsButton);
    this._settingsButton = settingsButton;

    const closeButton = document.createElement("button");
    closeButton.classList.add("ui-window__title-button");
    const closeIcon = document.createElement("img");
    closeIcon.src = "./assets/icons/close.svg";
    closeButton.appendChild(closeIcon);
    controlsContainer.appendChild(closeButton);
    this._closeButton = closeButton;

    // Create Content container
    const container = document.createElement("div");
    container.classList.add("ui-window__content");
    this._window.appendChild(container);
    this._container = container;

    this._window.style.left = `${position.x}px`;
    this._window.style.top = `${position.y}px`;
  }

  // ..
  _addEventListener() {
    // Add event listener for on window focus
    this._window.addEventListener("mousedown", this._onFocus);

    // Add event listeners for window drag
    this._titlebar.addEventListener("pointerdown", this._onPointerDown);
    this._titlebar.addEventListener("pointermove", this._onPointerMove);
    this._titlebar.addEventListener("pointerup", this._onPointerUp);

    // Add even listeners for title bar buttons
    this._closeButton.addEventListener("click", this._onCloseButtonClick);
    this._closeButton.addEventListener("pointerdown", this._stopDragPropagation);

    // Add event listener for resizing the window
    window.addEventListener("resize", this._onViewportResize);
  }
  _onFocus = () => {
    if (!this._isFocused) {
      Window.currentZIndex++;
      this._window.style.zIndex = Window.currentZIndex.toString();
    }
  };
  _onPointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    this._onFocus();

    if (e.button === 0) {
      this._titlebar.setPointerCapture(e.pointerId);
      const rect = this._window.getBoundingClientRect();
      this._dragOffset.x = e.clientX - rect.left;
      this._dragOffset.y = e.clientY - rect.top;
      this._isDragging = true;
    } else {
      this._isDragging = false;
    }
  };
  _onPointerUp = (e: PointerEvent) => {
    if (this._isDragging) {
      this._titlebar.releasePointerCapture(e.pointerId);
      this._isDragging = false;
    }
  };
  _onPointerMove = (e: PointerEvent) => {
    if (this._isDragging) {
      const newX = e.clientX - this._dragOffset.x;
      const newY = e.clientY - this._dragOffset.y;
      this._moveWindow(newX, newY);
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
  _handleGlobalClick = (event: MouseEvent) => {
    // Find all open dropdown and close them if the click was not inside them
    document.querySelectorAll(".dropdown-list.is-open").forEach((list) => {
      const container = list.closest(".custom-dropdown-container");
      if (container && !container.contains(event.target as Node)) {
        list.classList.remove("is-open");
      }
    });
  };

  // ------ Window Core Logic ------

  // ..
  _closeWindow() {
    window.removeEventListener("resize", this._onViewportResize);
    this._titlebar.removeEventListener("pointerdown", this._onPointerDown);
    this._titlebar.removeEventListener("pointermove", this._onPointerMove);
    this._titlebar.removeEventListener("pointerup", this._onPointerUp);
    this._window.removeEventListener("mousedown", this._onFocus);

    if (this._window && this._window.parentElement) {
      this._window.parentElement.removeChild(this._window);
    }
  }

  // ..
  _moveWindow(x: number, y: number) {
    const windowWidth = this._window.offsetWidth;
    const windowHeight = this._window.offsetHeight;

    const finalX = Math.max(0, Math.min(x, window.innerWidth - windowWidth));
    const finalY = Math.max(0, Math.min(y, window.innerHeight - windowHeight));

    this._window.style.left = `${finalX}px`;
    this._window.style.top = `${finalY}px`;
  }

  // ..
  _snapWindowBacc() {
    const windowWidth = this._window.offsetWidth;
    const windowHeight = this._window.offsetHeight;
    const maxX = Math.max(0, window.innerWidth - windowWidth);
    const maxY = Math.max(0, window.innerHeight - windowHeight);

    const currentX = this._window.offsetLeft;
    const currentY = this._window.offsetTop;
    let newX = currentX;
    let newY = currentY;

    if (currentX > maxX) {
      newX = maxX;
    } else if (currentX < 0) {
      newX = 0;
    }

    if (currentY > maxY) {
      newY = maxY;
    } else if (currentY < 0) {
      newY = 0;
    }

    if (newX !== currentX || newY !== currentY) {
      this._window.style.left = `${newX}px`;
      this._window.style.top = `${newY}px`;
    }
  }

  // ------ Public Methods ------

  // ..
  addTitle(text: string): HTMLHeadingElement {
    const h2 = document.createElement("h2");
    h2.classList.add("ui-title");
    h2.textContent = text;

    this._container.appendChild(h2);
    return h2;
  }

  // ..
  addSection(text: string): HTMLHeadingElement {
    const h4 = document.createElement("h4");
    h4.classList.add("ui-section");
    h4.textContent = text;

    this._container.appendChild(h4);
    return h4;
  }

  // ..
  addDivider() {
    const divider = document.createElement("div");
    divider.classList.add("ui-window__divider");

    this._container.appendChild(divider);
    return divider;
  }

  // ..
  addText(text: string, color?: string, fontWeight?: string, id?: string) {
    const p = document.createElement("p");
    p.classList.add("ui-text");
    p.textContent = text;
    if (color) {
      p.style.color = color;
    }
    if (fontWeight) {
      p.style.fontWeight = fontWeight;
    }
    if (id) {
      p.id = id;
    }

    this._container.appendChild(p);
    return p;
  }

  // ..
  addBoldText(text: string, color?: string, id?: string) {
    const p = document.createElement("p");
    p.classList.add("ui-text");
    p.innerHTML = `<strong>${text}</strong>`;
    if (color) {
      p.style.color = color;
    }
    if (id) {
      p.id = id;
    }

    this._container.appendChild(p);
    return p;
  }

  // ..
  addLink(text: string, url: string) {
    const p = document.createElement("p");
    p.classList.add("ui-text");
    const link = document.createElement("a");
    link.href = url;
    link.textContent = text;
    link.target = "_blank";
    p.appendChild(link);

    this._container.appendChild(p);
    return p;
  }

  // ..
  addBulletedList(items: string[]) {
    const ul = document.createElement("ul");
    ul.classList.add("ui-text");
    items.forEach((itemText) => {
      const li = document.createElement("li");
      li.textContent = itemText;
      ul.appendChild(li);
    });

    this._container.appendChild(ul);
    return ul;
  }

  // ..
  addNumberedList(items: string[]) {
    const ol = document.createElement("ol");
    ol.classList.add("ui-text");
    items.forEach((itemText) => {
      const li = document.createElement("li");
      li.textContent = itemText;
      ol.appendChild(li);
    });

    this._container.appendChild(ol);
    return ol;
  }

  // ..
  addImage(src: string, width: number, height: number, alt: string = "Placeholder Image") {
    const img = document.createElement("img");
    img.classList.add("ui-image");
    img.src = src;
    img.alt = alt;
    img.width = width;
    img.height = height;

    this._container.appendChild(img);
    return img;
  }

  // ..
  addSlider(label: string, id: string, rangeMinMax: Vector2, defaultValue: number) {
    const sliderLabel = label + ":";
    const flexRow = document.createElement("div");
    flexRow.classList.add("flex-row");

    // Add label
    const labelElement = document.createElement("label");
    labelElement.textContent = sliderLabel;
    flexRow.appendChild(labelElement);

    // Add slider range
    const rangeInput = document.createElement("input");
    rangeInput.type = "range";
    rangeInput.id = id + "-range";
    rangeInput.min = rangeMinMax.x.toString();
    rangeInput.max = rangeMinMax.y.toString();
    rangeInput.value = defaultValue.toString();
    if (rangeMinMax.y - rangeMinMax.x < 2 && rangeMinMax.y > rangeMinMax.x) {
      rangeInput.step = (0.01).toString();
    }
    flexRow.appendChild(rangeInput);

    // Add input text
    const numberInput = document.createElement("input");
    numberInput.style.minWidth = "40px";
    numberInput.type = "number";
    numberInput.id = id + "-number";
    numberInput.min = rangeMinMax.x.toString();
    numberInput.max = rangeMinMax.y.toString();
    numberInput.value = defaultValue.toString();
    rangeInput.oninput = () => (numberInput.value = rangeInput.value);
    numberInput.onchange = () => {
      const val = Math.max(rangeMinMax.x, Math.min(rangeMinMax.y, parseInt(numberInput.value))).toString();
      rangeInput.value = val;
      numberInput.value = val;
    };
    flexRow.appendChild(numberInput);

    this._container.appendChild(flexRow);
    return flexRow;
  }

  // ..
  addTextInput(label: string, id: string, placeholder: string = "", initialValue: string = "") {
    const flexRow = document.createElement("div");
    flexRow.classList.add("flex-row", "ui-text-input-container");

    const labelElement = document.createElement("label");
    labelElement.textContent = label + ":";
    labelElement.htmlFor = id;
    flexRow.appendChild(labelElement);

    const input = document.createElement("input");
    input.type = "text";
    input.id = id;
    input.placeholder = placeholder;
    input.value = initialValue;
    flexRow.appendChild(input);

    this._container.appendChild(flexRow);
    return flexRow;
  }

  // ..
  addButton(text: string, id: string, bgColor?: string) {
    const button = document.createElement("button");
    button.classList.add("ui-window__content__Button");
    button.textContent = text;
    button.id = id;
    if (bgColor) {
      button.style.backgroundColor = bgColor;
    }

    this._container.appendChild(button);
    return button;
  }

  // ..
  addDropdown(label: string, id: string, options: string[]) {
    const dropdownLabel = label + ":";
    const flexRow = document.createElement("div");
    flexRow.classList.add("flex-row");

    const labelEl = document.createElement("label");
    labelEl.textContent = dropdownLabel;
    flexRow.appendChild(labelEl);

    const container = document.createElement("div");
    container.classList.add("custom-dropdown-container");

    const button = document.createElement("div");
    button.classList.add("dropdown-button");
    button.innerHTML = `
          <span id="${id}-display">${options[0]}</span>
      `;
    container.appendChild(button);

    const list = document.createElement("ul");
    list.classList.add("dropdown-list");
    list.id = id + "-list";
    container.appendChild(list);

    let selectedIndex = 0;
    let items: HTMLElement[] = [];
    options.forEach((optionText, index) => {
      const item = document.createElement("li");
      item.style.marginBottom = "0px";
      item.classList.add("dropdown-item");
      item.textContent = optionText;
      item.dataset.value = optionText.toLowerCase().replace(/\s/g, "-");
      item.dataset.index = index.toString();

      if (index === selectedIndex) {
        item.classList.add("is-selected");
      }

      item.addEventListener("click", (event) => {
        event.stopPropagation();
        items[selectedIndex]!.classList.remove("is-selected");
        selectedIndex = index;
        item.classList.add("is-selected");
        document.getElementById(`${id}-display`)!.textContent = optionText;
        list.classList.remove("is-open");
      });

      list.appendChild(item);
      items.push(item);
    });

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      document.querySelectorAll(".dropdown-list.is-open").forEach((otherList) => {
        if (otherList !== list) {
          otherList.classList.remove("is-open");
        }
      });

      const isOpen = list.classList.toggle("is-open");
      if (isOpen) {
        const itemHeight = Window.DROPDOWN_ITEM_HEIGHT;
        const buttonHeight = Window.DROPDOWN_BUTTON_HEIGHT;
        const shiftUpAmount = selectedIndex * itemHeight;
        const finalTop = buttonHeight - shiftUpAmount;
        list.style.transform = `translateY(${finalTop - buttonHeight - 6}px)`;
        list.style.top = "0px";
        list.scrollTop = shiftUpAmount;
      }
    });
    flexRow.appendChild(container);

    this._container.appendChild(flexRow);
    return flexRow;
  }

  // ..
  addToggleSwitch(label: string, id: string, initialState: boolean = false) {
    const toggleLabel = label + ":";
    const flexRow = document.createElement("div");
    flexRow.classList.add("flex-row");

    const labelElement = document.createElement("label");
    labelElement.textContent = toggleLabel;
    flexRow.appendChild(labelElement);

    const container = document.createElement("div");
    container.classList.add("toggle-container");

    const switchElement = document.createElement("div");
    switchElement.classList.add("toggle-switch");
    switchElement.id = id + "-switch";

    if (initialState) {
      switchElement.classList.add("is-on");
    }

    switchElement.innerHTML = `
          <span class="toggle-indicator indicator-o">O</span> 
          <span class="toggle-indicator indicator-i">I</span> 
          <div class="toggle-slider"></div>
      `;

    switchElement.addEventListener("click", () => {
      switchElement.classList.toggle("is-on");
    });
    container.appendChild(switchElement);
    flexRow.appendChild(container);

    this._container.appendChild(flexRow);
    return flexRow;
  }
}
