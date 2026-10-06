import { useMemo } from "react";

import dimensionalSource from "../shaders/neuform-isolated/sources/vanguard-dimensional.html?raw";

/* Dimensional Field, with liquid bubbles.

   The ThreeUI source document stays byte-for-byte as delivered; this file
   rewrites a copy of it at load time, the same way ThreeUI's own host adapts
   its documents. The authored spheres are rigid: they only bob, so their
   outlines stay perfect arcs. Here their surface flows instead. Slow waves
   ripple it all the time; near the cursor a bubble swells softly, grows a
   little and drifts away from the pointer, then floats back when it rests.
   The bubbles are clear, refracting the background through their curved
   surface with a thin-film rim and a highlight, like real bubbles.
   The beams keep a dim floor of light so the background never empties.
   The colours, camera parallax and timing are the authored effect. */

// the authored glass vertex shader, replaced whole
const GLASS_VERTEX = /varying vec3 vNormal;\s*void main\(\) \{\s*vNormal = normalize\(normalMatrix \* normal\);\s*gl_Position = projectionMatrix \* modelViewMatrix \* vec4\(position, 1\.0\);\s*\}/;

const LIQUID_VERTEX = `uniform float u_time;
                    uniform float u_order;
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
                        // a liquid surface: each point rides gently out and in along its
                        // normal, enough to keep the outline alive while it stays a round arc
                        float w = wobble(position, t * 0.8);
                        vec3 p = position + normal * 0.045 * (1.0 - 0.45 * u_order) * w;
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
                u_pull: { value: 0 },
                u_order: { value: 0 },
                u_lens: { value: new THREE.Vector3(0.5, 0.5, 0.0001) }`;

// the pointer, carried into world units on the z = 0 plane the spheres sit around
const POINTER_ANCHOR = "const resize = () => {";
const POINTER_TRACKING = `// liquid: where the pointer is in the scene, and whether it is in play
            const liquidTarget = new THREE.Vector3();
            let liquidLastMove = -1e9;
            let liquidLastPost = -1e9;
            let liquidLastFrame = performance.now();
            document.addEventListener('mousemove', (event) => {
                const ray = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5);
                ray.unproject(camera).sub(camera.position).normalize();
                const distance = -camera.position.z / ray.z;
                liquidTarget.copy(camera.position).add(ray.multiplyScalar(distance));
                liquidLastMove = performance.now();
                // tell the host page the pointer is moving, at most a few times a second
                if (liquidLastMove - liquidLastPost > 200 && window.parent !== window) {
                    liquidLastPost = liquidLastMove;
                    window.parent.postMessage({ flowPointer: true, x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight }, '*');
                }
            });
            document.documentElement.addEventListener('mouseleave', () => { liquidLastMove = -1e9; });

            // order: 0 is the noisy opening, 1 is the composed flow. The host page owns it.
            let liquidOrder = 0;
            let liquidOrderGoal = 0;
            let liquidClock = 0;
            window.addEventListener('message', (event) => {
                const order = event.data && event.data.flowOrder;
                if (typeof order === 'number') liquidOrderGoal = Math.min(1, Math.max(0, order));
            });
            if (window.parent !== window) window.parent.postMessage({ flowHello: true }, '*');

            // the travelling bubble: the small sphere follows its own soft loop
            // through the hero, in screen fractions (x from the left, y from the
            // top), with a dwell factor that slows it at the moments that matter.
            // upper centre-left, past the w of Flow, down to skim "without the
            // noise.", toward the large bubble, then away and back up.
            const TRAVEL_PATH = [
                [0.40, 0.17, 1.0],
                [0.44, 0.28, 1.0],
                [0.41, 0.44, 0.75],
                [0.35, 0.55, 0.95],
                [0.295, 0.635, 0.5],
                [0.39, 0.72, 0.9],
                [0.52, 0.66, 0.55],
                [0.575, 0.51, 0.65],
                [0.54, 0.34, 1.0],
                [0.46, 0.21, 1.1],
            ];
            const travelRay = new THREE.Vector3();
            const travelAt = (fx, fy, z, out) => {
                travelRay.set(fx * 2 - 1, -(fy * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize();
                return out.copy(camera.position).add(travelRay.multiplyScalar((z - camera.position.z) / travelRay.z));
            };
            const travelPoint = (s, out) => {
                // closed Catmull-Rom through the waypoints: no corners, no straight runs
                const n = TRAVEL_PATH.length;
                const i = Math.floor(s) % n;
                const t = s - Math.floor(s);
                const p0 = TRAVEL_PATH[(i + n - 1) % n], p1 = TRAVEL_PATH[i], p2 = TRAVEL_PATH[(i + 1) % n], p3 = TRAVEL_PATH[(i + 2) % n];
                const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
                const ease = t * t * (3 - 2 * t);
                out[0] = cr(p0[0], p1[0], p2[0], p3[0]);
                out[1] = cr(p0[1], p1[1], p2[1], p3[1]);
                out[2] = p1[2] + (p2[2] - p1[2]) * ease;
                return out;
            };
            let liquidTravel = null;

            ${POINTER_ANCHOR}`;

// each frame: ease the pull in while the pointer moves, let the liquid relax when it rests
const FRAME_ANCHOR = "uniforms.u_time.value = time;";
const FRAME_ADDED = `${FRAME_ANCHOR}

                const liquidNow = performance.now();
                const liquidDt = Math.min(0.1, (liquidNow - liquidLastFrame) / 1000);
                liquidLastFrame = liquidNow;
                const liquidGoal = liquidNow - liquidLastMove < 1200 ? 1 : 0;
                uniforms.u_pull.value += (liquidGoal - uniforms.u_pull.value) * (1 - Math.exp(-liquidDt / (liquidGoal ? 0.35 : 0.6)));
                uniforms.u_pointer.value.lerp(liquidTarget, 1 - Math.exp(-liquidDt / 0.12));

                // order eases in over most of a second, so the scene composes itself rather than snapping
                liquidOrder += (liquidOrderGoal - liquidOrder) * (1 - Math.exp(-liquidDt / 0.6));
                uniforms.u_order.value = liquidOrder;
                // the field runs on its own clock, which slows as order rises: calmer, never still
                liquidClock += liquidDt * (1 - 0.45 * liquidOrder);
                uniforms.u_time.value = liquidClock;`;

// the beams: authored, they fade fully out between passes, so the background
// empties and refills. A floor keeps a dim current of light always present,
// and the passes swell over it instead of appearing from nothing.
const BG_BEAM = "float beam = smoothstep(0.2, 0.9, snoise(vec2(st.x + st.y * 2.0 - u_time * 0.1, u_time * 0.03)));";
const BG_BEAM_STEADY = "float beam = 0.3 + 0.7 * smoothstep(-0.45, 0.9, snoise(vec2(st.x + st.y * 2.0 - u_time * 0.1, u_time * 0.03)));";

// the bubbles, as real bubbles. Authored, each one paints its own opaque beam
// pattern. Here a bubble is clear: it redraws the background field behind it,
// sampled through its curved surface so the scene bends and magnifies toward
// the rim like a lens, then adds a thin-film rim whose colours shift with the
// viewing angle and a soft window highlight. The field function is the
// background shader's own, so what shows through matches what is behind.
const GLASS_FRAGMENT = /varying vec3 vNormal;\s*\$\{snoiseLogic\}\s*void main\(\) \{[\s\S]*?gl_FragColor = vec4\(finalColor, 0\.95\);\s*\}/;
const GLASS_REFRACTION = `varying vec3 vNormal;
                    \${snoiseLogic}

                    // the background at a point on screen: the same steps as the background shader
                    vec3 fieldAt(vec2 screen) {
                        vec2 uv = screen;
                        uv.x *= u_resolution.x / u_resolution.y;
                        vec3 baseColor = vec3(0.02, 0.02, 0.03);
                        vec2 st = uv * 0.5;
                        st += vec2(snoise(st + u_time * 0.04), snoise(st - u_time * 0.04)) * (0.4 - 0.18 * u_order);
                        float beam = 0.3 + 0.7 * smoothstep(-0.45, 0.9, snoise(vec2(st.x + st.y * 2.0 - u_time * 0.1, u_time * 0.03)));
                        vec3 glow = mix(u_color1, u_color2, snoise(uv * 2.0 + u_time * 0.15) * 0.5 + 0.5);
                        float vignette = smoothstep(1.5, 0.1, distance(screen, vec2(0.5)));
                        return mix(vec3(0.01, 0.01, 0.015), mix(baseColor, glow, beam * 0.6), vignette);
                    }

                    void main() {
                        vec2 screen = gl_FragCoord.xy / u_resolution.xy;
                        vec3 n = normalize(vNormal);
                        float facing = clamp(n.z, 0.0, 1.0);
                        float fresnel = pow(1.0 - facing, 2.2);

                        // refraction: the view through the bubble bends, more toward the rim
                        vec2 bend = n.xy * (0.05 + 0.12 * fresnel) * (1.0 - 0.35 * u_order);
                        vec3 behind = fieldAt(screen - bend);

                        // thin film: colours that shift with the viewing angle and drift slowly
                        vec3 film = 0.5 + 0.5 * cos(6.2831 * (fresnel * 1.35 + u_time * 0.035 + vec3(0.0, 0.33, 0.67)));
                        film = mix(film, vec3(1.0), 0.2);
                        vec3 rim = film * fresnel * 0.38 + mix(u_color1, u_color2, 0.5) * fresnel * 0.16;

                        // a soft window highlight up and to the left, and a faint one opposite
                        float spec = pow(max(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0), 220.0) * 0.75
                                   + pow(max(dot(n, normalize(vec3(0.5, -0.45, 0.75))), 0.0), 60.0) * 0.08;

                        // the clear centre lets the scene through almost untouched, a touch brighter
                        vec3 color = behind * (0.95 + 0.12 * facing) + rim + vec3(spec);
                        gl_FragColor = vec4(color, 1.0);
                    }`;

// the bubbles: with no order each bobs on its own authored rhythm; as order
// rises they blend into one shared current, rising, falling and swaying the
// same way at the same tempo. A bubble near the cursor also eases away from it
// and grows a little, then floats back. Springs are timed in seconds, so the
// motion is the same at any frame rate.
const RENDER_ANCHOR = "renderer.render(scene, camera);";
const RENDER_DRIFT = `// the travelling bubble moves first, so the others can respond to where it is
                const traveller = spheres[2];
                if (traveller) {
                    if (!liquidTravel) {
                        liquidTravel = { s: 0, rate: 0, clock: 0, pos: traveller.mesh.position.clone(), vel: new THREE.Vector3(), prev: new THREE.Vector3(),
                            pull: new THREE.Vector3(), deform: 0, grow: 0, near: 0, radius: traveller.mesh.scale.x, z: traveller.mesh.position.z,
                            point: [0, 0, 1], target: new THREE.Vector3(), big: 0, seen: false };
                    }
                    const V = liquidTravel;
                    V.clock += liquidDt;
                    travelPoint(V.s, V.point);
                    // a slow, uneven pace: eased toward the target so it gathers and sheds speed with mass
                    const pace = 0.24 * V.point[2] * (1 + 0.14 * Math.sin(V.clock * 0.071) + 0.08 * Math.sin(V.clock * 0.19 + 2)) * (1 - 0.35 * V.big);
                    V.rate += (pace - V.rate) * (1 - Math.exp(-liquidDt / 1.4));
                    V.s = (V.s + V.rate * liquidDt) % TRAVEL_PATH.length;
                    // a faint drift that never repeats with the loop
                    const fx = V.point[0] + Math.sin(V.clock * 0.13) * 0.012 + Math.sin(V.clock * 0.051 + 1) * 0.008;
                    const fy = V.point[1] + Math.sin(V.clock * 0.17 + 1.3) * 0.010;
                    travelAt(fx, fy, V.z, V.target);
                    if (!V.seen) { V.pos.copy(V.target); V.seen = true; }

                    // the large bubble draws it in a little as it passes, and it slows
                    const big = spheres[0].mesh;
                    const toBig = big.position.clone().sub(V.pos);
                    const gap = Math.max(0, toBig.length() - big.scale.x - V.radius);
                    const bigGoal = Math.max(0, Math.min(1, 1 - gap / 3.2)) ** 2;
                    V.big += (bigGoal - V.big) * (1 - Math.exp(-liquidDt / 0.8));
                    toBig.z = 0;
                    V.target.add(toBig.normalize().multiplyScalar(0.55 * V.big));

                    // the cursor is only a small secondary pull: a little attraction while it is
                    // close and moving, never a tether; once it moves on, the path takes over again
                    const toCursor = uniforms.u_pointer.value.clone().sub(V.pos);
                    toCursor.z = 0;
                    const reach = Math.max(0, Math.min(1, 1 - (toCursor.length() - V.radius) / 2.4));
                    const nearGoal = uniforms.u_pull.value * reach * reach;
                    V.near += (nearGoal - V.near) * (1 - Math.exp(-liquidDt / 0.6));
                    if (toCursor.length() > 0.6) toCursor.setLength(0.6);
                    V.pull.lerp(toCursor.multiplyScalar(0.35 * V.near), 1 - Math.exp(-liquidDt / 0.7));
                    V.target.add(V.pull);

                    // mass: a critically damped spring toward the target, so turns are rounded and late
                    const omega = 1.9;
                    V.prev.copy(V.vel);
                    V.vel.add(V.target.clone().sub(V.pos).multiplyScalar(omega * omega * liquidDt)).multiplyScalar(Math.exp(-2 * omega * liquidDt));
                    V.pos.addScaledVector(V.vel, liquidDt);
                    traveller.mesh.position.copy(V.pos);

                    // a slight stretch along its motion when it changes direction, then round again
                    const accel = liquidDt > 0 ? V.vel.clone().sub(V.prev).length() / liquidDt : 0;
                    V.deform += (Math.min(0.06, accel * 0.06) - V.deform) * (1 - Math.exp(-liquidDt / 0.35));
                    const sp2 = V.vel.x * V.vel.x + V.vel.y * V.vel.y + 1e-4;
                    const ex = V.vel.x * V.vel.x / sp2, ey = V.vel.y * V.vel.y / sp2;
                    V.grow += (0.04 * V.near + 0.02 * V.big - V.grow) * (1 - Math.exp(-liquidDt / 0.5));
                    const r = V.radius * (1 + V.grow);
                    traveller.mesh.scale.set(r * (1 + V.deform * (2 * ex - 1)), r * (1 + V.deform * (2 * ey - 1)), r);

                    // where it is on screen: for the background's local calm and for the page's lettering
                    const onScreen = V.pos.clone().project(camera);
                    const rim = V.pos.clone().add(new THREE.Vector3(r, 0, 0)).project(camera);
                    const sx = (onScreen.x + 1) / 2, sy = (1 - onScreen.y) / 2;
                    const radiusPx = Math.abs(rim.x - onScreen.x) / 2 * window.innerWidth;
                    uniforms.u_lens.value.set(sx, 1 - sy, (radiusPx / window.innerHeight) * 2.2);
                    if (window.parent !== window) window.parent.postMessage({ flowLens: true, x: sx, y: sy, r: radiusPx, boost: V.near }, '*');
                }

                spheres.forEach((s, index) => {
                    if (index === 2 && liquidTravel) return;
                    if (!s.liquid) s.liquid = { baseX: s.mesh.position.x, baseScale: s.mesh.scale.x, ox: 0, oy: 0, grow: 0 };
                    const L = s.liquid;
                    const radius = L.baseScale;

                    // the shared current every bubble joins as order rises
                    const sharedY = s.baseY + Math.sin(liquidClock * 0.55) * 0.5;
                    s.mesh.position.y += (sharedY - s.mesh.position.y) * liquidOrder;
                    const sway = Math.sin(liquidClock * 0.21) * liquidOrder;
                    const currentX = sway * 0.9;
                    const currentY = sway * 0.35;

                    const dx = (L.baseX + L.ox + currentX) - uniforms.u_pointer.value.x;
                    const dy = s.mesh.position.y - uniforms.u_pointer.value.y;
                    const distance = Math.max(0.001, Math.hypot(dx, dy));
                    // 1 with the cursor on or inside the bubble's edge, easing to 0 a little way out
                    const edge = (distance - radius) / (radius * 0.8 + 1.6);
                    const near = uniforms.u_pull.value * Math.max(0, Math.min(1, 1 - edge)) ** 2;
                    // strong enough to outweigh the swell toward the cursor, so the bubble reads as drifting away
                    const push = near * (0.8 + radius * 0.18);
                    const settle = 1 - Math.exp(-liquidDt / 0.7);
                    L.ox += ((dx / distance) * push - L.ox) * settle;
                    L.oy += ((dy / distance) * push - L.oy) * settle;
                    L.grow += (near - L.grow) * (1 - Math.exp(-liquidDt / 0.5));
                    // the large bubble leans very slightly toward the traveller as it passes
                    if (index === 0 && liquidTravel) {
                        if (!L.lean) L.lean = new THREE.Vector3();
                        const toward = liquidTravel.pos.clone().sub(s.mesh.position);
                        toward.z = 0;
                        L.lean.lerp(toward.normalize().multiplyScalar(0.22 * liquidTravel.big), 1 - Math.exp(-liquidDt / 0.9));
                        L.ox += L.lean.x * settle * 0.5;
                        L.oy += L.lean.y * settle * 0.5;
                    }
                    s.mesh.position.x = L.baseX + L.ox + currentX;
                    s.mesh.position.y += L.oy + currentY;
                    const size = radius * (1 + 0.07 * L.grow + (index === 0 && liquidTravel ? 0.012 * liquidTravel.big : 0));
                    s.mesh.scale.set(size, size, size);
                });

                ${RENDER_ANCHOR}`;

// both fragment shaders include the shared noise source, so declaring the
// order uniform there gives it to each of them
const NOISE_ANCHOR = "vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }";
const NOISE_WITH_ORDER = `uniform float u_order;
                uniform vec3 u_lens;
                ${NOISE_ANCHOR}`;

// the background field: its turbulence quietens as order rises
const BG_DISTORT = "st += vec2(snoise(st + u_time * 0.04), snoise(st - u_time * 0.04)) * 0.4;";
// around the travelling bubble the turbulence softens and the glow leans toward it
const BG_DISTORT_ORDERED = `vec2 lensD = gl_FragCoord.xy / u_resolution.xy - u_lens.xy;
                        lensD.x *= u_resolution.x / u_resolution.y;
                        float lensF = exp(-dot(lensD, lensD) / (u_lens.z * u_lens.z));
                        st += vec2(snoise(st + u_time * 0.04), snoise(st - u_time * 0.04)) * (0.4 - 0.18 * u_order) * (1.0 - 0.3 * lensF);
                        st -= lensD * 0.06 * lensF;`;

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
    [BG_BEAM, BG_BEAM_STEADY],
    [NOISE_ANCHOR, NOISE_WITH_ORDER],
    [BG_DISTORT, BG_DISTORT_ORDERED],
    [GLASS_FRAGMENT, GLASS_REFRACTION],
    [RENDER_ANCHOR, RENDER_DRIFT],
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
