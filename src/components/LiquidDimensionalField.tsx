import { useMemo } from "react";

import dimensionalSource from "../shaders/neuform-isolated/sources/vanguard-dimensional.html?raw";

/* Dimensional Field, with liquid bubbles.

   The ThreeUI source document stays byte-for-byte as delivered; this file
   rewrites a copy of it at load time, the same way ThreeUI's own host adapts
   its documents. The authored spheres are rigid: they only bob, so their
   outlines stay perfect arcs. Here their surface flows instead. Slow waves
   ripple it all the time, and near the cursor it swells softly outward like
   liquid being drawn, then relaxes when the pointer rests.
   Everything else (the beams, colours, camera parallax and timing) is the
   authored effect. */

// the authored glass vertex shader, replaced whole
const GLASS_VERTEX = /varying vec3 vNormal;\s*void main\(\) \{\s*vNormal = normalize\(normalMatrix \* normal\);\s*gl_Position = projectionMatrix \* modelViewMatrix \* vec4\(position, 1\.0\);\s*\}/;

const LIQUID_VERTEX = `uniform float u_time;
                    uniform vec3 u_pointer;
                    uniform float u_pull;
                    varying vec3 vNormal;

                    // three slow, crossing waves: never repeats visibly, never sharp
                    float wobble(vec3 p, float t) {
                        return 0.55 * sin(p.x * 2.1 + t * 0.9) * sin(p.y * 1.7 + t * 0.7) * sin(p.z * 2.3 + t * 0.8)
                             + 0.30 * sin(dot(p, vec3(3.1, 2.3, 1.9)) + t * 1.3)
                             + 0.15 * sin(dot(p, vec3(-1.7, 4.1, 2.7)) - t * 1.1);
                    }

                    void main() {
                        float t = u_time;
                        // a liquid surface: each point rides out and in along its normal
                        float w = wobble(position, t);
                        vec3 p = position + normal * 0.11 * w;
                        vec4 world = modelMatrix * vec4(p, 1.0);

                        // drawn toward the pointer as a broad, soft swell: the surface moves
                        // outward along its own normal by a bell curve of distance from the
                        // cursor. Nothing here uses the direction to the cursor, which is
                        // undefined at the cursor itself and flips across it, creasing the
                        // surface into a point; distance alone stays smooth everywhere.
                        vec2 toPointer = u_pointer.xy - world.xy;
                        float swell = u_pull * exp(-dot(toPointer, toPointer) * 0.06);
                        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
                        world.xyz += worldNormal * swell * 0.55;

                        // tilt the normal with the waves so the fresnel rim ripples too
                        vec3 n = normal + 0.12 * vec3(cos(position.x * 2.1 + t * 0.9), cos(position.y * 1.7 + t * 0.7), cos(position.z * 2.3 + t * 0.8));
                        vNormal = normalize(normalMatrix * n);
                        gl_Position = projectionMatrix * viewMatrix * world;
                    }`;

// two uniforms for the pointer, added after the authored palette
const UNIFORMS_ANCHOR = "u_color2: { value: new THREE.Color(0.4, 0.0, 0.9) }  // Deep Purple";
const UNIFORMS_ADDED = `${UNIFORMS_ANCHOR}
                ,u_pointer: { value: new THREE.Vector3(0, 0, 0) },
                u_pull: { value: 0 }`;

// the pointer, carried into world units on the z = 0 plane the spheres sit around
const POINTER_ANCHOR = "const resize = () => {";
const POINTER_TRACKING = `// liquid: where the pointer is in the scene, and whether it is in play
            const liquidTarget = new THREE.Vector3();
            let liquidLastMove = -1e9;
            let liquidLastFrame = performance.now();
            document.addEventListener('mousemove', (event) => {
                const ray = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5);
                ray.unproject(camera).sub(camera.position).normalize();
                const distance = -camera.position.z / ray.z;
                liquidTarget.copy(camera.position).add(ray.multiplyScalar(distance));
                liquidLastMove = performance.now();
            });
            document.documentElement.addEventListener('mouseleave', () => { liquidLastMove = -1e9; });

            ${POINTER_ANCHOR}`;

// each frame: ease the pull in while the pointer moves, let the liquid relax when it rests
const FRAME_ANCHOR = "uniforms.u_time.value = time;";
const FRAME_ADDED = `${FRAME_ANCHOR}

                const liquidNow = performance.now();
                const liquidDt = Math.min(0.1, (liquidNow - liquidLastFrame) / 1000);
                liquidLastFrame = liquidNow;
                const liquidGoal = liquidNow - liquidLastMove < 2500 ? 1 : 0;
                uniforms.u_pull.value += (liquidGoal - uniforms.u_pull.value) * (1 - Math.exp(-liquidDt / (liquidGoal ? 0.35 : 0.9)));
                uniforms.u_pointer.value.lerp(liquidTarget, 1 - Math.exp(-liquidDt / 0.12));`;

// only the canvas shows; the authored page around it is hidden but left in place
const ISOLATE_STYLE = `<style>
html, body { margin: 0 !important; width: 100%; height: 100%; overflow: hidden !important; background: #050608 !important; }
body > *:not(#webgl-canvas) { display: none !important; }
#webgl-canvas { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; z-index: 0 !important; }
</style>`;

function liquefy(source: string) {
  const steps: [string | RegExp, string][] = [
    [UNIFORMS_ANCHOR, UNIFORMS_ADDED],
    [GLASS_VERTEX, LIQUID_VERTEX],
    [POINTER_ANCHOR, POINTER_TRACKING],
    [FRAME_ANCHOR, FRAME_ADDED],
  ];
  let out = source;
  for (const [anchor, replacement] of steps) {
    const matched = typeof anchor === "string" ? out.includes(anchor) : anchor.test(out);
    if (!matched) {
      // if the source ever changes, fall back to the authored effect rather than a broken one
      console.warn("LiquidDimensionalField: source anchor not found, showing the authored effect", anchor);
      return source;
    }
    out = out.replace(anchor, replacement);
  }
  return out.replace(/<\/head>/i, `${ISOLATE_STYLE}</head>`);
}

export function LiquidDimensionalField({ className }: { className?: string }) {
  const document = useMemo(() => liquefy(dimensionalSource), []);
  return (
    <iframe
      className={className}
      title="Liquid dimensional field"
      srcDoc={document}
      sandbox="allow-scripts"
      loading="eager"
      style={{ display: "block", width: "100%", height: "100%", border: 0, background: "#050608" }}
    />
  );
}
