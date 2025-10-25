import type { GameSettings } from "./types";

export const Settings = Object.freeze({
  GAME_WIDTH: 244,
  GAME_HEIGHT: 192,
  SELECTED_PARTICLE: 10, // The default selected particle
  SELECTED_CATEGORY: 1,

  BRUSH_MAX_SIZE: 42,
  BRUSH_CUR_SIZE: 4,
  BRUSH_SENSITIVITY: 0.02,

  CURRENT_PRESSURE: 0,
  CURRENT_CONCENTRATION: 1,

  DEBUG_START_ENABLED: true,
  DEBUG_OVERLAY_START_ENABLED: false,

  RENDER_UPDATE_INTERVAL: 16.667,
  PHYSICS_UPDATE_INTERVAL: 25,
}) as GameSettings;
