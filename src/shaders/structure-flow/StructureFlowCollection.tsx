import { lazy, Suspense, type ComponentType } from "react";

import type { NeuformIsolatedEffectProps } from "../neuform-isolated/NeuformIsolatedEffects";

/* Local host for the Structure Flow family. Each variant maps to its own
   authored renderer and is lazy-loaded, so only the selected scene's code is
   fetched. Only Dimensional Field has its source in this project; the other
   twelve are listed so the variant prop keeps the family's full type, and are
   wired up here once their source files are added. */
export type StructureFlowVariant =
  | "structure-flow"
  | "emerald-horizon"
  | "orbital-sphere"
  | "dot-matrix"
  | "expanse-field"
  | "logic-core"
  | "dimensional-field"
  | "data-field"
  | "topology-field"
  | "nebula"
  | "fluid-field"
  | "ember-storm"
  | "flux-vortex";

export type StructureFlowCollectionProps = NeuformIsolatedEffectProps & {
  variant: StructureFlowVariant;
};

const RENDERERS: Partial<Record<StructureFlowVariant, ComponentType<NeuformIsolatedEffectProps>>> = {
  "dimensional-field": lazy(() =>
    import("../neuform-isolated/NeuformIsolatedEffects").then((module) => ({ default: module.DimensionalField })),
  ),
};

export function StructureFlowCollection({ variant, ...props }: StructureFlowCollectionProps) {
  const Renderer = RENDERERS[variant];
  if (!Renderer) {
    throw new Error(`StructureFlowCollection: the "${variant}" renderer's source has not been added to this project.`);
  }
  return (
    <Suspense fallback={null}>
      <Renderer {...props} />
    </Suspense>
  );
}
