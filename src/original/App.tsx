import { FlowHero } from "./components/FlowHero";
import { SiteHeader } from "./components/SiteHeader";
import "../shaders/threeui.css";
import "./App.css";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader />
      <main id="main">
        <FlowHero />
      </main>
    </>
  );
}
