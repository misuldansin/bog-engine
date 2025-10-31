import { Utilities } from "./structs/utils";
import type {
  ParticleMap,
  BaseParticleData,
  TechincalParticleData,
  SolidParticleData,
  LiquidParticleData,
  GasParticleData,
  SandParticleData,
  ElectronicParticleData,
  GameSettings,
} from "./types";

// This interface has all particle data possible keys the loader expects
interface RawParticleData {
  name?: string;
  category?: number;
  base_color?: string;
  variant_color?: string;
  is_movable?: boolean;
  density?: number;

  max_concentration?: number;

  repose_angle?: number;
}

// ..
export async function getFileText(filePath: string): Promise<string> {
  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const fileText = await response.text();
    return fileText;
  } catch (error) {
    console.error(`Failed to read particle data from ${filePath}:`, error);
    throw new Error("Failed to load particle data.");
  }
}

// ..
export async function loadParticleData(filePath: string): Promise<ParticleMap> {
  // Load text file from the given file path
  const fileText: string = await getFileText(filePath);

  // Processed data
  let rawRetrievedData: Record<number, RawParticleData> = {};
  let processedIds = new Set<number>();

  // Loop through each lines and retrieve raw particle data
  let currentId: number | null = null;
  for (const line of fileText.split("\n")) {
    // Trim line of any whitespaces and/ or tabs
    const thisLine = line.trim();

    // Ignore empty lines and lines starting with '#'
    if (thisLine.length === 0 || thisLine.startsWith("#")) {
      continue;
    }

    // We have encountered a new Particle Block [ID]
    if (thisLine.startsWith("[") && thisLine.endsWith("]")) {
      // Retrieve particle block's id and verify it
      const idStr = thisLine.slice(1, -1);
      const id = parseInt(idStr, 10);

      // Reject invalid (<0) and reserved IDs (<10)
      if (isNaN(id) || id < 10) {
        currentId = null;
        continue; // Done with this line
      }

      // Check for duplicate ids
      if (processedIds.has(id)) {
        console.warn(`[Loader] Duplicate ID found: ${id}. Ignoring.`);
        currentId = null;
        continue; // Done with this line
      }

      // Store the new ID and initialize raw data
      processedIds.add(id);
      currentId = id;
      rawRetrievedData[id] = {};
      continue; // Done with this line
    }

    // No new particle block, continue retreiving properties of this particle block
    if (currentId !== null) {
      // Retieve trimmed key and value pairs
      const parts = thisLine.split(":").map((string) => string.trim());

      // We have both key and it's value
      if (parts.length === 2) {
        const key = parts[0];
        const value = parts[1];
        const currentData = rawRetrievedData[currentId];

        // Match key names here and populate currect particle data
        switch (key) {
          case "name":
            currentData!.name = value!;
            break;
          case "category":
            currentData!.category = parseInt(value!, 10);
            break;
          case "base_color":
            currentData!.base_color = value!;
            break;
          case "variant_color":
            currentData!.variant_color = value!;
            break;
          case "is_movable":
            currentData!.is_movable = value === "true";
            break;
          case "density":
            currentData!.density = parseFloat(value!);
            break;
          case "max_concentration":
            currentData!.max_concentration = parseInt(value!);
            break;
          case "repose_angle":
            currentData!.repose_angle = parseFloat(value!);
            break;
          default:
            break;
        }
      }
    }
  }

  // Checksum and finalization
  const finalMapOut: ParticleMap = {};

  // Go through each raw retireved particle data and add them to the final particle map
  for (const id in rawRetrievedData) {
    const rawData = rawRetrievedData[id];
    const numberId = parseInt(id, 10);

    // Base particle should have these properties, discard if it doesn't
    if (
      rawData!.name === undefined ||
      rawData!.category === undefined ||
      rawData!.base_color === undefined ||
      rawData!.variant_color === undefined ||
      rawData!.is_movable === undefined ||
      rawData!.density === undefined
    ) {
      console.warn(`[Loader] Corrupted particle block found of ID: ${numberId}. Missing core properties.`);
      continue; // Yeet!
    }

    // This particle is atleast a base particle
    let baseParticleData: BaseParticleData = {
      id: numberId,
      name: rawData!.name,
      baseColor: rawData!.base_color,
      variantColor: rawData!.variant_color,
      isMovable: rawData!.is_movable,
      density: rawData!.density,
    } as BaseParticleData;

    // Check which category this particle belongs to
    if (rawData!.category === 1) {
      // If this particle has solid particle's properties, store it as solid particle data
      if (true) {
        finalMapOut[numberId] = {
          ...baseParticleData,
          category: 1,
        } as SolidParticleData;
      }
    } else if (rawData!.category === 2) {
      // If this particle has liquid particle's properties, store it as liquid particle data
      if (true) {
        finalMapOut[numberId] = {
          ...baseParticleData,
          maxConcentration: rawData!.max_concentration,
          category: 2,
        } as LiquidParticleData;
      }
    } else if (rawData!.category === 3) {
      // If this particle has gas particle's properties, store it as gas particle data
      if (true) {
        finalMapOut[numberId] = {
          ...baseParticleData,
          category: 3,
        } as GasParticleData;
      }
    } else if (rawData!.category === 4) {
      // If this particle has sand particle's properties, store it as sand particle data
      if (true) {
        finalMapOut[numberId] = {
          ...baseParticleData,
          category: 4,
          reposeAngle: rawData!.repose_angle,
          reposeDirections: Utilities.calculateRepose(rawData!.repose_angle!),
        } as SandParticleData;
      }
    } else if (rawData!.category === 5) {
      // If this particle has qlectronic particle's properties, store it as electronic particle data
      if (true) {
        finalMapOut[numberId] = {
          ...baseParticleData,
          category: 5,
        } as ElectronicParticleData;
      }
    } else {
      // Skip if it doesn't belong to any category; we don't allow base particles
    }
  }

  // Hardcoded Technical Particles (ID 0-9)
  finalMapOut[0] = {
    id: 0,

    name: "Empty",
    category: 0,
    baseColor: "#0E0E11",
    variantColor: "#0E0E11",
    isMovable: true,
    density: 0.0,
  } as TechincalParticleData;

  return finalMapOut;
}

// ..
export async function loadSettings(path: string): Promise<GameSettings> {
  // Retrieve file text
  const fileText: string = await getFileText(path);

  // Go line by line
  const settings: Partial<GameSettings> = {};
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

    // Match and asign keys
    let parsedNumber: number;
    if (category === "engine") {
      switch (key) {
        case "width":
          parsedNumber = parseInt(value);
          if (!isNaN(parsedNumber)) settings.gameWidth = parsedNumber;
          break;
        case "height":
          parsedNumber = parseInt(value);
          if (!isNaN(parsedNumber)) settings.gameHeight = parsedNumber;
          break;
        case "render_interval":
          parsedNumber = parseFloat(value);
          if (!isNaN(parsedNumber)) settings.renderInterval = parsedNumber;
          break;
        case "physics_interval":
          parsedNumber = parseFloat(value);
          if (!isNaN(parsedNumber)) settings.physicsInterval = parsedNumber;
          break;
        default:
          break;
      }
    } else if (category === "input") {
      switch (key) {
        case "brush_size":
          parsedNumber = parseInt(value);
          if (!isNaN(parsedNumber)) settings.brushSize = parsedNumber;
          break;
        case "brush_max_size":
          parsedNumber = parseInt(value);
          if (!isNaN(parsedNumber)) settings.brushMaxSize = parsedNumber;
          break;
        case "brush_sensitivity":
          parsedNumber = parseFloat(value);
          if (!isNaN(parsedNumber)) settings.brushSensitivity = parsedNumber;
          break;
        default:
          break;
      }
    } else if (category === "debug") {
      switch (key) {
        case "start_enabled":
          if (value.toLowerCase() === "true") settings.debugEnabled = true;
          else if (value.toLowerCase() === "false") settings.debugEnabled = false;
          break;
        case "overlay_start_enabled":
          if (value.toLowerCase() === "true") settings.debugOverlayEnabled = true;
          else if (value.toLowerCase() === "false") settings.debugOverlayEnabled = false;
          break;
        default:
          break;
      }
    }
  }

  // Apply defaults for missing values
  return {
    gameWidth: settings.gameWidth ?? 342,
    gameHeight: settings.gameHeight ?? 192,
    renderInterval: settings.renderInterval ?? 16.667,
    physicsInterval: settings.physicsInterval ?? 25,

    brushSize: settings.brushSize ?? 4,
    brushMaxSize: settings.brushMaxSize ?? 42,
    brushSensitivity: settings.brushSensitivity ?? 0.02,

    debugEnabled: settings.debugEnabled ?? false,
    debugOverlayEnabled: settings.debugOverlayEnabled ?? false,
  };
}
