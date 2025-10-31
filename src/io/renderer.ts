import type { BoggedState } from "../core/bogged_state";
import type { Particle, Color, Pixel } from "../types";

export class Renderer {
  // Dependencies & DOM References
  private readonly boggedState: BoggedState;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  // Render variables
  private frameBuffer: Uint8ClampedArray;
  private queuedParticles: Particle[];
  private queuedOverlayPixels: Pixel[];
  private queuedUIPixels: Pixel[];

  constructor(boggedStateInstance: BoggedState, canvas: HTMLCanvasElement) {
    this.boggedState = boggedStateInstance;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.frameBuffer = new Uint8ClampedArray(this.boggedState.gameWidth * this.boggedState.gameHeight * 4);
    this.queuedParticles = [];
    this.queuedOverlayPixels = [];
    this.queuedUIPixels = [];

    // Initialise HTML elements
    this.canvas.style.aspectRatio = (this.boggedState.gameWidth / this.boggedState.gameHeight).toString();
    this.canvas.width = this.boggedState.gameWidth;
    this.canvas.height = this.boggedState.gameHeight;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.translate(0, this.canvas.height);
    this.ctx.scale(1, -1);
  }

  // ..
  public queueUIPixels(pixelsToQueue: Pixel[]) {
    // Clear previous pixels
    this.queuedUIPixels = [];

    this.queuedUIPixels = pixelsToQueue;
  }

  // ..
  public queueParticles(particlesToQueue: Set<Particle> | Particle[], debugOverlayColor?: Color) {
    // Queue particles to be processed later by the renderer loop
    this.queuedParticles.push(...particlesToQueue);

    // Handle debug overlay
    if (debugOverlayColor) {
      const width: number = this.boggedState.gameWidth;
      const height: number = this.boggedState.gameHeight;
      for (const particle of particlesToQueue) {
        const flippedY: number = height - 1 - particle.position.y;
        const index: number = flippedY * width + particle.position.x;
        this.queuedOverlayPixels.push({ index: index, value: debugOverlayColor });
      }
    }
  }

  // ..
  public queueOverlayPixels(pixelsToQueue: Pixel[]) {
    this.queuedOverlayPixels.push(...pixelsToQueue);
  }

  // ..
  public renderThisFrame() {
    // Draw brush outline on the canvas
    if (this.boggedState.isBrushOutlineVisible) {
      const brushOutline = this.getBrushOutline(Math.floor(this.boggedState.mouseX), Math.floor(this.boggedState.mouseY));
      this.queuedUIPixels = brushOutline;
    }

    // Proccess queued particles this frame
    this.processQueuedParticles();

    // Add overlay data
    let postProcessFrameBuffer: Uint8ClampedArray = new Uint8ClampedArray(this.frameBuffer);
    this.addBuffer(postProcessFrameBuffer, this.queuedOverlayPixels);
    this.addBuffer(postProcessFrameBuffer, this.queuedUIPixels);

    // Push the final buffer
    const imageData: ImageData = new ImageData(
      postProcessFrameBuffer as ImageDataArray,
      this.boggedState.gameWidth,
      this.boggedState.gameHeight
    );
    this.ctx.putImageData(imageData, 0, 0);

    // Clear any rendering data related to this frame
    this.queuedParticles.length = 0;
    this.queuedOverlayPixels = [];
    this.queuedUIPixels = [];
  }

  private processQueuedParticles() {
    const particlesToProcess: Particle[] = this.queuedParticles;
    const width: number = this.boggedState.gameWidth;
    const height: number = this.boggedState.gameHeight;

    for (const particle of particlesToProcess) {
      const particleX: number = particle.position.x;
      const particleY: number = particle.position.y;
      const flippedY: number = height - 1 - particleY;
      const index: number = flippedY * width + particleX;

      // Push particle's color to the fram buffer
      let pixelColor: Color = this.processParticleColor(particle);
      this.frameBuffer[index * 4 + 0] = pixelColor[0]; // red
      this.frameBuffer[index * 4 + 1] = pixelColor[1]; // green
      this.frameBuffer[index * 4 + 2] = pixelColor[2]; // blue
      this.frameBuffer[index * 4 + 3] = pixelColor[3]; // alpha
    }
  }

  private processParticleColor(particle: Particle): Color {
    // ! Todo: process color here

    return particle.color;
  }

  private addBuffer(baseBuffer: Uint8ClampedArray, overrideBuffer: Pixel[]) {
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

  // Function to generate the overlay map for the circle outline
  private getBrushOutline(centerX: number, centerY: number): Pixel[] {
    const radius: number = this.boggedState.currentBrushSize;
    const pixels: Pixel[] = [];
    const r: number = 227;
    const g: number = 227;
    const b: number = 227;
    const a: number = 180;

    const width: number = this.boggedState.gameWidth;
    const height: number = this.boggedState.gameHeight;
    const offsets: number[] = [-1, 1];

    const plotOctets = (x: number, y: number) => {
      for (const bigY of offsets) {
        for (const bigX of offsets) {
          const newX = centerX + x * bigX;
          const newY = centerY + y * bigY;
          const newx = centerX + y * bigX;
          const newy = centerY + x * bigY;

          if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            const index = (height - newY) * width + newX;
            pixels.push({ index: index, value: new Uint8ClampedArray([r, g, b, a]) as Color });
          }
          if (newx >= 0 && newx < width && newy >= 0 && newy < height) {
            const index = (height - newy) * width + newx;
            pixels.push({ index: index, value: new Uint8ClampedArray([r, g, b, a]) as Color });
          }
        }
      }
    };

    let x: number = radius;
    let y: number = 0;
    let P: number = radius - radius;

    plotOctets(x, y);

    while (y < x) {
      y++;
      if (P < 0) {
        P += 2 * y + 1;
      } else {
        x--;
        P += 2 * (y - x) + 1;
      }
      plotOctets(x, y);
    }
    return pixels;
  }
}
