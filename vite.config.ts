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

});
