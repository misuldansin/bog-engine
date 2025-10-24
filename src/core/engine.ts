import type { ParticleMap, Particle, Index, Offset, Color, SandParticle, LiquidParticle } from "../types";

import { Grid } from "../structs/grid";
import { Settings } from "../settings";
import type { Renderer } from "../io/renderer";
import type { InputManager } from "../io/inputManager";
import type { Debug } from "../io/debug";
import { Utilities } from "../structs/utils";

export class Engine {
  // Dependencies
  #renderer: Renderer;
  #inputManager: InputManager;
  #debug: Debug;

  // Grid variables
  #gameWidth: number;
  #gameHeight: number;
  #currentGrid: Grid;
  #particlesProcessed: Set<Index>;

  // Loop variables
  #isRunning: boolean;
  #animationFrameId: number | null;
  #renderUpdateInterval: number;
  #physicsInterval: number;

  // Time tracking variables
  #lastFrameTime: number | null;
  #accumulator: number;
  tickCount: number;

  constructor(
    gameWidth: number,
    gameHeight: number,
    particleDataBlueprint: ParticleMap,
    renderInstance: Renderer,
    inputManagerInstance: InputManager,
    debugInstance: Debug
  ) {
    this.#renderer = renderInstance;
    this.#inputManager = inputManagerInstance;
    this.#debug = debugInstance;

    this.#gameWidth = gameWidth;
    this.#gameHeight = gameHeight;
    this.#currentGrid = new Grid(gameWidth, gameHeight, particleDataBlueprint);
    this.#particlesProcessed = new Set();

    this.#isRunning = false;
    this.#animationFrameId = null;
    this.#renderUpdateInterval = Settings.RENDER_UPDATE_INTERVAL;
    this.#physicsInterval = Settings.PHYSICS_UPDATE_INTERVAL;

    this.#lastFrameTime = null;
    this.#accumulator = 0;
    this.tickCount = 0;

    // Queue grid to render
    this.#renderer.queueParticles(this.#currentGrid.dirtyParticles);
  }

  // ..
  start() {
    if (!this.#isRunning) {
      this.#isRunning = true;
      this.#gameLoop(0);
    }
  }

  // ..
  stop() {
    this.#isRunning = false;
    if (this.#animationFrameId) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
  }

  // ..
  #gameLoop = (timestamp: number) => {
    if (!this.#isRunning) return;

    // Skip the first frame
    if (!this.#lastFrameTime) {
      this.#lastFrameTime = timestamp;
      this.#animationFrameId = requestAnimationFrame(this.#gameLoop);
      return;
    }

    const delta = timestamp - this.#lastFrameTime;
    this.#lastFrameTime = timestamp;

    // ------ Handle Input ------
    this.#inputManager.processInput(this.#currentGrid, this.#renderer);

    // ------ Update Physics ------
    this.#accumulator += delta;
    while (this.#accumulator >= this.#physicsInterval) {
      // Get dirty particles from previous frame
      let prevDirtyParticles: Particle[] = Array.from(this.#currentGrid.dirtyParticles);

      // Queue particles to be rendered and clear them
      const overlayColor: Color = new Uint8ClampedArray([238, 66, 81, 140]) as Color;
      this.#renderer.queueParticles(this.#currentGrid.dirtyParticles);
      this.#currentGrid.dirtyParticles.clear();

      // Update physics this frame
      this.#stepPhysics(prevDirtyParticles);

      this.tickCount++;
      this.#accumulator -= this.#physicsInterval;
    }

    // ------ Render This Frame ------
    this.#renderer.renderThisFrame();

    // ------ Update Debug Stats ------
    this.#debug.updateDisplay(timestamp, this);

    this.#animationFrameId = requestAnimationFrame(this.#gameLoop);
  };

  // ..
  #stepPhysics(particlesToUpdate: Particle[]) {
    // Exit if there's nothing to update
    if (particlesToUpdate.length === 0) {
      return;
    }

    // Clear particles processed array and current grid's dirty particles to initialise for the next part
    this.#particlesProcessed.clear();

    // Shuffle the entire list to randomize the horizontal order
    particlesToUpdate = Utilities.shuffleArray(particlesToUpdate);

    // Sort from bottom to top (y-coordinate)
    particlesToUpdate.sort((particleA, particleB) => particleA.position.y - particleB.position.y);

    // Loop through previous dirty particles and update them
    for (const particle of particlesToUpdate) {
      if (!particle) continue; // If particle is null, don't bother

      // If the particle was already processed this frame, don't bother
      if (this.#particlesProcessed.has(particle.index)) continue;

      switch (particle.category) {
        case 1:
          // Handle Solids
          break;
        case 2:
          // Handle liquids
          break;
        case 3:
          // Handle Gas
          break;
        case 4:
          // Handle Sands
          this.#handleSands(particle);
          break;
        case 5:
          // Handle Electronics
          break;
        default:
          continue;
      }
    }
  }

  // ..
  #handleLiquids(particle: LiquidParticle) {
    //
  }

  // ..
  #handleSands(particle: SandParticle) {
    let directions = particle.reposeDirections;

    // let directions: Offset[][] = [
    //   [{ dx: 0, dy: -1 }],
    //   [
    //     { dx: 1, dy: -1 },
    //     { dx: -1, dy: -1 },
    //   ],
    // ];

    const targetParticle = this.#currentGrid.tryMoveParticle(particle, directions, true, true, true);
    if (targetParticle) {
      this.#particlesProcessed.add(particle.index);
      this.#particlesProcessed.add(targetParticle.index);
    }
  }
}
