import type { FontWeight, Size, Vector2 } from "../types";

export class WindowContent {
  contentElement: HTMLDivElement;

  constructor() {
    this.contentElement = document.createElement("div");
    this.contentElement.classList.add("ui-window__content");
  }

  // ..
  addDivider(): HTMLDivElement {
    const dividerEl = document.createElement("div");
    dividerEl.classList.add("ui-window__divider");

    this.contentElement.appendChild(dividerEl);
    return dividerEl;
  }

  // ..
  addSpacer(heightPixel: number = 1): HTMLDivElement {
    const spacerEl = document.createElement("div");
    spacerEl.classList.add("ui-window__spacer");
    spacerEl.style.height = `${heightPixel}px`;

    this.contentElement.appendChild(spacerEl);
    return spacerEl;
  }

  // ..
  addTitle(text: string): HTMLHeadingElement {
    const titleEl = document.createElement("h3");
    titleEl.classList.add("ui-title");
    titleEl.textContent = text;

    this.contentElement.appendChild(titleEl);
    return titleEl;
  }

  // ..
  addSection(text: string): HTMLHeadingElement {
    const sectionEl = document.createElement("h4");
    sectionEl.classList.add("ui-section");
    sectionEl.textContent = text;

    this.contentElement.appendChild(sectionEl);
    return sectionEl;
  }

  // ..
  addText(text: string, color?: string, fontWeight?: FontWeight, id?: string): HTMLParagraphElement {
    const textEl = document.createElement("p");
    textEl.classList.add("ui-text");
    textEl.textContent = text;
    if (color != null) textEl.style.color = color;
    if (id != null) textEl.id = id;
    if (fontWeight != null) textEl.style.fontWeight = fontWeight;

    this.contentElement.appendChild(textEl);
    return textEl;
  }

  // ..
  addLink(text: string, url: string, id?: string): HTMLParagraphElement {
    const linkEl = document.createElement("p");
    linkEl.classList.add("ui-text");
    if (id != null) linkEl.id = id;

    const link = document.createElement("a");
    link.href = url;
    link.textContent = text;
    link.target = "_blank";
    linkEl.appendChild(link);

    this.contentElement.appendChild(linkEl);
    return linkEl;
  }

  // ..
  addBulletedList(items: string[]): HTMLUListElement {
    const bulletEl = document.createElement("ul");
    bulletEl.classList.add("ui-text");

    items.forEach((itemText) => {
      const ItemEl = document.createElement("li");
      ItemEl.textContent = itemText;
      bulletEl.appendChild(ItemEl);
    });

    this.contentElement.appendChild(bulletEl);
    return bulletEl;
  }

  // ..
  addNumberedList(items: string[]): HTMLOListElement {
    const numEl = document.createElement("ol");
    numEl.classList.add("ui-text");

    items.forEach((itemText) => {
      const ItemEl = document.createElement("li");
      ItemEl.textContent = itemText;
      numEl.appendChild(ItemEl);
    });

    this.contentElement.appendChild(numEl);
    return numEl;
  }

  // ..
  addImage(size: Size, src: string, alt: string, id?: string): HTMLImageElement {
    const imageEl = document.createElement("img");
    imageEl.classList.add("ui-image");
    imageEl.src = src;
    imageEl.alt = alt;
    imageEl.width = size.width;
    imageEl.height = size.height;
    if (id != null) imageEl.id = id;

    this.contentElement.appendChild(imageEl);
    return imageEl;
  }

  // ..
  addSlider(label: string, minRange: number, maxRange: number, defaultValue: number, steps: number, id?: string): HTMLDivElement {
    const sliderEl = document.createElement("div");
    sliderEl.classList.add("flex-row");
    if (id != null) sliderEl.id = id;

    // Create a label on the left
    const labelEl = document.createElement("label");
    labelEl.textContent = label + ":";
    sliderEl.appendChild(labelEl);

    // Create a slider range in the middle
    const rangeEl = document.createElement("input");
    rangeEl.type = "range";
    rangeEl.min = minRange.toString();
    rangeEl.max = maxRange.toString();
    rangeEl.value = defaultValue.toString();
    rangeEl.step = steps.toString();
    if (id != null) rangeEl.id = id + "-range";
    sliderEl.appendChild(rangeEl);

    // Create an input text box on the right
    const numInputEl = document.createElement("input");
    numInputEl.style.minWidth = "40px";
    numInputEl.type = "number";
    numInputEl.min = minRange.toString();
    numInputEl.max = maxRange.toString();
    numInputEl.value = defaultValue.toString();
    numInputEl.step = steps.toString();
    if (id != null) numInputEl.id = id + "-number";
    sliderEl.appendChild(numInputEl);

    // Bind slider range and input text together
    rangeEl.oninput = () => (numInputEl.value = rangeEl.value);
    numInputEl.onchange = () => {
      const val = Math.max(minRange, Math.min(maxRange, parseInt(numInputEl.value))).toString();
      rangeEl.value = val;
      numInputEl.value = val;
    };

    // Append the new slider
    this.contentElement.appendChild(sliderEl);
    return sliderEl;
  }

  // ..
  addTextInput(label: string, placeholder: string, initialValue: string, id?: string): HTMLDivElement {
    const textInputEl = document.createElement("div");
    textInputEl.classList.add("flex-row", "ui-text-input-container");

    // Create a label on the left
    const labelEl = document.createElement("label");
    labelEl.textContent = label + ":";
    textInputEl.appendChild(labelEl);

    // Create an input element on the right
    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.placeholder = placeholder;
    inputEl.value = initialValue;
    if (id != null) inputEl.id = id;
    textInputEl.appendChild(inputEl);

    // Append the new text input
    this.contentElement.appendChild(textInputEl);
    return textInputEl;
  }

  // ..
  addButton(text: string, id?: string, bgColor?: string): HTMLButtonElement {
    const buttonEl = document.createElement("button");
    buttonEl.classList.add("ui-window__content__Button");
    buttonEl.textContent = text;
    if (id != null) buttonEl.id = id;
    if (bgColor != null) buttonEl.style.backgroundColor = bgColor;

    this.contentElement.appendChild(buttonEl);
    return buttonEl;
  }

  // ..
  addDropdownButton(label: string, options: string[], id?: string): HTMLDivElement {
    const dropdownRowEl = document.createElement("div");
    dropdownRowEl.classList.add("flex-row");

    // Create a label on the left
    const labelEl = document.createElement("label");
    labelEl.textContent = label + ":";
    dropdownRowEl.appendChild(labelEl);

    // Create a dropdown content on the right
    const dropdownContentEl = document.createElement("div");
    dropdownContentEl.classList.add("custom-dropdown-container");
    dropdownRowEl.appendChild(dropdownContentEl);

    // Create a dropdown button that resides in dropdown content
    const dropdownButtonEl = document.createElement("div");
    dropdownButtonEl.classList.add("dropdown-button");
    const displaySpanEl = document.createElement("span");
    displaySpanEl.textContent = options[0] ? options[0] : "Template Item";
    if (id != null) displaySpanEl.id = `${id}-display`;
    dropdownButtonEl.appendChild(displaySpanEl);
    dropdownContentEl.appendChild(dropdownButtonEl);

    // Create a dropdown list that resides in dropdown content
    const dropdownListEl = document.createElement("ul");
    dropdownListEl.classList.add("dropdown-list");
    if (id != null) dropdownListEl.id = `${id}-list`;
    dropdownContentEl.appendChild(dropdownListEl);

    // Populate the dropdown list
    let selectedIndex = 0;
    const items: HTMLLIElement[] = [];
    for (let i = 0; i < options.length; i++) {
      const optionText = options[i]!;
      const itemEl = document.createElement("li");
      itemEl.style.marginBottom = "0px";
      itemEl.classList.add("dropdown-item");
      itemEl.textContent = optionText;
      itemEl.dataset.index = i.toString();
      itemEl.dataset.value = optionText.toLowerCase().replace(/\s/g, "-");

      // Select the first item
      if (i === selectedIndex) {
        itemEl.classList.add("is-selected");
      }

      // Add listener for this item
      itemEl.addEventListener("click", (event) => {
        event.stopPropagation();
        items[selectedIndex]!.classList.remove("is-selected");
        selectedIndex = i;
        itemEl.classList.add("is-selected");
        displaySpanEl.textContent = optionText;
        dropdownListEl.classList.remove("is-open");
      });

      dropdownListEl.appendChild(itemEl);
      items.push(itemEl);
    }

    // Add event listener for opening and closing of the dropdown list
    dropdownButtonEl.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdownListEl.classList.toggle("is-open");
      if (isOpen) {
        const buttonRect = dropdownButtonEl.getBoundingClientRect();
        const listItems = dropdownListEl.querySelectorAll(".dropdown-item");
        const selectedItem = dropdownListEl.querySelector(".dropdown-item.is-selected") as HTMLElement | null;

        if (selectedItem) {
          const itemRect = selectedItem.getBoundingClientRect();
          const listRect = dropdownListEl.getBoundingClientRect();
          const buttonHeight = buttonRect.height;
          const itemHeight = itemRect.height;
          const selectedIndex = Array.from(listItems).indexOf(selectedItem);
          const shiftUp = selectedIndex * itemHeight + 6;
          dropdownListEl.style.transform = "none";
          dropdownListEl.style.top = `${buttonHeight - shiftUp - itemHeight}px`;
          dropdownListEl.scrollTop = shiftUp;
        }
      }
    });

    // Append the new dropdown button
    this.contentElement.appendChild(dropdownRowEl);
    return dropdownButtonEl;
  }

  // ..
  addToggleSwitch(label: string, initialState: boolean = false, id?: string): HTMLDivElement {
    const toggleRowEl = document.createElement("div");
    toggleRowEl.classList.add("flex-row");

    // Create a label on the left
    const labelEl = document.createElement("label");
    labelEl.textContent = label + ":";
    toggleRowEl.appendChild(labelEl);

    // Create a toggle content on the right
    const toggleContentEl = document.createElement("div");
    toggleContentEl.classList.add("toggle-container");
    toggleRowEl.appendChild(toggleContentEl);

    // Create a toggle button that resides in toggle content
    const toggleButtonEl = document.createElement("div");
    toggleButtonEl.classList.add("toggle-switch");
    toggleButtonEl.dataset.state = initialState ? "on" : "off";
    if (initialState) toggleButtonEl.classList.add("is-on");
    if (id != null) toggleButtonEl.id = id + "-switch";
    toggleContentEl.appendChild(toggleButtonEl);

    // Create I/O text and toggle slider
    const offIndicatorEl = document.createElement("span");
    offIndicatorEl.classList.add("toggle-indicator", "indicator-o");
    offIndicatorEl.textContent = "O";
    toggleButtonEl.appendChild(offIndicatorEl);

    const onIndicatorEl = document.createElement("span");
    onIndicatorEl.classList.add("toggle-indicator", "indicator-i");
    onIndicatorEl.textContent = "I";
    toggleButtonEl.appendChild(onIndicatorEl);

    const toggleSliderEl = document.createElement("div");
    toggleSliderEl.classList.add("toggle-slider");
    toggleButtonEl.appendChild(toggleSliderEl);

    // Add event listener to the toggle button
    toggleButtonEl.addEventListener("click", () => {
      const isOn = toggleButtonEl.classList.toggle("is-on");
      toggleButtonEl.dataset.state = isOn ? "on" : "off";
    });

    // Append the new toggle switch
    this.contentElement.appendChild(toggleRowEl);
    return toggleButtonEl;
  }
}
