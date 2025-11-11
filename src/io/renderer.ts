import type { BogEngine } from "../core/bog_engine";
import type { Color, Pixel } from "../types";

export class Renderer {
  // Dependencies
  private readonly bogEngine: BogEngine;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(bogEngine: BogEngine, canvasEl: HTMLCanvasElement) {
    this.bogEngine = bogEngine;
    this.ctx = canvasEl.getContext("2d") as CanvasRenderingContext2D;
  }

  public renderThisFrame(frameBuffer: Uint8ClampedArray, drawBrushOutline: boolean) {
    let postProcessFrameBuffer: Uint8ClampedArray = new Uint8ClampedArray(frameBuffer);

    // Draw brush outline
    if (drawBrushOutline) {
      const brushOutline = this.getBrushOutline();
      this.addBuffer(postProcessFrameBuffer, brushOutline);
    }

    // Push the final buffer
    const imageData: ImageData = new ImageData(
      postProcessFrameBuffer as ImageDataArray,
      this.bogEngine.gameWidth,
      this.bogEngine.gameHeight
    );
    this.ctx.putImageData(imageData, 0, 0);
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
  private getBrushOutline(): Pixel[] {
    const radius = this.bogEngine.getBrushSize();
    const mousePos = this.bogEngine.getMousePosition();

    const centerX = mousePos.x;
    const centerY = mousePos.y;
    const pixels: Pixel[] = [];
    const r = 227;
    const g = 227;
    const b = 227;
    const a = 180;

    const width = this.bogEngine.gameWidth;
    const height = this.bogEngine.gameHeight;
    const offsets: number[] = [-1, 1];

    const plotOctets = (x: number, y: number) => {
      for (const bigY of offsets) {
        for (const bigX of offsets) {
          const newX = centerX + x * bigX;
          const newY = centerY + y * bigY;
          const newx = centerX + y * bigX;
          const newy = centerY + x * bigY;

          if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            const index = newY * width + newX;
            pixels.push({ index: index, value: new Uint8ClampedArray([r, g, b, a]) as Color });
          }
          if (newx >= 0 && newx < width && newy >= 0 && newy < height) {
            const index = newy * width + newx;
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
