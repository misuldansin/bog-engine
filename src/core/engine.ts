import type { ParticleMap, Particle, Index, Vector2, Offset, Color, SandParticle, LiquidParticle } from "../types";

import { Grid, NEIGHBOR, NEIGHBORHOOD } from "../structs/grid";
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
      const particlesToUpdate: Particle[] = [];
      for (const index of this.#currentGrid.dirtyParticles) {
        particlesToUpdate.push(this.#currentGrid.data[index]!);
      }
      this.#currentGrid.dirtyParticles.clear();

      const overlayColor: Color = new Uint8ClampedArray([238, 66, 81, 140]) as Color;
      this.#renderer.queueParticles(particlesToUpdate, overlayColor);

      // Update physics this frame
      this.#stepPhysics(particlesToUpdate);

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
          this.#handleLiquids(particle);
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

    const targetParticle = this.#currentGrid.tryMoveParticle(particle, directions, true, true, true);
    if (targetParticle) {
      this.#particlesProcessed.add(particle.index);
      this.#particlesProcessed.add(targetParticle.index);
    }
  }

  // #simulateEqualisation(particle: Particle, liquidGroup: Index[]) {
  //   // Do not simulate equalization if liquid group is less than a threshold
  //   if (liquidGroup.length < 45) return;

  //   //
  //   let groundedParticles = 0;
  //   for (const index of liquidGroup) {
  //     const downIndex = (cy + 1) * this.#gameWidth + cx;
  //     if (cy < gridHeight - 1 && grid[downIndex].id !== PARTICLE.EMPTY) {
  //       groundedParticles++;
  //     }
  //   }
  // }

  // Returns grouped particles of similar category in single scan using Katorithm algorithm
  groupParticles(grid: Grid, category: number): Vector2[][] {
    const gridWidth: number = grid.width;
    const gridHeight: number = grid.height;
    const groups: Vector2[][] = [];
    const groupMap: Record<Index, Index> = {};

    // Iterate through each cells in the grid from top to bottom and from left to right
    for (let y = gridHeight - 1; y >= 0; y--) {
      for (let x = 0; x < gridWidth; x++) {
        const index = y * gridWidth + x;
        const currentPos: Vector2 = { x, y };

        // Particle is invalid or is not the type we're looking for, skip it
        const particle: Particle | null = grid.getParticleAt(x, y);
        if (!particle || particle.category !== category) {
          continue;
        }

        // Get the current particle's up and left neighbors
        const upParticle: Particle | null = grid.getNeighborOf(particle, NEIGHBOR.UP);
        const leftParticle: Particle | null = grid.getNeighborOf(particle, NEIGHBOR.LEFT);
        const hasUpNeighbor = upParticle && upParticle.category === category;
        const hasLeftNeighbor = leftParticle && leftParticle.category === category;

        let leftIndex: Index = -1;
        if (hasLeftNeighbor) {
          leftIndex = y * gridWidth + (x - 1);
        }
        let upIndex: Index = -1;
        if (hasUpNeighbor) {
          upIndex = (y + 1) * gridWidth + x;
        }

        // If there are no connecting neighbors..
        if (!hasLeftNeighbor && !hasUpNeighbor) {
          // ..create a new group for this particle
          const newGroupIndex: number = groups.length;
          groups.push([currentPos]);
          groupMap[index] = newGroupIndex;
        }

        // If only the left neighbor exists..
        else if (hasLeftNeighbor && !hasUpNeighbor) {
          // ..add the current particle to the left neighbor's group
          const leftGroupIndex = groupMap[leftIndex]!;
          groups[leftGroupIndex]!.push(currentPos);
          groupMap[index] = leftGroupIndex;
        }

        // If only the up neighbor exists..
        else if (!hasLeftNeighbor && hasUpNeighbor) {
          // ..add the current particle to the up neighbor's group
          const upGroupIndex = groupMap[upIndex]!;
          groups[upGroupIndex]!.push(currentPos);
          groupMap[index] = upGroupIndex;
        }

        // If both up and left neighbors exists..
        else {
          // ..first add the current particle to the up neighbor's group..
          const upGroupIndex = groupMap[upIndex]!;
          groups[upGroupIndex]!.push(currentPos);
          groupMap[index] = upGroupIndex;

          // ..then merge the two groups if they are different
          const leftGroupIndex = groupMap[leftIndex]!;
          if (leftGroupIndex !== upGroupIndex) {
            // Add all items from the left group to the up group
            const leftGroup = groups[leftGroupIndex]!;
            for (const particlePos of leftGroup) {
              groups[upGroupIndex]!.push(particlePos);

              const particleIndex = particlePos.y * gridWidth + particlePos.x;

              // Put all moved particle's index to the new group
              groupMap[particleIndex] = upGroupIndex;
            }

            // Clear the old left group
            groups[leftGroupIndex] = [];
          }
        }
      }
    }
    const newGroups = groups.filter((group) => group.length > 0);
    return newGroups;
  }
}
