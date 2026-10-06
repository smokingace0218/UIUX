import { StructureFlowCollection } from "./shaders/structure-flow/StructureFlowCollection";
import "./shaders/threeui.css";
import "./App.css";

export function Scene() {
  return (
    <div className="shader-frame">
      <StructureFlowCollection
        variant="dimensional-field"
        hue={0}
        saturation={1.00}
        brightness={1.00}
      />
    </div>
  );
}

export default Scene;
