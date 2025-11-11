import type { Categories, Phases } from "./structs/utils";

// --------- CORE TYPES ---------
export type Phase = (typeof Phases)[keyof typeof Phases];
export type Category = (typeof Categories)[keyof typeof Categories];

export interface ParticleData {
  id: number;
  name: string;
  phase: Phase;
  category: Category;
  isMovable: boolean;
  density: number;

  baseColor: Color;
  blendColor: Color;
  highlightColor: Color;

  cohesion: number;
  reposeAngle: number;
}

export interface Particle {
  data: ParticleData;
  position: Vector2;
  velocity: Vector2;
}

// export type equalisationGroup = { liquidParticle: Particle[]; emptyParticle: Particle[] };

// --------- UTILITIES TYPES ---------
export type Vector2 = { x: number; y: number };
export type Offset2 = { dx: number; dy: number };
export type Size = { width: number; height: number };
export type Index = number;
export type Color = [number, number, number, number] & Uint8ClampedArray;
export type Pixel = { index: number; value: Color };

export type ContentBarOrientation = "top" | "right" | "bottom" | "left";
export type FontWeight = "normal" | "bold" | "bolder" | "lighter";
export type ActiveButton = "left" | "right" | "none";
