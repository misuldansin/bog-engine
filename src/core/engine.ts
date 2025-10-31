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
  GameSettings,
} from "../types";

import { Grid, NEIGHBOR, NEIGHBORHOOD } from "../structs/grid";
import type { Renderer } from "../io/renderer";
import type { InputManager } from "../io/inputManager";
import type { Debug } from "../io/debug";
import { Utilities } from "../structs/utils";
import type { BoggedState } from "./bogged_state";

// ! temp: ..
const neighborKeys = Object.keys(NEIGHBOR) as Array<keyof typeof NEIGHBOR>;

export class Engine {
  private readonly boggedState: BoggedState;

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
  #renderInterval: number;
  #physicsInterval: number;

  // Time tracking variables
  #lastFrameTime: number | null;
  #accumulator: number;
  tickCount: number;

  // ! temp: ..
  #clearDirtyDelta = 0;
  #clearDirtyFreq = 60;

  constructor(
    boggedStateInstance: BoggedState,
    renderInstance: Renderer,
    inputManagerInstance: InputManager,
    debugInstance: Debug,
    particleData: ParticleMap
  ) {
    this.boggedState = boggedStateInstance;

    this.#renderer = renderInstance;
    this.#inputManager = inputManagerInstance;
    this.#debug = debugInstance;

    this.#gameWidth = this.boggedState.gameWidth;
    this.#gameHeight = this.boggedState.gameHeight;
    this.#currentGrid = new Grid(this.#gameWidth, this.#gameHeight, particleData);
    this.#particlesProcessed = new Set();

    this.#isRunning = false;
    this.#animationFrameId = null;
    this.#renderInterval = this.boggedState.renderInterval;
    this.#physicsInterval = this.boggedState.physicsInterval;

    this.#lastFrameTime = null;
    this.#accumulator = 0;
    this.tickCount = 0;
  }

  // ..
  start() {
    if (!this.#isRunning) {
      this.#isRunning = true;
      this.gameLoop(0);
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
  private gameLoop = (timestamp: number) => {
    if (!this.#isRunning) return;

    // Skip the first frame
    if (!this.#lastFrameTime) {
      this.#lastFrameTime = timestamp;
      this.#animationFrameId = requestAnimationFrame(this.gameLoop);
      return;
    }

    const delta = timestamp - this.#lastFrameTime;
    this.#lastFrameTime = timestamp;

    // ------ Handle Input ------
    this.handleInput();

    // ------ Update Physics ------
    this.#accumulator += delta;
    let stepsTaken = 0;
    while (this.#accumulator >= this.#physicsInterval) {
      const particlesToUpdate: Particle[] = [];
      for (const index of this.#currentGrid.dirtyParticles) {
        particlesToUpdate.push(this.#currentGrid.data[index]!);
      }

      this.#clearDirtyDelta++;

      if (this.#clearDirtyDelta > this.#clearDirtyFreq) {
        this.#currentGrid.dirtyParticles.clear();
        this.#clearDirtyDelta = 0;
      }

      const overlayColor: Color = new Uint8ClampedArray([210, 55, 55, 180]) as Color;
      this.#renderer.queueParticles(particlesToUpdate, this.#debug.isOverlayEnabled ? overlayColor : undefined);

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

    this.#animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private handleInput() {
    // Paint Particles
    if (this.boggedState.isLeftMouseButtonDown) {
      this.#currentGrid.fillCircleAt(
        Math.floor(this.boggedState.mouseX),
        Math.floor(this.boggedState.mouseY),
        this.boggedState.currentBrushSize,
        this.boggedState.selectedParticleId
      );
    }

    // Erase Particles
    if (this.boggedState.isRightMouseButtonDown) {
      this.#currentGrid.fillCircleAt(
        Math.floor(this.boggedState.mouseX),
        Math.floor(this.boggedState.mouseY),
        this.boggedState.currentBrushSize,
        0
      );
    }
  }

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

      let swapped = 0;
      const limitedSwap = swapsToDo / 4;
      for (let i = 0; i < swapsToDo; i++) {
        const liquidPar = liquidParticles[i]!;
        const emptyPar = emptyParticle[i]!;

        const mag = Math.sqrt(liquidPar.position.x * emptyPar.position.x + liquidPar.position.y * emptyPar.position.y);

        // if (mag > 200) {
        //   continue;
        // }

        // Only swap liquid particle to a lower empty particle
        if (liquidPar.position.y > emptyPar.position.y) {
          this.#currentGrid.swapParticles(liquidPar, emptyPar, true, true);
          this.#particlesProcessed.add(liquidPar.index);
          this.#particlesProcessed.add(emptyPar.index);

          swapped++;
          if (swapped >= limitedSwap) {
            break;
          }
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

        if (particle.category !== category) {
          continue;
        }

        // Get the current particle's up and left neighbors
        const upParticle: Particle | null = grid.getNeighborOf(particle, NEIGHBOR.UP);
        const leftParticle: Particle | null = grid.getNeighborOf(particle, NEIGHBOR.LEFT);
        const hasUpNeighbor = upParticle && upParticle.id === particle.id;
        const hasLeftNeighbor = leftParticle && leftParticle.id === particle.id;

        // ! Todo: ..
        const upLeftPar = null; //grid.getNeighborOf(particle, NEIGHBOR.DOWN)
        const upRightPar = null;
        const isUpLeftNeighEmpty = false; // upLeftPar && upLeftPar.id === 0
        const hasUpRightNeighEmpty = false; //  upRightPar && upRightPar.id === 0

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
          // if (isUpLeftNeighEmpty) {
          //   equalisationGroups[newGroupIndex]!.emptyParticle.push(upLeftPar);
          // }
          // if (hasUpRightNeighEmpty) {
          //   equalisationGroups[newGroupIndex]!.emptyParticle.push(upRightPar);
          // }

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
          // if (isUpLeftNeighEmpty) {
          //   equalisationGroups[leftGroupIndex]!.emptyParticle.push(upLeftPar);
          // }
          // if (hasUpRightNeighEmpty) {
          //   equalisationGroups[leftGroupIndex]!.emptyParticle.push(upRightPar);
          // }

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
          // if (isUpLeftNeighEmpty) {
          //   equalisationGroups[upGroupIndex]!.emptyParticle.push(upLeftPar);
          // }
          // if (hasUpRightNeighEmpty) {
          //   equalisationGroups[upGroupIndex]!.emptyParticle.push(upRightPar);
          // }

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
          // if (isUpLeftNeighEmpty) {
          //   equalisationGroups[upGroupIndex]!.emptyParticle.push(upLeftPar);
          // }
          // if (hasUpRightNeighEmpty) {
          //   equalisationGroups[upGroupIndex]!.emptyParticle.push(upRightPar);
          // }

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
