import type { Category, Element, Phase } from "./types";
import { Categories, Phases, Utilities } from "./structs/utils";
import { GameSettings } from "./settings";
import { color } from "./structs/color_utils";

// Loads elements data from a text file and returns them as particle data map
export async function loadElements(filePath: string): Promise<Record<number, Element>> {
  // Retrieve text file from the given file path
  const fileText: string = await getFileText(filePath);

  const rawData: Record<number, Element> = {};
  const processedIds = new Set<number>();
  let currentId: number | null = null;

  // Process file line by line and retrieve raw data
  for (const line of fileText.split("\n")) {
    // Trim line of any whitespaces and/ or tabs
    const trimmed = line.trim();

    // Ignore empty lines and lines starting with '#'
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    // We have encountered a new Particle Block '[ ID ]'
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const id = parseInt(trimmed.slice(1, -1), 10);

      // The id is invalid or is reserved (ID < 10), ignoring
      if (isNaN(id) || id < 10) {
        currentId = null;
        continue; // This line is processed
      }
      // The id has already been assigned to a previous particle, ignoring
      else if (processedIds.has(id)) {
        console.warn(`[Loader]: Duplicate ID found: ${id}. Ignoring.`);
        currentId = null;
        continue; // This line is processed
      }

      // Store the new unique ID and start retreiving data
      processedIds.add(id);
      currentId = id;
      rawData[id] = {
        id: id,
        name: undefined!,
        phase: undefined!,
        category: undefined!,
        isMovable: undefined!,
        density: undefined!,
        baseColor: undefined!,
        blendColor: undefined!,
        highlightColor: undefined!,
        cohesion: undefined!,
        reposeAngle: undefined!,
      };
      continue; // This line is processed
    }

    // We have a particle block, try and continue retrieving any valid keys
    if (currentId !== null) {
      // Retieve trimmed key and value pairs
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) continue;

      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      if (!key || value === undefined || value.length === 0) continue;

      const currentData = rawData[currentId]!;
      switch (key) {
        case "name":
          currentData.name = value;
          break;
        case "phase":
          if (value === "solid") currentData.phase = 1;
          else if (value === "liquid") currentData.phase = 2;
          else if (value === "gas") currentData.phase = 3;
          else if (value === "plasma") currentData.phase = 4;
          break;
        case "category":
          if (value === "solids") currentData.category = 1;
          else if (value === "liquids") currentData.category = 2;
          else if (value === "gases") currentData.category = 3;
          else if (value === "sands") currentData.category = 4;
          else if (value === "electronics") currentData.category = 5;
          break;
        case "base_color":
          currentData.baseColor = color.hexToColor(value);
          break;
        case "blend_color":
          currentData.blendColor = color.hexToColor(value);
          break;
        case "highlight_color":
          currentData.highlightColor = color.hexToColor(value);
          break;
        case "is_movable":
          if (value.toLowerCase() === "true") currentData.isMovable = true;
          else if (value.toLowerCase() === "false") currentData.isMovable = false;
          break;
        case "density":
          currentData.density = parseFloat(value);
          break;
        case "cohesion":
          currentData.cohesion = parseInt(value);
          break;
        case "repose_angle":
          currentData.reposeAngle = parseInt(value);
          break;
        default:
          break;
      }
    }
  }

  // Checksum
  const outData: Record<number, Element> = {};

  // Add all raw data to out data, raw data with missing properties are gracefully, swiftly, respectfully (not really) ignored
  for (const id in rawData) {
    const data = rawData[id];
    const idNumber = parseInt(id, 10);
    if (!data) continue;

    // Ignore data with missing keys
    if (
      data.id === undefined ||
      data.name === undefined ||
      data.phase === undefined ||
      data.category === undefined ||
      data.isMovable === undefined ||
      data.density === undefined ||
      data.baseColor === undefined ||
      data.blendColor === undefined ||
      data.highlightColor === undefined ||
      data.cohesion === undefined ||
      data.reposeAngle === undefined
    ) {
      console.warn(`[Loader]: Particle block of ID: ${idNumber} was found with missing or corrupted properties. Ignoring.`);
      continue; // Yeet!
    }

    outData[data.id] = {
      id: data.id,
      name: data.name,
      phase: data.phase,
      category: data.category,
      isMovable: data.isMovable,
      density: data.density,
      baseColor: data.baseColor,
      blendColor: data.blendColor,
      highlightColor: data.highlightColor,
      cohesion: data.cohesion,
      reposeAngle: data.reposeAngle,
    };
  }

  // Hardcoded Technical Particles (ID 0-9)

  // EMPTY particle ( ID: 0 )
  outData[0] = {
    id: 0,
    name: "Empty",
    phase: Phases.VIRTUAL,
    category: Categories.TECHNICAL,
    isMovable: true,
    density: 0.0,
    baseColor: color.hexToColor("#0E0E11"),
    blendColor: color.hexToColor("#0E0E11"),
    highlightColor: color.hexToColor("#0E0E11"),
    cohesion: 0,
    reposeAngle: 45,
  };

  return outData;
}

// Loads game settings from a text file, missing settings are safely populated with the default GameSettings object
export async function loadSettings(path: string): Promise<typeof GameSettings> {
  // Retrieve text file from the given file path
  const fileText: string = await getFileText(path);

  // Create a copy of game settings
  const outSettings = { ...GameSettings };

  // Process file line by line
  const lines = fileText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();

    // Ignore empty line and line starting with '#'
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    // Retrieve category+key and value pair
    const dotIndex = trimmed.indexOf(".");
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1 || dotIndex === -1 || dotIndex >= colonIndex) continue;

    const category = trimmed.substring(0, dotIndex).trim();
    const key = trimmed.substring(dotIndex + 1, colonIndex).trim();
    const value = trimmed.substring(colonIndex + 1).trim();
    if (!category || !key || value === undefined || value.length === 0) continue;

    // Match category and key to update settings
    let parsedNumber: number;
    if (category === "engine") {
      switch (key) {
        case "width":
          parsedNumber = parseInt(value);
          if (!isNaN(parsedNumber)) outSettings.gameWidth = parsedNumber;
          break;
        case "height":
          parsedNumber = parseInt(value);
          if (!isNaN(parsedNumber)) outSettings.gameHeight = parsedNumber;
          break;
        case "render_interval":
          parsedNumber = parseFloat(value);
          if (!isNaN(parsedNumber)) outSettings.renderInterval = parsedNumber;
          break;
        case "physics_interval":
          parsedNumber = parseFloat(value);
          if (!isNaN(parsedNumber)) outSettings.physicsInterval = parsedNumber;
          break;
        default:
          break;
      }
    } else if (category === "input") {
      switch (key) {
        case "brush_size":
          parsedNumber = parseInt(value);
          if (!isNaN(parsedNumber)) outSettings.brushSize = parsedNumber;
          break;
        case "brush_max_size":
          parsedNumber = parseInt(value);
          if (!isNaN(parsedNumber)) outSettings.brushMaxSize = parsedNumber;
          break;
        case "brush_sensitivity":
          parsedNumber = parseFloat(value);
          if (!isNaN(parsedNumber)) outSettings.brushSensitivity = parsedNumber;
          break;
        default:
          break;
      }
    } else if (category === "debug") {
      switch (key) {
        case "start_enabled":
          if (value.toLowerCase() === "true") outSettings.debugEnabled = true;
          else if (value.toLowerCase() === "false") outSettings.debugEnabled = false;
          break;
        case "overlay_start_enabled":
          if (value.toLowerCase() === "true") outSettings.debugOverlayEnabled = true;
          else if (value.toLowerCase() === "false") outSettings.debugOverlayEnabled = false;
          break;
        default:
          break;
      }
    }
  }

  return Object.freeze(outSettings);
}

// Safly loads a file and returns the content as string
export async function getFileText(filePath: string): Promise<string> {
  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`HTTP error! Failed to fetch ${filePath}. Status: ${response.status}`);
    }

    const fileText = await response.text();
    return fileText;
  } catch (error) {
    console.error(`Failed to read file from ${filePath}:`, error);
    throw new Error("Failed to load file.");
  }
}
