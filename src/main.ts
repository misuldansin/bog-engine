import { loadParticleData, loadSettings } from "./loader";
import { BogEngine } from "./core/bog_engine";

async function initialize(): Promise<void> {
  try {
    // Load user settings and apply them
    const settings = await loadSettings("./src/data/settings.data");

    // Load particle data
    const particleData = await loadParticleData("./src/data/particle.data");

    // Initialise engine
    const bogEngine = new BogEngine(settings, particleData);

    // ..
  } catch (error) {
    console.error("ERROR: Failed to initialize app:", error);
  }
}

initialize();
