import { loadElements, loadSettings } from "./loader";
import { BogEngine } from "./core/bog_engine";

async function initialize(): Promise<void> {
  try {
    // Load user settings and apply them
    const settings = await loadSettings("./src/data/settings.data");

    // Load particle data
    const particleDataMap = await loadElements("./src/data/elements.data");

    // Initialise engine
    const bogEngine = new BogEngine(settings, particleDataMap);

    // ..
  } catch (error) {
    console.error("ERROR: Failed to initialize app:", error);
  }
}

initialize();
