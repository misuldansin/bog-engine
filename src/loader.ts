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
