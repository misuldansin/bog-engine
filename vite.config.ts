import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: "/bog-engine/",
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "src/data/*",
          dest: "src/data",
        },
        {
          src: "assets/*",
          dest: "assets",
        },
      ],
    }),
  ],
});
