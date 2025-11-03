import type { BogEngine } from "../core/bog_engine";

export class InputManager {
  // Dependencies
  private readonly bogEngine: BogEngine;

  // Internal States
  public rawClientX: number = 0;
  public rawClientY: number = 0;
  public rawScrollDeltaY: number = 0;
  public isPrimaryButtonDown: boolean = false;
  public isSecondaryButtonDown: boolean = false;
  public isAuxiliaryButtonDown: boolean = false;

  private activePointerId: number | null = null;
  public isCanvasHovered: boolean = false;
  public scaleFactorX: number = 1;
  public scaleFactorY: number = 1;
  public canvasRectLeft: number = 0;
  public canvasRectTop: number = 0;

  constructor(bogEngine: BogEngine, canvasEl: HTMLCanvasElement) {
    this.bogEngine = bogEngine;

    // Update canvas related properties
    this.calculateCanvasSize();

    // Bind event listeners
    this.bindCanvasEvents(canvasEl);
    this.bindExternalEvents();
  }

  private bindCanvasEvents(canvasEl: HTMLCanvasElement) {
    canvasEl.addEventListener("pointerdown", this.onCanvasPointerDown);
    canvasEl.addEventListener("pointermove", this.onCanvasPointerMove);
    canvasEl.addEventListener("pointerup", this.onCanvasPointerUp);
    canvasEl.addEventListener("pointercancel", this.onCanvasPointerUp);
    canvasEl.addEventListener("lostpointercapture", this.onCanvasPointerUp);
    canvasEl.addEventListener("pointerenter", this.onCanvasPointerEnter);
    canvasEl.addEventListener("pointerleave", this.onCanvasPointerLeave);
    canvasEl.addEventListener("focus", this.onCanvasPointerFocus);
    canvasEl.addEventListener("blur", this.onCanvasPointerLeave);
    canvasEl.addEventListener("wheel", this.onCanvasWheel, { passive: false });
  }

  // ========================================================
  // ----------------- Helper Functions ---------------------

  private bindExternalEvents() {
    window.addEventListener("pointerup", this.onWindowPointerUp);
    window.addEventListener("resize", this.calculateCanvasSize);
    document.addEventListener("visibilitychange", this.onViewportVisibilityChange);
  }

  private tryReleaseCapture(element: HTMLElement, pointerId: number) {
    try {
      element.releasePointerCapture(pointerId);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Pointer capture error:", err);
      }
    }
  }

  private trySetCapture(element: HTMLElement, pointerId: number) {
    try {
      element.setPointerCapture(pointerId);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Pointer capture error:", err);
      }
    }
  }

  // ========================================================
  // -------------- Event Listener Functions ----------------

  private onCanvasPointerDown = (e: PointerEvent) => {
    // Update pointer raw position
    this.rawClientX = e.clientX;
    this.rawClientY = e.clientY;

    // Capture pointer click
    switch (e.button) {
      case 0:
        this.isPrimaryButtonDown = true;
        break;
      case 2:
        this.isSecondaryButtonDown = true;
        break;
      case 1:
        this.isAuxiliaryButtonDown = true;
        break;

      default:
        break;
    }

    // Try to capture canvas pointer event to keep recieving inputs
    // ..even if pointer is not in canvas bounds
    this.trySetCapture(this.bogEngine.canvasElement, e.pointerId);
    this.activePointerId = e.pointerId;
  };

  private onCanvasPointerMove = (e: PointerEvent) => {
    // Update pointer raw position
    this.rawClientX = e.clientX;
    this.rawClientY = e.clientY;

    // Update pointer button click during drag
    if (typeof e.buttons === "number") {
      this.isPrimaryButtonDown = (e.buttons & 1) === 1;
      this.isSecondaryButtonDown = (e.buttons & 2) === 2;
      this.isAuxiliaryButtonDown = (e.button & 4) === 4;
    }
  };

  private onCanvasPointerUp = (e: PointerEvent) => {
    // The same pointer has called this event, try to release captured pointer
    if (this.activePointerId === e.pointerId) {
      this.tryReleaseCapture(this.bogEngine.canvasElement, e.pointerId);
      this.activePointerId = null;
    }

    // Update pointer button flags
    this.isPrimaryButtonDown = false;
    this.isSecondaryButtonDown = false;
    this.isAuxiliaryButtonDown = false;
  };

  private onCanvasPointerEnter = (e: PointerEvent) => {
    // Update pointer raw position
    this.rawClientX = e.clientX;
    this.rawClientY = e.clientY;

    // Update internal states
    this.isCanvasHovered = true;
  };

  private onCanvasPointerFocus = () => {
    // Update internal states
    this.isCanvasHovered = true;
  };

  private onCanvasPointerLeave = () => {
    this.isCanvasHovered = false;
  };

  private onCanvasWheel = (e: WheelEvent) => {
    e.preventDefault();

    // Update raw scroll delta
    this.rawScrollDeltaY = e.deltaY;
  };

  private onWindowPointerUp = () => {
    this.isPrimaryButtonDown = false;
    this.isSecondaryButtonDown = false;
    this.isAuxiliaryButtonDown = false;
    this.activePointerId = null;
  };

  private onViewportVisibilityChange = () => {
    if (document.hidden) {
      this.isPrimaryButtonDown = false;
      this.isSecondaryButtonDown = false;
      this.isAuxiliaryButtonDown = false;
      this.activePointerId = null;
    }
  };

  private calculateCanvasSize = () => {
    const canvasElement = this.bogEngine.canvasElement;
    const rect = canvasElement.getBoundingClientRect();

    this.canvasRectLeft = rect.left;
    this.canvasRectTop = rect.top;
    this.scaleFactorX = this.bogEngine.gameWidth / rect.width;
    this.scaleFactorY = this.bogEngine.gameHeight / rect.height;
  };
}
