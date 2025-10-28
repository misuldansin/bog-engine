import type { Particle, Index, Color, Pixel, GameSettings } from "../types";

export class Renderer {
  // DOM elements
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;

  // Render variables
  #renderWidth: number;
  #renderHeight: number;
  #frameBuffer: Uint8ClampedArray;
  #queuedParticles: Particle[];
  #queuedOverlayPixels: Pixel[];
  #queuedUIPixels: Pixel[];

  constructor(canvas: HTMLCanvasElement, settings: GameSettings) {
    // Load DOM dependencies
    this.#canvas = canvas;
    this.#ctx = this.#canvas.getContext("2d") as CanvasRenderingContext2D;

    this.#renderWidth = settings.GAME_WIDTH;
    this.#renderHeight = settings.GAME_HEIGHT;
    this.#frameBuffer = new Uint8ClampedArray(this.#renderWidth * this.#renderHeight * 4);
    this.#queuedParticles = [];
    this.#queuedOverlayPixels = [];
    this.#queuedUIPixels = [];

    // Initialise HTML elements
    this.#canvas.width = this.#renderWidth;
    this.#canvas.height = this.#renderHeight;
    this.#ctx.imageSmoothingEnabled = false;
    this.#ctx.translate(0, this.#canvas.height);
    this.#ctx.scale(1, -1);
  }

  // ..
  queueUIPixels(pixelsToQueue: Pixel[]) {
    // Clear previous pixels
    this.#queuedUIPixels = [];

    this.#queuedUIPixels = pixelsToQueue;
  }

  // ..
  queueParticles(particlesToQueue: Set<Particle> | Particle[], debugOverlayColor?: Color) {
    // Queue particles to be processed later by the renderer loop
    this.#queuedParticles.push(...particlesToQueue);

    // Handle debug overlay
    if (debugOverlayColor) {
      const width: number = this.#renderWidth;
      const height: number = this.#renderHeight;
      for (const particle of particlesToQueue) {
        const flippedY: number = height - 1 - particle.position.y;
        const index: number = flippedY * width + particle.position.x;
        this.#queuedOverlayPixels.push({ index: index, value: debugOverlayColor });
      }
    }
  }

  // ..
  queueOverlayPixels(pixelsToQueue: Pixel[]) {
    this.#queuedOverlayPixels.push(...pixelsToQueue);
  }

  // ..
  renderThisFrame() {
    // Step 1. proccess queued particles this frame
    this.#processQueuedParticles();

    // Step 2. add overlay data
    let postProcessFrameBuffer: Uint8ClampedArray = new Uint8ClampedArray(this.#frameBuffer);
    this.#addBuffer(postProcessFrameBuffer, this.#queuedOverlayPixels);
    this.#addBuffer(postProcessFrameBuffer, this.#queuedUIPixels);

    // Step 3. render the final result
    const imageData: ImageData = new ImageData(postProcessFrameBuffer as ImageDataArray, this.#renderWidth, this.#renderHeight);
    this.#ctx.putImageData(imageData, 0, 0);

    // Step 4. clear any rendering data related to this frame
    this.#queuedParticles.length = 0;
    this.#queuedOverlayPixels = [];
  }

  #processQueuedParticles() {
    const particlesToProcess: Particle[] = this.#queuedParticles;
    const width: number = this.#renderWidth;
    const height: number = this.#renderHeight;

    for (const particle of particlesToProcess) {
      const particleX: number = particle.position.x;
      const particleY: number = particle.position.y;
      const flippedY: number = height - 1 - particleY;
      const index: number = flippedY * width + particleX;

      // Push particle's color to the fram buffer
      let pixelColor: Color = this.#processParticleColor(particle);
      this.#frameBuffer[index * 4 + 0] = pixelColor[0]; // red
      this.#frameBuffer[index * 4 + 1] = pixelColor[1]; // green
      this.#frameBuffer[index * 4 + 2] = pixelColor[2]; // blue
      this.#frameBuffer[index * 4 + 3] = pixelColor[3]; // alpha
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
