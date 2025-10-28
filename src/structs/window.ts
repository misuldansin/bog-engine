import type { FontWeight, Index, Size, Vector2, WindowCategoryOrientation } from "../types";

export class Window {
  // DOM elements
  hostElement: HTMLDivElement;
  _window!: HTMLDivElement;
  _titlebar!: HTMLDivElement;
  _closeButton!: HTMLButtonElement;
  _pinButton!: HTMLButtonElement;
  _categoryStrip!: HTMLDivElement;
  _contentArea!: HTMLDivElement;
  _contentContainer!: HTMLDivElement;
  _containers: HTMLDivElement[] = [];
  _categoryButtons: HTMLButtonElement[] = [];

  // Window properties
  _size: Size;
  _maxSize: Size;

  // Event Listener States and Flags
  _isFocused: boolean;
  _isDragging: boolean;
  _dragOffset: Vector2;
  _selectedCategory: number;

  // DOM static variables
  static currentZIndex = 100;
  static DROPDOWN_ITEM_HEIGHT = 30;
  static DROPDOWN_BUTTON_HEIGHT = 30;

  constructor(
    hostElement: HTMLDivElement,
    title: string,
    position: Vector2,
    size: Size,
    maxSize: Size,
    categoryOrientation: WindowCategoryOrientation,
    categoryName: string,
    categoryIcon: string,
    customContainer?: HTMLDivElement
  ) {
    this.hostElement = hostElement;
    size.width = Math.max(40, Math.min(size.width, maxSize.width));
    size.height = Math.max(40, Math.min(size.height, maxSize.height));
    this._size = size;
    this._maxSize = maxSize;

    this._isFocused = false;
    this._isDragging = false;
    this._dragOffset = { x: 0, y: 0 };
    this._selectedCategory = 0;

    this._initWindow(title, position, categoryOrientation, categoryName, categoryIcon, customContainer);
    this._addEventListener();
    this._onFocus();

    document.addEventListener("click", this._handleGlobalClick);
  }

  destroy() {
    this._closeWindow();
    document.removeEventListener("click", this._handleGlobalClick);
  }

  // ..
  _initWindow(
    title: string,
    position: Vector2,
    categoryOrientation: WindowCategoryOrientation,
    categoryName: string,
    categoryIcon: string,
    customContainer?: HTMLDivElement
  ) {
    // Create a window element
    const window = document.createElement("div");
    window.classList.add("ui-window");
    this.hostElement.appendChild(window);
    this._window = window;

    // Set it's size constraints
    this._window.style.left = `${position.x}px`;
    this._window.style.top = `${position.y}px`;
    this._window.style.width = `${this._size.width}px`;
    this._window.style.height = `${this._size.height}px`;
    this._window.style.maxWidth = `${this._maxSize.width}px`;
    this._window.style.maxHeight = `${this._maxSize.height}px`;

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

    const closeButton = document.createElement("button");
    closeButton.classList.add("ui-window__title-button");
    const closeIcon = document.createElement("img");
    closeIcon.src = "./assets/icons/close.svg";
    closeButton.appendChild(closeIcon);
    controlsContainer.appendChild(closeButton);
    this._closeButton = closeButton;

    // Create main content area
    const contentArea = document.createElement("div");
    contentArea.classList.add("ui-window__content-area");
    contentArea.style.flexDirection = categoryOrientation === "left" || categoryOrientation === "right" ? "row" : "column";
    this._window.appendChild(contentArea);
    this._contentArea = contentArea;

    // Create category strip
    const categoryStrip = document.createElement("div");
    categoryStrip.classList.add("ui-window__category-strip", `strip-${categoryOrientation}`);
    this._categoryStrip = categoryStrip;

    // Create content container wrapper
    const contentContainer = document.createElement("div");
    contentContainer.classList.add("ui-window__content-container");
    this._contentContainer = contentContainer;

    if (categoryOrientation === "left" || categoryOrientation === "top") {
      contentArea.appendChild(categoryStrip);
      contentArea.appendChild(contentContainer);
    } else {
      contentArea.appendChild(contentContainer);
      contentArea.appendChild(categoryStrip);
    }

    // Create first content panel
    let container = null;
    if (customContainer) {
      container = customContainer;
    } else {
      container = document.createElement("div");
      container.classList.add("ui-window__content");
    }
    container.id = "container-0";
    contentContainer.appendChild(container);
    this._containers.push(container);

    // Create a category for this first content panel
    this._createNewCategory(categoryName, categoryIcon, 0);
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

  // ..
  _showCategory(index: Index) {
    this._selectedCategory = index;

    this._containers.forEach((item, i) => {
      item.style.display = i === index ? "" : "none";
    });

    const buttons = this._categoryStrip.querySelectorAll(".ui-window__category-button");
    buttons.forEach((btn, i) => {
      if (i === index) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  }

  _createNewCategory(label: string, icon: string, index: Index) {
    // Create a new category button
    const newButton = document.createElement("button");
    newButton.classList.add("ui-window__category-button");

    // Create a icon for this button
    const categoryIcon = document.createElement("img");
    categoryIcon.alt = label;
    categoryIcon.src = icon;
    newButton.title = label;
    categoryIcon.classList.add("ui-window__category-icon");
    newButton.appendChild(categoryIcon);

    // Add new category to the category strip
    this._categoryButtons.push(newButton);
    this._categoryStrip.appendChild(newButton);

    // Bind listener for this button
    newButton.addEventListener("click", () => this._showCategory(index));

    return newButton;
  }

  // ------ Public Methods ------

  // ..
  getAllCategoryContainer() {
    return this._containers;
  }

  // ..
  getAllCategoryButtons() {
    return this._categoryButtons;
  }

  // ..
  addCategory(name: string, icon: string, customContainer?: HTMLDivElement): HTMLButtonElement {
    let newIndex: number = this._containers.length;

    // Create a new container element
    let newContainer = null;
    if (customContainer) {
      newContainer = customContainer;
    } else {
      newContainer = document.createElement("div");
      newContainer.classList.add("ui-window__content");
    }

    newContainer.id = "container-" + newIndex;
    newContainer.style.display = "none";
    this._contentContainer.appendChild(newContainer);
    this._containers.push(newContainer);

    const button = this._createNewCategory(name, icon, newIndex);

    // We have more than two categories, show category strip
    this._categoryStrip.style.display = "flex";

    return button;
  }

  // ..
  addCategorySpacer(): HTMLDivElement {
    const spacerDiv = document.createElement("div");
    spacerDiv.classList.add("ui-flex-spacer");
    this._categoryStrip.appendChild(spacerDiv);

    return spacerDiv;
  }

  // ..
  addCategoryDivider(): HTMLDivElement {
    const divElement = document.createElement("div");
    divElement.classList.add("ui-flex-divider");
    this._categoryStrip.appendChild(divElement);

    return divElement;
  }

  // ..
  addTitle(containerIndex: Index, text: string): HTMLHeadingElement | null {
    // The container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a new title element
    const h2 = document.createElement("h2");
    h2.classList.add("ui-title");
    h2.textContent = text;

    // And append it to the containter
    container.appendChild(h2);
    return h2;
  }

  // ..
  addSection(containerIndex: Index, text: string): HTMLHeadingElement | null {
    // The container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a new section element
    const h4 = document.createElement("h4");
    h4.classList.add("ui-section");
    h4.textContent = text;

    // And append it to the containter
    container.appendChild(h4);
    return h4;
  }

  // ..
  addDivider(containerIndex: Index): HTMLDivElement | null {
    // The container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a new divider element
    const divider = document.createElement("div");
    divider.classList.add("ui-window__divider");

    // And append it to the containter
    container.appendChild(divider);
    return divider;
  }

  // ..
  addText(containerIndex: Index, text: string, color?: string, fontWeight?: FontWeight, id?: string): HTMLParagraphElement | null {
    // The container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a new paragraph element
    const p = document.createElement("p");
    p.classList.add("ui-text");
    p.textContent = text;

    // Override properties
    if (color) {
      p.style.color = color;
    }
    if (id) {
      p.id = id;
    }
    if (fontWeight) {
      p.style.fontWeight = fontWeight;
    }

    // And append it to the containter
    container.appendChild(p);
    return p;
  }

  // ..
  addLink(containerIndex: Index, text: string, url: string): HTMLParagraphElement | null {
    // The container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a new paragraph element with attached link
    const p = document.createElement("p");
    p.classList.add("ui-text");
    const link = document.createElement("a");
    link.href = url;
    link.textContent = text;
    link.target = "_blank";
    p.appendChild(link);

    // And append it to the containter
    container.appendChild(p);
    return p;
  }

  // ..
  addBulletedList(containerIndex: Index, items: string[]): HTMLUListElement | null {
    // The container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a new unordered list element and append items to it
    const ul = document.createElement("ul");
    ul.classList.add("ui-text");
    items.forEach((itemText) => {
      const li = document.createElement("li");
      li.textContent = itemText;
      ul.appendChild(li);
    });

    // And append it to the containter
    container.appendChild(ul);
    return ul;
  }

  // ..
  addNumberedList(containerIndex: Index, items: string[]): HTMLOListElement | null {
    // The container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a new ordered list element and append items to it
    const ol = document.createElement("ol");
    ol.classList.add("ui-text");
    items.forEach((itemText) => {
      const li = document.createElement("li");
      li.textContent = itemText;
      ol.appendChild(li);
    });

    // And append it to the containter
    container.appendChild(ol);
    return ol;
  }

  // ..
  addImage(containerIndex: Index, src: string, alt: string, size: Size): HTMLImageElement | null {
    // The container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a new image element
    const img = document.createElement("img");
    img.classList.add("ui-image");
    img.src = src;
    img.alt = alt;
    img.width = size.width;
    img.height = size.height;

    // And append it to the containter
    container.appendChild(img);
    return img;
  }

  // ..
  addSlider(containerIndex: Index, label: string, id: string, rangeMinMax: Vector2, defaultValue: number): HTMLDivElement | null {
    // The container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a divider element for the slider container
    const sliderContainer = document.createElement("div");
    sliderContainer.classList.add("flex-row");

    // Create a label element and add it to the slider container
    const labelElement = document.createElement("label");
    labelElement.textContent = label + ":";
    sliderContainer.appendChild(labelElement);

    // Create a slider range and add it to the slider container
    const rangeInput = document.createElement("input");
    rangeInput.type = "range";
    rangeInput.id = id + "-range";
    rangeInput.min = rangeMinMax.x.toString();
    rangeInput.max = rangeMinMax.y.toString();
    rangeInput.value = defaultValue.toString();
    if (rangeMinMax.y - rangeMinMax.x < 2 && rangeMinMax.y > rangeMinMax.x) {
      rangeInput.step = (0.01).toString();
    }
    sliderContainer.appendChild(rangeInput);

    // Create input text on the right and add it to the slider container
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
    sliderContainer.appendChild(numberInput);

    // And append it to the containter
    container.appendChild(sliderContainer);
    return sliderContainer;
  }

  // ..
  addTextInput(containerIndex: Index, label: string, placeholder: string, initialValue: string, id: string): HTMLDivElement | null {
    // The window container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a new input container
    const inputContainer = document.createElement("div");
    inputContainer.classList.add("flex-row", "ui-text-input-container");

    // Create a label element and add it to the input container
    const labelElement = document.createElement("label");
    labelElement.textContent = label + ":";
    labelElement.htmlFor = id;
    inputContainer.appendChild(labelElement);

    // Create an input element and add it to the input container
    const input = document.createElement("input");
    input.type = "text";
    input.id = id;
    input.placeholder = placeholder;
    input.value = initialValue;
    inputContainer.appendChild(input);

    // Append input container to the window containter
    container.appendChild(inputContainer);
    return inputContainer;
  }

  // ..
  addButton(containerIndex: Index, text: string, id: string, bgColor?: string): HTMLButtonElement | null {
    // The window container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a new button element
    const button = document.createElement("button");
    button.classList.add("ui-window__content__Button");
    button.textContent = text;
    button.id = id;
    if (bgColor) {
      button.style.backgroundColor = bgColor;
    }

    // Append button element to the window containter
    container.appendChild(button);
    return button;
  }

  // ..
  addDropdown(containerIndex: Index, label: string, id: string, options: string[]) {
    // The window container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a dropdown container element
    const dropdownContainer = document.createElement("div");
    dropdownContainer.classList.add("flex-row");

    // Create a label element on the left
    const labelElement = document.createElement("label");
    labelElement.textContent = label + ":";
    dropdownContainer.appendChild(labelElement);

    // Create a dropdown items container element
    const itemContainer = document.createElement("div");
    itemContainer.classList.add("custom-dropdown-container");

    // Create dropdown button and append it to the dropdown items
    const button = document.createElement("div");
    button.classList.add("dropdown-button");
    button.innerHTML = `
          <span id="${id}-display">${options[0]}</span>
      `;
    itemContainer.appendChild(button);

    // Create list of the dropdown items
    const list = document.createElement("ul");
    list.classList.add("dropdown-list");
    list.id = id + "-list";
    itemContainer.appendChild(list);

    // Create items for dropdown items and append them
    let selectedIndex = 0;
    let items: HTMLElement[] = [];
    options.forEach((optionText, index) => {
      const item = document.createElement("li");
      item.style.marginBottom = "0px";
      item.classList.add("dropdown-item");
      item.textContent = optionText;
      item.dataset.value = optionText.toLowerCase().replace(/\s/g, "-");
      item.dataset.index = index.toString();

      // Select the first item
      if (index === selectedIndex) {
        item.classList.add("is-selected");
      }

      // Add listener for this item
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

    // Add listener for the dropdown button
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
    dropdownContainer.appendChild(itemContainer);

    // Append dropdown container to the window containter
    container.appendChild(dropdownContainer);
    return dropdownContainer;
  }

  // ..
  addToggleSwitch(containerIndex: Index, label: string, id: string, initialState: boolean = false) {
    // The window container does not exist at this index, return
    const container = this._containers[containerIndex];
    if (!container) {
      return null;
    }

    // Create a container element for toggle switch
    const toggleContianer = document.createElement("div");
    toggleContianer.classList.add("flex-row");

    // Create a label element on the left
    const labelElement = document.createElement("label");
    labelElement.textContent = label + ":";
    toggleContianer.appendChild(labelElement);

    // Create container for the toggle button
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("toggle-container");

    // Create toggle button element
    const switchElement = document.createElement("div");
    switchElement.classList.add("toggle-switch");
    switchElement.id = id + "-switch";

    // Set it's initial state
    if (initialState) {
      switchElement.classList.add("is-on");
    }

    // Hook up css classes
    switchElement.innerHTML = `
          <span class="toggle-indicator indicator-o">O</span> 
          <span class="toggle-indicator indicator-i">I</span> 
          <div class="toggle-slider"></div>
      `;

    // Add event listener to the toggle button
    switchElement.addEventListener("click", () => {
      switchElement.classList.toggle("is-on");
    });
    buttonContainer.appendChild(switchElement);
    toggleContianer.appendChild(buttonContainer);

    // Append toggle switch container to the window containter
    container.appendChild(toggleContianer);
    return toggleContianer;
  }
}
