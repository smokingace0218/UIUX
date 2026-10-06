// Regression check for the copied ThreeUI sources. `published` is the hash the
// ThreeUI source bundle registers for each file; `received` is the hash of the
// copy committed here. They differ for two files: the text arrived through a
// chat paste whose whitespace could not be restored byte-for-byte. Update these
// hashes only when replacing a file with an original download from threeui.com.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const FILES = [
  {
    path: "src/shaders/neuform-isolated/NeuformIsolatedEffects.tsx",
    published: "fe9856234253bc3c1a13b3afb84f3d84644dfa6d578e7203bb3e1dd5eced1b75",
    received: "92dc1eab54e127082952d4f8994afef41eadb1984fbf37637fa154eb48bd9ee9",
  },
  {
    path: "src/shaders/neuform-isolated/sources/vanguard-dimensional.html",
    published: "04043ca75f250d254914467e33b26ad8ef714833acd023735d012ae114696aed",
    received: "e1104bcecd50301ebdb557d779ec89b81ade023200a9c67863ce79112cf33547",
  },
  {
    path: "src/shaders/threeui.css",
    published: "efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf",
    received: "efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf",
  },
];

let failed = false;
for (const file of FILES) {
  const actual = createHash("sha256").update(readFileSync(file.path)).digest("hex");
  if (actual === file.published) {
    console.log(`ok        ${file.path}`);
  } else if (actual === file.received) {
    console.log(`unchanged ${file.path} (copy as received; differs from the published hash)`);
  } else {
    console.error(`CHANGED   ${file.path}: ${actual}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
