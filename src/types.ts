import type { Categories, Phases } from "./structs/utils";

// --------- CORE TYPES ---------
export type Phase = (typeof Phases)[keyof typeof Phases];
export type Category = (typeof Categories)[keyof typeof Categories];

export interface Element {
  // Base properties
  id: number;
  name: string;
  phase: Phase;
  category: Category;
  isMovable: boolean;
  density: number;

  // GPU properties
  baseColor: Color;
  blendColor: Color;
  highlightColor: Color;

  // Physics based properties
  cohesion: number;
  reposeAngle: number;
}

export interface Particle {
  position: Vector2;
  index: Index;
  color: Color;
  category: Category;
  primary: Element;
  secondary: Element | null;

  phase: Phase;
  mass: number;
  temperature: number;
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
