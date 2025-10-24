import type { Offset } from "../types";

export const Utilities = {
  lerp(a: number, b: number, t: number): number {
    // Linear interpolation: a + (b - a) * t
    return a + (b - a) * t;
  },
  shuffleArray<T>(array: T[]): T[] {
    // Copy the original array
    const outArray = [...array];

    // Shuffle and return
    for (let i = outArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [outArray[i], outArray[j]] = [outArray[j]!, outArray[i]!];
    }
    return outArray;
  },

  calculateRepose(angleDeg: number): Offset[][] {
    let angle: number = Math.max(10, Math.min(angleDeg, 80));
    const t: number = (angle * Math.PI) / 180;

    let directions: Offset[][] = [];

    // First, go straight down
    directions.push([{ dx: 0, dy: -1 }]);

    // If the angle is less than 50°...
    if (angle < 50) {
      // ..Then, second, go down, and left and right
      directions.push([
        { dx: 1, dy: -1 },
        { dx: -1, dy: -1 },
      ]);

      // Third, go down, and cot(θ) times left and right, where θ is in radian
      const x = Math.round(1 / Math.tan(t));
      directions.push([
        { dx: x, dy: -1 },
        { dx: x * -1, dy: -1 },
      ]);
    }

    // If the angle is greater than 50°...
    else {
      //..Then, second, go down, and left and right
      const y = Math.round(Math.tan(t));
      directions.push([
        { dx: 1, dy: -y },
        { dx: -1, dy: -y },
      ]);
    }

    return directions;
  },
};
