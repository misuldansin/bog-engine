import type { Particle, Index, Color, Pixel, GameSettings } from "../types";

export class Renderer {
  // DOM elements
  _canvas: HTMLCanvasElement;
  _ctx: CanvasRenderingContext2D;

  // Render variables
  _renderWidth: number;
  _renderHeight: number;
  _frameBuffer: Uint8ClampedArray;
  _queuedParticles: Particle[];
  _queuedOverlayPixels: Pixel[];
  _queuedUIPixels: Pixel[];

  constructor(canvas: HTMLCanvasElement, settings: GameSettings) {
    // Load DOM dependencies
    this._canvas = canvas;
    this._ctx = this._canvas.getContext("2d") as CanvasRenderingContext2D;

    this._renderWidth = settings.GAME_WIDTH;
    this._renderHeight = settings.GAME_HEIGHT;
    this._frameBuffer = new Uint8ClampedArray(this._renderWidth * this._renderHeight * 4);
    this._queuedParticles = [];
    this._queuedOverlayPixels = [];
    this._queuedUIPixels = [];

    // Initialise HTML elements
    this._canvas.width = this._renderWidth;
    this._canvas.height = this._renderHeight;
    this._ctx.imageSmoothingEnabled = false;
    this._ctx.translate(0, this._canvas.height);
    this._ctx.scale(1, -1);
  }

  // ..
  queueUIPixels(pixelsToQueue: Pixel[]) {
    // Clear previous pixels
    this._queuedUIPixels = [];

    this._queuedUIPixels = pixelsToQueue;
  }

  // ..
  queueParticles(particlesToQueue: Set<Particle> | Particle[], debugOverlayColor?: Color) {
    // Queue particles to be processed later by the renderer loop
    this._queuedParticles.push(...particlesToQueue);

    // Handle debug overlay
    if (debugOverlayColor) {
      const width: number = this._renderWidth;
      const height: number = this._renderHeight;
      for (const particle of particlesToQueue) {
        const flippedY: number = height - 1 - particle.position.y;
        const index: number = flippedY * width + particle.position.x;
        this._queuedOverlayPixels.push({ index: index, value: debugOverlayColor });
      }
    }
  }

  // ..
  queueOverlayPixels(pixelsToQueue: Pixel[]) {
    this._queuedOverlayPixels.push(...pixelsToQueue);
  }

  // ..
  renderThisFrame() {
    // Step 1. proccess queued particles this frame
    this.#processQueuedParticles();

    // Step 2. add overlay data
    let postProcessFrameBuffer: Uint8ClampedArray = new Uint8ClampedArray(this._frameBuffer);
    this.#addBuffer(postProcessFrameBuffer, this._queuedOverlayPixels);
    this.#addBuffer(postProcessFrameBuffer, this._queuedUIPixels);

    // Step 3. render the final result
    const imageData: ImageData = new ImageData(postProcessFrameBuffer as ImageDataArray, this._renderWidth, this._renderHeight);
    this._ctx.putImageData(imageData, 0, 0);

    // Step 4. clear any rendering data related to this frame
    this._queuedParticles.length = 0;
    this._queuedOverlayPixels = [];
    this._queuedUIPixels = [];
  }

  #processQueuedParticles() {
    const particlesToProcess: Particle[] = this._queuedParticles;
    const width: number = this._renderWidth;
    const height: number = this._renderHeight;

    for (const particle of particlesToProcess) {
      const particleX: number = particle.position.x;
      const particleY: number = particle.position.y;
      const flippedY: number = height - 1 - particleY;
      const index: number = flippedY * width + particleX;

      // Push particle's color to the fram buffer
      let pixelColor: Color = this.#processParticleColor(particle);
      this._frameBuffer[index * 4 + 0] = pixelColor[0]; // red
      this._frameBuffer[index * 4 + 1] = pixelColor[1]; // green
      this._frameBuffer[index * 4 + 2] = pixelColor[2]; // blue
      this._frameBuffer[index * 4 + 3] = pixelColor[3]; // alpha
    }
  }

  #processParticleColor(particle: Particle): Color {
    // ! Todo: process color here

    return particle.color;
  }

  #addBuffer(baseBuffer: Uint8ClampedArray, overrideBuffer: Pixel[]) {
    for (const { index, value } of overrideBuffer) {
      // Get RGBA channels of the base layer color
      const dr: number = baseBuffer[index * 4 + 0]!;
      const dg: number = baseBuffer[index * 4 + 1]!;
      const db: number = baseBuffer[index * 4 + 2]!;
      const da: number = baseBuffer[index * 4 + 3]!;

      // Get RGBA channels of overlay color
      const sr: number = value[0];
      const sg: number = value[1];
      const sb: number = value[2];
      const sa: number = value[3];

      // Apply blending: outVal = sourse * sourse_alpha + dest * (1 - sourse_alpha)
      const normalSA = sa / 255.0;
      const outR: number = Math.round(sr * normalSA + dr * (1.0 - normalSA));
      const outG: number = Math.round(sg * normalSA + dg * (1.0 - normalSA));
      const outB: number = Math.round(sb * normalSA + db * (1.0 - normalSA));
      const outA: number = Math.min(da, sa);

      // Add blended color values to the base buffer
      baseBuffer[index * 4 + 0] = outR;
      baseBuffer[index * 4 + 1] = outG;
      baseBuffer[index * 4 + 2] = outB;
      baseBuffer[index * 4 + 3] = outA;
    }
  }
}
