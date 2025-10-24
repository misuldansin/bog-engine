import type {
  Color,
  Offset,
  Particle,
  ParticleMap,
  ParticleData,
  BaseParticle,
  TechincalParticle,
  SolidParticle,
  LiquidParticle,
  GasParticle,
  SandParticle,
  ElectronicParticle,
  SandParticleData,
  BaseParticleData,
} from "../types";

import { color } from "../structs/color_utils";
import { Utilities } from "../structs/utils";

export const NEIGHBORHOOD = Object.freeze({
  ALL_NEIGHBORS: [
    { dx: -1, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: -1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: -1 },
  ] as Offset[],
} as const);

export class Grid {
  width: number;
  height: number;
  #data: Particle[];
  #dirtyParticles: Set<Particle>;
  ParticleDataBlueprint: ParticleMap;

  constructor(gridWidth: number, gridHeight: number, particleDataBlueprint: ParticleMap) {
    this.width = gridWidth;
    this.height = gridHeight;
    this.#data = new Array<Particle>(gridWidth * gridHeight);
    this.#dirtyParticles = new Set();
    this.ParticleDataBlueprint = particleDataBlueprint;

    // Fill this grid's data array with EMPTY particles
    const EMPTY_PARTICLE_ID = 0;
    this.#populateGrid(EMPTY_PARTICLE_ID);
  }

  public get data() {
    return this.#data;
  }

  public get dirtyParticles() {
    return this.#dirtyParticles;
  }

  // --------- Helper Functions ---------

  // ..
  #createParticle(particleId: number): Particle | null {
    // Retrieve particle data from blueprint
    const particleData: ParticleData | undefined = this.ParticleDataBlueprint[particleId];

    // No particle data exists for this id, return null
    if (!particleData) {
      return null;
    }

    // Get a random number between 0 and 1 for lerp alpha
    let rand: number = Math.random();
    // let alpha: number = Math.pow(rand, 2);
    let alpha: number = rand;

    // Quantize alpha to the nearest discrete 6 steps
    let resolution: number = 6;
    let steps: number = resolution - 1;
    let t: number = Math.round(alpha * steps) / steps;

    const baseColor: Color = color.hexToColor(particleData.baseColor);
    const variantColor: Color = color.hexToColor(particleData.variantColor);
    const newColor: Color = color.lerpColor(baseColor, variantColor, t);

    let baseParticle: BaseParticle = {
      handle: -1,
      id: particleData.id,
      name: particleData.name,
      color: newColor,
      position: { x: -1, y: -1 },
      index: 0,
      isMovable: particleData.isMovable,
      density: particleData.density,
    };

    // Check which category this particle belongs to
    if (particleData.category === 0) {
      return {
        ...baseParticle,
        category: 0,
      } as TechincalParticle;
    } else if (particleData.category === 1) {
      return {
        ...baseParticle,
        category: 1,
      } as SolidParticle;
    } else if (particleData.category === 2) {
      return {
        ...baseParticle,
        category: 2,
        concentration: 0,
        maxConcentration: particleData.maxConcentration,
      } as LiquidParticle;
    } else if (particleData.category === 3) {
      return {
        ...baseParticle,
        category: 3,
      } as GasParticle;
    } else if (particleData.category === 4) {
      return {
        ...baseParticle,
        category: 4,
        reposeAngle: particleData.reposeAngle,
        reposeDirections: particleData.reposeDirections,
      } as SandParticle;
    } else if (particleData.category === 5) {
      return {
        ...baseParticle,
        category: 5,
        node: -1,
      } as ElectronicParticle;
    }

    // Unkown category, return
    return null;
  }

  // ..
  #populateGrid(particleId: number) {
    const gridWidth = this.width;
    const gridHeight = this.height;

    this.#data = new Array<Particle>(gridWidth * gridHeight);

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        // Calculate index
        let index: number = y * gridWidth + x;

        // Create new particle
        let newParticle: Particle | null = this.#createParticle(particleId);

        if (!newParticle) {
          continue;
        }

        // Update newly created particle's states
        newParticle.position.x = x;
        newParticle.position.y = y;
        newParticle.index = index;

        // Add it to the data array
        this.#data[index] = newParticle;

        // Mark it dirty
        this.#dirtyParticles.add(newParticle);
      }
    }
  }

  // --------- Grid Methods ---------

  // ..
  // ! Todo: Store particle ID sumwhere in the future so it's not just a 'number'
  createParticleAt(x: number, y: number, particleId: number, markDirty: boolean, markNeighborDirty: boolean): boolean {
    // Particle to create will be out of bounds, don't create a particle
    if (!this.isInBounds(x, y)) {
      return false;
    }

    // Create a new particle
    let particle: Particle = this.#createParticle(particleId)!;

    // Update newly created particle's states
    particle.position.x = x;
    particle.position.y = y;
    particle.index = y * this.width + x;

    // Handle dirty
    if (markDirty) {
      this.markDirty(particle, markNeighborDirty);
    }

    // Add the newly created particle to the grid
    this.#data![y * this.width + x] = particle;

    // Particle was successfully created, return true
    return true;
  }

  // ..
  getParticleAt(x: number, y: number): Particle | null {
    if (!this.isInBounds(x, y)) return null;
    return this.#data![y * this.width + x]!;
  }

  // ..
  tryMoveParticle(
    particle: Particle,
    directionGroups: Offset[][],
    bumpThemNerds: boolean = false,
    markAsDirty: boolean = false,
    markNeighborsAsDirty: boolean = false
  ): Particle | null {
    for (const directions of directionGroups) {
      if (!directions) continue;
      // Shuffle the directions for random movements
      const shuffledDirections: Offset[] = Utilities.shuffleArray(directions);

      // Iterate through directions and check if particle can move there
      for (const direction of shuffledDirections) {
        // Add random 'bumps' in the x axis
        let finalDX: number = direction.dx;
        if (bumpThemNerds) {
          if (Math.random() > 0.5) {
            finalDX = direction.dx * -1;
          }
        }

        // Get target particle
        const targetX: number = particle.position.x + finalDX;
        const targetY: number = particle.position.y + direction.dy;
        const target = this.getParticleAt(targetX, targetY);
        if (!target) continue;

        // If target particle is movable and has lower density than the current particle..
        // ..Swap them
        if (target.isMovable && particle.density > target.density) {
          // Swap particles in the data array
          this.#data![target.index] = particle;
          this.#data![particle.index] = target; // particle's index hasn't changed yet, so we can safly use it here

          // Update their postion and indices
          const tempPosition = { x: particle.position.x, y: particle.position.y };
          const tempIndex = particle.index;

          particle.position = target.position;
          particle.index = target.index;

          target.position = tempPosition;
          target.index = tempIndex;

          // Mark them as dirty
          if (markAsDirty) {
            this.markDirty(particle, markNeighborsAsDirty);
            this.markDirty(target, markNeighborsAsDirty);
          }

          // Particle was moved successfully, return target reference
          return target;
        }
      }
    }

    // Particle could not be moved successfully
    return null;
  }

  // DONOT CALL!!! (WIP)
  swapParticles(particleAIndex: number, particleBIndex: number, markAsDirty: boolean = false, markNeighborsAsDirty: boolean = false): null {
    return null;
  }

  // ..
  getNeighborOf(particle: Particle, offset: Offset): Particle | null {
    const neighborX: number = particle.position.x + offset.dx;
    const neighborY: number = particle.position.y + offset.dy;
    return this.getParticleAt(neighborX, neighborY);
  }

  // ..
  getNeighborsOf(particle: Particle, offsets: Offset[], withCategory?: number, withId?: number): Particle[] {
    // Get all valid neighbors
    const allNeighbors = offsets
      .map((offset) => this.getNeighborOf(particle, offset))
      .filter((neighbor): neighbor is Particle => neighbor !== null);

    // Apply filtering and return
    return allNeighbors.filter((neighbor) => {
      const categoryMatches = withCategory === undefined || neighbor.category === withCategory;
      const idMatches = withId === undefined || neighbor.id === withId;
      return categoryMatches && idMatches;
    });
  }

  // ..
  markDirty(particle: Particle, markNeighborDirty: boolean) {
    // Mark this particle dirty
    this.#dirtyParticles.add(particle);

    // Handle marking neighbors dirty
    if (markNeighborDirty) {
      const neighbors: Particle[] = this.getNeighborsOf(particle, NEIGHBORHOOD.ALL_NEIGHBORS);
      for (const neighbor of neighbors) {
        this.#dirtyParticles.add(neighbor);
      }
    }
  }

  // ..
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // ..
  fillCircleAt(x: number, y: number, radius: number, particleId: number) {
    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        // Don't draw outside the given radius
        if (i * i + j * j > radius * radius) {
          continue;
        }

        // Particle location to draw
        const px: number = x + i;
        const py: number = y + j;

        // Particle to draw is out of grid's bounds, skip
        if (!this.isInBounds(px, py)) {
          continue;
        }

        // Get previous particle to compare it
        const prevParticle: Particle | null = this.getParticleAt(px, py);
        if (particleId === 0 || prevParticle === null || prevParticle.id === 0) {
          this.createParticleAt(px, py, particleId, true, true);
        }
      }
    }
  }

  // ..
}
