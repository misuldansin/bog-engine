import type {
  ParticleMap,
  Particle,
  Index,
  Vector2,
  Offset,
  Color,
  SandParticle,
  LiquidParticle,
  equalisationGroup,
  GasParticle,
} from "../types";

import { Grid, NEIGHBOR, NEIGHBORHOOD } from "../structs/grid";
import { Settings } from "../settings";
import type { Renderer } from "../io/renderer";
import type { InputManager } from "../io/inputManager";
import type { Debug } from "../io/debug";
import { Utilities } from "../structs/utils";

// ! temp: ..
const neighborKeys = Object.keys(NEIGHBOR) as Array<keyof typeof NEIGHBOR>;

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
    let stepsTaken = 0;
    while (this.#accumulator >= this.#physicsInterval) {
      const particlesToUpdate: Particle[] = [];
      for (const index of this.#currentGrid.dirtyParticles) {
        particlesToUpdate.push(this.#currentGrid.data[index]!);
      }
      this.#currentGrid.dirtyParticles.clear();

      const overlayColor: Color = new Uint8ClampedArray([238, 66, 81, 140]) as Color;
      this.#renderer.queueParticles(particlesToUpdate);

      // Update physics this frame
      this.#stepPhysics(particlesToUpdate);

      this.tickCount++;
      this.#accumulator -= this.#physicsInterval;

      stepsTaken++;

      if (stepsTaken > 60) {
        this.#accumulator = 0;
      }
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
          this.#handleGases(particle);
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

    // ! temp: ..
    let liquidGroup = this.groupParticles(this.#currentGrid, 2);
    this.#simulateEqualisation(liquidGroup);
  }

  // ..
  #handleLiquids(particle: LiquidParticle) {
    let directions: Offset[][] = [
      [{ dx: 0, dy: -1 }],
      [
        { dx: -1, dy: -1 },
        { dx: 1, dy: -1 },
      ],
      [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ],
    ];

    const targetParticle = this.#currentGrid.tryMoveParticle(particle, directions, false, true, true);
    if (targetParticle) {
      this.#particlesProcessed.add(particle.index);
      this.#particlesProcessed.add(targetParticle.index);
    }
  }

  // ..
  #handleGases(particle: GasParticle) {
    const randomKey = neighborKeys[Math.floor(Math.random() * neighborKeys.length)]!;
    const randomDir: Offset = NEIGHBOR[randomKey];

    let directions = [[randomDir]];

    const targetParticle = this.#currentGrid.tryMoveParticle(particle, directions, false, true, true);
    if (targetParticle) {
      this.#particlesProcessed.add(particle.index);
      this.#particlesProcessed.add(targetParticle.index);
    }
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

  // --------- Physics Helper Functions ---------

  // ..
  #simulateEqualisation(liquidGroup: equalisationGroup[]) {
    for (const group of liquidGroup) {
      // Sort the target spaces to get the lowest ones first (descending y)
      const liquidParticles = group.liquidParticle.sort((a, b) => b.position.y - a.position.y);

      // Sort the liquid particles to get the highest ones first (ascending y)
      const emptyParticle = group.emptyParticle.sort((a, b) => a.position.y - b.position.y);

      const swapsToDo = liquidParticles.length;
      for (let i = 0; i < swapsToDo; i++) {
        const liquidPar = liquidParticles[i]!;
        const emptyPar = emptyParticle[i]!;

        // Only swap liquid particle to a lower empty particle
        if (liquidPar.position.y > emptyPar.position.y) {
          this.#currentGrid.swapParticles(liquidPar, emptyPar, true, true);
          this.#particlesProcessed.add(liquidPar.index);
          this.#particlesProcessed.add(emptyPar.index);
        }
      }
    }
  }

  // Returns grouped particles of similar category in single scan using Katorithm algorithm
  groupParticles(grid: Grid, category: number): equalisationGroup[] {
    const gridWidth: number = grid.width;
    const gridHeight: number = grid.height;
    const groups: Index[][] = [];
    const equalisationGroups: equalisationGroup[] = [];
    const groupMap: Record<Index, Index> = {};

    // Iterate through each cells in the grid from top to bottom and from left to right
    for (let y = gridHeight - 1; y >= 0; y--) {
      for (let x = 0; x < gridWidth; x++) {
        const index = y * gridWidth + x;

        // Particle is invalid or is not the type we're looking for, skip it
        const particle: Particle | null = grid.getParticleAt(x, y);
        if (!particle || particle.category !== category) {
          continue;
        }

        // Get the current particle's up and left neighbors
        const upParticle: Particle | null = grid.getNeighborOf(particle, NEIGHBOR.UP);
        const leftParticle: Particle | null = grid.getNeighborOf(particle, NEIGHBOR.LEFT);
        const hasUpNeighbor = upParticle && upParticle.category === category && upParticle.id === particle.id;
        const hasLeftNeighbor = leftParticle && leftParticle.category === category && leftParticle.id === particle.id;

        let leftIndex: Index = -1;
        if (hasLeftNeighbor) {
          leftIndex = y * gridWidth + (x - 1);
        }
        let upIndex: Index = -1;
        if (hasUpNeighbor) {
          upIndex = (y + 1) * gridWidth + x;
        }

        const isUpParticleEmpty = upParticle && upParticle.id === 0;

        // If there are no connecting neighbors..
        if (!hasLeftNeighbor && !hasUpNeighbor) {
          // ..create a new group for this particle
          const newGroupIndex: number = equalisationGroups.length;
          groups.push([index]);
          equalisationGroups.push({ liquidParticle: [], emptyParticle: [] });

          if (isUpParticleEmpty) {
            equalisationGroups[newGroupIndex]!.liquidParticle.push(particle);
            equalisationGroups[newGroupIndex]!.emptyParticle.push(upParticle);
          }

          groupMap[index] = newGroupIndex;
        }

        // If only the left neighbor exists..
        else if (hasLeftNeighbor && !hasUpNeighbor) {
          // ..add the current particle to the left neighbor's group
          const leftGroupIndex = groupMap[leftIndex]!;

          groups[leftGroupIndex]!.push(index);

          if (isUpParticleEmpty) {
            equalisationGroups[leftGroupIndex]!.liquidParticle.push(particle);
            equalisationGroups[leftGroupIndex]!.emptyParticle.push(upParticle);
          }

          groupMap[index] = leftGroupIndex;
        }

        // If only the up neighbor exists..
        else if (!hasLeftNeighbor && hasUpNeighbor) {
          // ..add the current particle to the up neighbor's group
          const upGroupIndex = groupMap[upIndex]!;

          groups[upGroupIndex]!.push(index);

          if (isUpParticleEmpty) {
            equalisationGroups[upGroupIndex]!.liquidParticle.push(particle);
            equalisationGroups[upGroupIndex]!.emptyParticle.push(upParticle);
          }

          groupMap[index] = upGroupIndex;
        }

        // If both up and left neighbors exists..
        else {
          // ..first add the current particle to the up neighbor's group..
          const upGroupIndex = groupMap[upIndex]!;

          groups[upGroupIndex]!.push(index);

          if (isUpParticleEmpty) {
            equalisationGroups[upGroupIndex]!.liquidParticle.push(particle);
            equalisationGroups[upGroupIndex]!.emptyParticle.push(upParticle);
          }

          groupMap[index] = upGroupIndex;

          // ..then merge the two groups if they are different
          const leftGroupIndex = groupMap[leftIndex]!;
          if (leftGroupIndex !== upGroupIndex) {
            // Add all items from the left group to the up group
            const leftEqualisationGroup = equalisationGroups[leftGroupIndex]!;
            for (const liquidParticle of leftEqualisationGroup.liquidParticle) {
              equalisationGroups[upGroupIndex]!.liquidParticle.push(liquidParticle);
            }
            for (const emptyParticle of leftEqualisationGroup.emptyParticle) {
              equalisationGroups[upGroupIndex]!.emptyParticle.push(emptyParticle);
            }
            const leftGroup = groups[leftGroupIndex]!;
            for (const index of leftGroup) {
              // Put all moved particle's index to the new group
              groupMap[index] = upGroupIndex;
            }

            // Clear the old left group
            groups[leftGroupIndex] = [];
            equalisationGroups[leftGroupIndex] = { liquidParticle: [], emptyParticle: [] };
          }
        }
      }
    }
    const outGroup = equalisationGroups.filter((group) => group.liquidParticle.length > 30);
    return outGroup;
  }
}
