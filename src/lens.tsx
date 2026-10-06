import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

// the lens variant of the hero, kept on its own page beside the original
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App variant="lens" />
  </StrictMode>,
);
