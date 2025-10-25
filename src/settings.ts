import type { GameSettings } from "./types";

export const Settings = Object.freeze({
  GAME_WIDTH: 200,
  GAME_HEIGHT: 150,
  SELECTED_PARTICLE: 10, // The default selected particle
  SELECTED_CATEGORY: 1,

  BRUSH_MAX_SIZE: 24,
  BRUSH_CUR_SIZE: 4,
  BRUSH_SENSITIVITY: 0.02,

  CURRENT_PRESSURE: 0,
  CURRENT_CONCENTRATION: 1,

  DEBUG_START_ENABLED: true,
  DEBUG_OVERLAY_START_ENABLED: false,

  RENDER_UPDATE_INTERVAL: 15,
  PHYSICS_UPDATE_INTERVAL: 15,
}) as GameSettings;
