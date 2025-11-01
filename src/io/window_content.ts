import { color } from "../structs/color_utils";
import type { FontWeight, Index, Size, Vector2 } from "../types";

export class WindowContent {
  public contentElement: HTMLDivElement;

  constructor() {
    this.contentElement = document.createElement("div");
    this.contentElement.classList.add("ui-window__content");
  }

  // ..
  public addSeparator(heightPixel: number = 1, isVisible: boolean = false): HTMLDivElement {
    const separatorEl = document.createElement("div");
    separatorEl.classList.add("ui-window__content__separator");
    separatorEl.style.height = `${heightPixel}px`;

    if (isVisible) {
      const separatorLineEl = document.createElement("div");
      separatorLineEl.classList.add("ui-window__content__separator__line");
      separatorEl.appendChild(separatorLineEl);
    }

    this.contentElement.appendChild(separatorEl);
    return separatorEl;
  }

  // ..
  public addTitle(text: string): HTMLHeadingElement {
    const titleEl = document.createElement("h3");
    titleEl.classList.add("ui-window__content__heading-title");
    titleEl.textContent = text;

    this.contentElement.appendChild(titleEl);
    return titleEl;
  }

  // ..
  public addSection(text: string): HTMLHeadingElement {
    const sectionEl = document.createElement("h4");
    sectionEl.classList.add("ui-window__content__heading-section");
    sectionEl.textContent = text;

    this.contentElement.appendChild(sectionEl);
    return sectionEl;
  }

  // ..
  public addText(text: string, color?: string, fontWeight?: FontWeight, id?: string): HTMLParagraphElement {
    const textEl = document.createElement("p");
    textEl.classList.add("ui-window__content__text");
    textEl.textContent = text;
    if (color != null) textEl.style.color = color;
    if (id != null) textEl.id = id;
    if (fontWeight != null) textEl.style.fontWeight = fontWeight;

    this.contentElement.appendChild(textEl);
    return textEl;
  }

  // ..
  public addPropertyPanel(label: string, value: string, id?: string): HTMLDivElement {
    const isHexColor = (hex: string): boolean => {
      if (hex.length === 0) return false;
      const hexPattern = /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
      return hexPattern.test(hex.trim());
    };

    const propertyRowEl = document.createElement("div");
    propertyRowEl.classList.add("ui-window__helper__flex-row", "ui-window__content__info-row");
    if (id != null) propertyRowEl.id = id;

    // Create a label on the left
    const labelEl = document.createElement("label");
    labelEl.textContent = `${label}:`;
    propertyRowEl.appendChild(labelEl);

    // Create a spacer in the middle
    const spacerEl = document.createElement("div");
    spacerEl.classList.add("ui-window__helper__spacer");
    propertyRowEl.appendChild(spacerEl);

    // Create a value span on the right
    const valueEl = document.createElement("span");
    valueEl.classList.add("ui-window__content__info-value");
    valueEl.textContent = value;
    propertyRowEl.appendChild(valueEl);

    // Pretifier
    if (isHexColor(value)) {
      valueEl.style.backgroundColor = value;
      valueEl.style.padding = "0 6px";
      valueEl.style.borderRadius = "6px";

      valueEl.style.color = color.getHexLuminance(value) > 115 ? "#323238" : "#FFFFFF";
    }

    // Append the new property panel
    this.contentElement.appendChild(propertyRowEl);
    return propertyRowEl;
  }

  // ..
  public addDropperPanel(label: string, id?: string): HTMLDivElement {
    const dropperPanelEl = document.createElement("div");
    dropperPanelEl.classList.add("ui-window__helper__flex-row");
    if (id != null) dropperPanelEl.id = id;

    // Create a label on the left
    const labelEl = document.createElement("label");
    labelEl.textContent = `${label}:`;
    dropperPanelEl.appendChild(labelEl);

    // Create a spacer in the middle
    const spacerEl = document.createElement("div");
    spacerEl.classList.add("ui-window__helper__spacer");
    dropperPanelEl.appendChild(spacerEl);

    // Create a dropper button on the right
    const buttonEl = document.createElement("button");
    buttonEl.classList.add("ui-window__mini-button");
    buttonEl.style.backgroundColor = "transparent";

    const iconEl = document.createElement("img");
    iconEl.classList.add("ui-window__mini-button__icon");
    iconEl.src = "./assets/icons/dropper.svg";
    buttonEl.appendChild(iconEl);
    dropperPanelEl.appendChild(buttonEl);

    // Append the new dropper panel
    this.contentElement.appendChild(dropperPanelEl);
    return dropperPanelEl;
  }

  // ..
  public addLink(text: string, url: string, id?: string): HTMLParagraphElement {
    const linkEl = document.createElement("p");
    linkEl.classList.add("ui-window__content__text");
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
  public addBulletedList(items: string[]): HTMLUListElement {
    const bulletEl = document.createElement("ul");
    bulletEl.classList.add("ui-window__content");

    items.forEach((itemText) => {
      const ItemEl = document.createElement("li");
      ItemEl.classList.add("ui-window__content");
      ItemEl.textContent = itemText;
      bulletEl.appendChild(ItemEl);
    });

    this.contentElement.appendChild(bulletEl);
    return bulletEl;
  }

  // ..
  public addNumberedList(items: string[]): HTMLOListElement {
    const numEl = document.createElement("ol");
    numEl.classList.add("ui-window__content");

    items.forEach((itemText) => {
      const ItemEl = document.createElement("li");
      ItemEl.classList.add("ui-window__content");
      ItemEl.textContent = itemText;
      numEl.appendChild(ItemEl);
    });

    this.contentElement.appendChild(numEl);
    return numEl;
  }

  // ..
  public addImage(size: Size, src: string, alt: string, id?: string): HTMLImageElement {
    const imageEl = document.createElement("img");
    imageEl.classList.add("ui-window__content__image");
    imageEl.src = src;
    imageEl.alt = alt;
    imageEl.width = size.width;
    imageEl.height = size.height;
    if (id != null) imageEl.id = id;

    this.contentElement.appendChild(imageEl);
    return imageEl;
  }

  // ..
  public addSlider(label: string, minRange: number, maxRange: number, defaultValue: number, steps: number, id?: string): HTMLDivElement {
    const sliderEl = document.createElement("div");
    sliderEl.classList.add("ui-window__helper__flex-row");
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
  public addTextInput(label: string, placeholder: string, initialValue: string, id?: string): HTMLDivElement {
    const textInputEl = document.createElement("div");
    textInputEl.classList.add("ui-window__content__text-input__wrapper");

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
  public addButton(text: string, id?: string, bgColor?: string): HTMLButtonElement {
    const buttonEl = document.createElement("button");
    buttonEl.classList.add("ui-window__content__button");
    buttonEl.textContent = text;
    if (id != null) buttonEl.id = id;
    if (bgColor != null) buttonEl.style.backgroundColor = bgColor;

    this.contentElement.appendChild(buttonEl);
    return buttonEl;
  }

  // ..
  public addDropdownButton(
    label: string,
    options: string[],
    selectedOption: Index = 0,
    id?: string
  ): { button: HTMLDivElement; items: HTMLLIElement[] } {
    const dropdownRowEl = document.createElement("div");
    dropdownRowEl.classList.add("ui-window__helper__flex-row");

    // Create a label on the left
    const labelEl = document.createElement("label");
    labelEl.textContent = label + ":";
    dropdownRowEl.appendChild(labelEl);

    // Create a dropdown content on the right
    const dropdownContentEl = document.createElement("div");
    dropdownContentEl.classList.add("ui-window__content__dropdown-button__wrapper");
    dropdownRowEl.appendChild(dropdownContentEl);

    // Create a dropdown button that resides in dropdown content
    const dropdownButtonEl = document.createElement("div");
    dropdownButtonEl.classList.add("ui-window__content__dropdown-button");
    const displaySpanEl = document.createElement("span");
    displaySpanEl.textContent = options[0] ? options[0] : "Template Item";
    if (id != null) displaySpanEl.id = `${id}-display`;
    dropdownButtonEl.appendChild(displaySpanEl);
    dropdownContentEl.appendChild(dropdownButtonEl);

    // Create a dropdown list that resides in dropdown content
    const dropdownListEl = document.createElement("ul");
    dropdownListEl.classList.add("ui-window__content__dropdown-list");
    if (id != null) dropdownListEl.id = `${id}-list`;
    dropdownContentEl.appendChild(dropdownListEl);

    // Populate the dropdown list
    let selectedIndex = Math.max(0, Math.min(selectedOption, options.length - 1));
    const items: HTMLLIElement[] = [];
    for (let i = 0; i < options.length; i++) {
      const optionText = options[i]!;
      const itemEl = document.createElement("li");
      itemEl.style.marginBottom = "0px";
      itemEl.classList.add("ui-window__content__dropdown-item");
      itemEl.textContent = optionText;
      itemEl.dataset.index = i.toString();
      itemEl.dataset.value = optionText.toLowerCase().replace(/\s/g, "-");

      // Select the first item
      if (i === selectedIndex) {
        itemEl.classList.add("is-selected");
        displaySpanEl.textContent = optionText;
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
        const originalParent = dropdownListEl.parentElement!;
        dropdownListEl.dataset.originId = dropdownContentEl.id;
        document.body.appendChild(dropdownListEl);

        const buttonRect = dropdownButtonEl.getBoundingClientRect();
        const listRect = dropdownListEl.getBoundingClientRect();
        const listHeight = dropdownListEl.scrollHeight || listRect.height;
        const viewportH = document.documentElement.clientHeight;

        dropdownListEl.style.position = "absolute";
        dropdownListEl.style.left = `${buttonRect.left}px`;
        dropdownListEl.style.width = `${buttonRect.width}px`;
        dropdownListEl.style.zIndex = "9999";

        const selectedItem = dropdownListEl.querySelector(".dropdown-item.is-selected");
        if (selectedItem) {
          const offsetInList = (selectedItem as HTMLElement).offsetTop;
          let desiredTop = buttonRect.top - offsetInList;
          if (desiredTop < 0) desiredTop = 0;
          if (desiredTop + listHeight > viewportH) desiredTop = Math.max(0, viewportH - listHeight);
          dropdownListEl.style.top = `${Math.round(desiredTop)}px`;
          dropdownListEl.scrollTop = offsetInList;
        } else {
          let desiredTop = buttonRect.bottom;
          if (desiredTop + listHeight > viewportH) {
            desiredTop = Math.max(0, viewportH - listHeight);
          }
          dropdownListEl.style.top = `${Math.round(desiredTop)}px`;
          dropdownListEl.scrollTop = 0;
        }
      } else {
        if (dropdownListEl.parentElement === document.body) {
          dropdownContentEl.appendChild(dropdownListEl);
        }
      }
    });

    // Append the new dropdown button
    this.contentElement.appendChild(dropdownRowEl);
    return { button: dropdownButtonEl, items: items };
  }

  // ..
  public addToggleSwitch(label: string, initialState: boolean = false, id?: string): HTMLDivElement {
    const toggleRowEl = document.createElement("div");
    toggleRowEl.classList.add("ui-window__helper__flex-row");

    // Create a label on the left
    const labelEl = document.createElement("label");
    labelEl.textContent = label + ":";
    toggleRowEl.appendChild(labelEl);

    // Create a toggle content on the right
    const toggleContentEl = document.createElement("div");
    toggleContentEl.classList.add("ui-window__content__toggle-button__wrapper");
    toggleRowEl.appendChild(toggleContentEl);

    // Create a toggle button that resides in toggle content
    const toggleButtonEl = document.createElement("div");
    toggleButtonEl.classList.add("ui-window__content__toggle-button");
    toggleButtonEl.dataset.state = initialState ? "on" : "off";
    if (initialState) toggleButtonEl.classList.add("is-on");
    if (id != null) toggleButtonEl.id = id + "-switch";
    toggleContentEl.appendChild(toggleButtonEl);

    // Create I/O text and toggle slider
    const offIndicatorEl = document.createElement("span");
    offIndicatorEl.classList.add("ui-window__content__toggle-button__indicator", "indicator-o");
    offIndicatorEl.textContent = "O";
    toggleButtonEl.appendChild(offIndicatorEl);

    const onIndicatorEl = document.createElement("span");
    onIndicatorEl.classList.add("ui-window__content__toggle-button__indicator", "indicator-i");
    onIndicatorEl.textContent = "I";
    toggleButtonEl.appendChild(onIndicatorEl);

    const toggleSliderEl = document.createElement("div");
    toggleSliderEl.classList.add("ui-window__content__toggle-button__slider");
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
