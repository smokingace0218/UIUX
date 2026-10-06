import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/* NeuformIsolatedEffects.tsx is kept byte-for-byte as delivered, so it still
   imports the source documents of every effect in the family. Only
   vanguard-dimensional.html (Dimensional Field) was provided; the rest resolve
   to an empty document so the module builds, and the build log names each one. */
function missingNeuformSources(): Plugin {
  const prefix = "\0missing-neuform-source:";
  return {
    name: "missing-neuform-sources",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer || !source.endsWith(".html?raw") || !source.startsWith("./sources/")) return null;
      const file = resolve(dirname(importer), source.slice(0, -"?raw".length));
      if (existsSync(file)) return null;
      this.warn(`neuform source not provided, served empty: ${source}`);
      return prefix + source;
    },
    load(id) {
      if (id.startsWith(prefix)) return 'export default "";';
      return null;
    },
  };
}

export default defineConfig({
  plugins: [missingNeuformSources(), react()],
  // two pages: the hero as decided (index.html, from src/original) and the lens
  // variant (lens.html, from src/components). FLOW_PAGE=index or FLOW_PAGE=lens
  // builds one page on its own as a single bundle, as the published previews use.
  build: {
    rollupOptions: {
      input: process.env.FLOW_PAGE
        ? resolve(__dirname, `${process.env.FLOW_PAGE}.html`)
        : { main: resolve(__dirname, "index.html"), lens: resolve(__dirname, "lens.html") },
    },
  },
});
