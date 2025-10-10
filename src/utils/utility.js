export const Utility = {
  lerp(a, b, t) {
    return a + (b - a) * t;
  },
  shuffleArray(arrayToShuffle) {
    const shuffledArray = [...arrayToShuffle];

    for (let i = shuffledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
  },
  calculateRepose(angleDeg) {
    let angle = Math.max(10, Math.min(angleDeg, 80));
    const t = (angle * Math.PI) / 180;

    let directions = [];

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
