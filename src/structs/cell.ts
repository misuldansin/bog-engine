import type { Vector2 } from "../types";

export class Cell {
  id: number;
  position: Vector2;
  phase: number;
  totalMass: number;
  temperature: number;
  structureType: string;
  composition: string;

  constructor(uniqueId: number, position: Vector2) {
    this.id = uniqueId;
    this.position = position;
    this.phase = 1;
    this.totalMass = -1;
    this.temperature = 0;
    this.structureType = "";
    this.composition = "";
  }
}
