// --------- CORE TYPES ---------
export type GameSettings = {
  GAME_WIDTH: number;
  GAME_HEIGHT: number;
  SELECTED_PARTICLE: number;
  SELECTED_CATEGORY: number;
  BRUSH_MAX_SIZE: number;
  BRUSH_CUR_SIZE: number;
  BRUSH_SENSITIVITY: number;
  CURRENT_PRESSURE: number;
  CURRENT_CONCENTRATION: number;
  DEBUG_START_ENABLED: boolean;
  DEBUG_OVERLAY_START_ENABLED: boolean;
  RENDER_UPDATE_INTERVAL: number;
  PHYSICS_UPDATE_INTERVAL: number;
};

// export type Group = {};

// export type liquidGroup = { data: Group[]; map: Record<Index, Index> };

export type equalisationGroup = { liquidParticle: Particle[]; emptyParticle: Particle[] };

// --------- UTILITIES TYPES ---------
export type Vector2 = { x: number; y: number };
export type Offset = { dx: number; dy: number };
export type Size = { width: number; height: number };

export type Index = number;

export type Color = [number, number, number, number] & Uint8ClampedArray;
export type Pixel = { index: number; value: Color };

export type ContentBarOrientation = "left" | "right" | "top" | "bottom";
export type FontWeight = "normal" | "bold" | "bolder" | "lighter";

// --------- PARTICLE TYPES ---------
export interface BaseParticle {
  handle: number;
  id: number;

  name: string;
  color: Color;
  position: { x: number; y: number };
  index: number;

  isMovable: boolean;
  density: number;
}
export interface TechincalParticle extends BaseParticle {
  category: 0;
}
export interface SolidParticle extends BaseParticle {
  category: 1;
}
export interface LiquidParticle extends BaseParticle {
  category: 2;
  concentration: number;
  maxConcentration: number;
}
export interface GasParticle extends BaseParticle {
  category: 3;
}
export interface SandParticle extends BaseParticle {
  category: 4;
  reposeAngle: number;
  reposeDirections: Offset[][];
}
export interface ElectronicParticle extends BaseParticle {
  category: 5;
  node: unknown;
}
export type Particle = TechincalParticle | SolidParticle | LiquidParticle | GasParticle | SandParticle | ElectronicParticle;

// --------- PARTICLE DATA TYPES ---------

export interface BaseParticleData {
  id: number;

  name: string;
  baseColor: string;
  variantColor: string;
  isMovable: boolean;
  density: number;
}
export interface TechincalParticleData extends BaseParticleData {
  category: 0;
}
export interface SolidParticleData extends BaseParticleData {
  category: 1;
}
export interface LiquidParticleData extends BaseParticleData {
  category: 2;
  maxConcentration: number;
}
export interface GasParticleData extends BaseParticleData {
  category: 3;
}
export interface SandParticleData extends BaseParticleData {
  category: 4;
  reposeAngle: number;
  reposeDirections: Offset[][];
}
export interface ElectronicParticleData extends BaseParticleData {
  category: 5;
}
export type ParticleData =
  | TechincalParticleData
  | SolidParticleData
  | LiquidParticleData
  | GasParticleData
  | SandParticleData
  | ElectronicParticleData;
export type ParticleMap = Record<number, ParticleData>;

export type Success<T> = { success: true; value: T };
export type Failure = { success: false; error: string };

export type Result<T> = Success<T> | Failure;
