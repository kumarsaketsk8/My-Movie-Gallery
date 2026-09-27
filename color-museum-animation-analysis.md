# The Color Museum — animation and scroll interaction analysis

**Site:** [the-color-museum.vercel.app](https://the-color-museum.vercel.app/)  
**Method:** examined the JavaScript and CSS served by the deployment on 27 September 2026. Values are implementation values, not visual estimates, except where marked derived.

## What is actually animating

This is a fixed full-viewport Three.js/WebGL canvas, not a conventional DOM scroll animation. The page has a 1 px invisible `#track` element only to create scroll range. A Lenis virtual scroller captures wheel/touch input, then a GSAP ticker updates both Lenis and the Three.js camera every frame.

There is no desktop mouse-position parallax, hover steering, or drag-to-look. Scroll/trackpad is the primary input. Horizontal-dominant wheel movement is explicitly ignored; double-click toggles colour/art content.

| Layer | Exact mechanism |
| --- | --- |
| Canvas | fixed; `100vw × 100dvh` |
| Renderer | Three.js WebGLRenderer, antialiasing on, `powerPreference: "high-performance"` |
| Frame loop | GSAP ticker; `xy.raf(tickerTimeMs)` then camera path/render |
| GSAP | `lagSmoothing(0)`: no ticker lag compensation |
| Camera | Perspective: initial FOV **55°**, near **0.05**, far **120**; responsive FOV clamped **55°–80°** |
| Pixel ratio | Fine pointer: min(DPR, **2**); coarse pointer capped at **1.5**. Adaptive levels: **2, 1.75, 1.5, 1.25, 1**. Decrease after average frame time > **22 ms** for **1.5 s**; increase after < **13 ms** for **4 s**. |

## Wheel and trackpad interaction

Wheel events are prevented from becoming ordinary browser scrolling.

- Pixel delta mode remains × **1**; line mode converts × **16.6666667**; page mode uses viewport height (vertical).
- The vertical result is multiplied by **0.9** (`wheelMultiplier: 0.9`).
- The system is vertical only. If `|deltaX| > |deltaY|` on a wheel event, the event is prevented and the gallery does not move.
- Scroll is logically infinite: the animated value wraps modulo the document track length.
- One wall interval is **2.6 viewport heights**.

For a normal pixel-mode wheel event:

```text
targetScroll(next) = targetScroll(current) + 0.9 × wheel.deltaY
perWall = 2.6 × viewportHeight
wallProgressRaw = animatedScroll / perWall
```

Examples: per wall is **2,340 px** at a 900 px viewport height; **2,808 px** at 1080 px.

## Smoothness and ease-out: exact filter

The site configures Lenis with:

```js
{ infinite: true, syncTouch: true, lerp: 0.075, wheelMultiplier: 0.9 }
```

It does not use a duration-based ease for wheel input. Its exact frame-rate-independent exponential damping is:

```text
animatedScroll(t + Δt)
= animatedScroll(t)
+ (targetScroll − animatedScroll(t)) × (1 − exp(−4.5 × Δt))
```

`Δt` is seconds; **4.5 = 0.075 × 60**. The trailing settle therefore feels like an ease-out but is an asymptotic exponential response rather than a CSS/GSAP easing curve.

| Derived response | Exact/derived value |
| --- | ---: |
| Time constant, `τ = 1/4.5` | **222.222 ms** |
| Catch-up per 60 fps frame | **7.2257%** |
| Catch-up per 90 fps frame | **4.8771%** |
| Catch-up per 120 fps frame | **3.6806%** |
| 90% settled | **511.7 ms** |
| 95% settled | **665.7 ms** |
| 99% settled | **1.0234 s** |

This is the principal smoothness mechanism: target scroll can keep changing while the camera follows it softly; when input stops, it glides to the target.

## Local linger / spatial easing

Before camera motion is calculated, each wall fraction is remapped with a 1,024-sample inverse cumulative-distribution lookup table:

```text
weight(x) = 1 + 1.6 × exp(−((x − 0.45) / 0.07)²)
fraction = inverseCDF(weight, fractionRaw)
```

Parameters are exact:

| Parameter | Value |
| --- | ---: |
| Extra linger weight | **1.6** |
| Linger centre | **0.45** of a wall |
| Gaussian width | **0.07** |
| Table resolution | **1,024** intervals |

This makes narrative progress slow strongly around raw fraction **0.45**, producing the felt pause at a viewing position. Derived local progress rate is about **0.4609×** at the exact centre, versus about **1.1985×** far away: its centre is roughly **38.5%** of the far-region rate. This spatial easing operates in addition to the temporal Lenis damping.

## Camera path: exact geometry and ease functions

Walls are **12 world units** apart; camera base eye height is **1.6**. All `smoothstep` references below use the exact cubic:

```text
smoothstep(t) = 3t² − 2t³
```

It is an ease-in-out with zero velocity at both ends.

### A. Approach / viewing phase

For remapped wall fraction `r ≤ 0.45`:

```text
s = smoothstep(r / 0.45)
x = 0
y = 1.6
z = wallBaseZ + 7 − (7 − 3.07) × s
yaw = 0
```

- Start is **7** units from the current wall.
- Viewing/turn anchor is **3.07** units away.
- It travels **3.93** units over the first **45%** of a wall interval.
- Cubic smoothstep gives a gentle ease-in and ease-out at both endpoints.

### B. Departure, sideways arc, and turn

For `r > 0.45`:

```text
a = (r − 0.45) / 0.55
s = smoothstep(clamp((a − 0.10) / 0.90, 0, 1))
x = alternatingSign(wallIndex) × 5 × sin(π × s)
z = wallBaseZ + 3.07 − s × (3.07 + 12 − 7)
```

- This takes the final **55%** of a wall interval.
- The first **10%** of this phase has `s = 0`: a deliberate hold from **r = 0.45 to 0.505**.
- Lateral movement peaks at exactly **±5** units at `s = 0.5`, alternating side every wall.
- Forward distance is **8.07** units.
- The sine arc is zero at both ends; wrapped in smoothstep, it starts and ends especially gently.

Yaw begins with an alternating **11°** turn:

```text
initialYaw = alternatingSign × 11° × smoothstep(a / 0.25)
```

This completes from `a = 0` to **0.25** (remapped fraction **0.45–0.5875**). A second cubic blend begins at `a = 0.34` (fraction **0.637**) and completes at `a = 0.62` (**0.791**), moving toward **90%** of a calculated look-at direction for the next wall. The 90% factor prevents a literal target lock and keeps the camera composed.

## Independent idle / handheld motion

Unless `prefers-reduced-motion: reduce` is set, small time-based camera movement is added to the scroll path:

```text
n = sin(2πt / 4.6) + 0.25 × sin(4πt / 4.6 + 0.8)
y += 0.004 × n
pitch = 0.0013 × sin(2πt / 4.6 + 0.6)
yaw = 0.0016 × [0.6 sin(2πt / 9.1) + 0.4 sin(2πt / 13.7 + 1.3)]
roll = 0.001 × [0.7 sin(2πt / 7.3 + 0.4) + 0.3 sin(2πt / 11.9)]
```

- Vertical bob period: **4.6 s**, base amplitude **0.004** world units.
- Pitch amplitude: **0.0013 rad = 0.0745°**.
- Maximum yaw amplitude: **0.0016 rad = 0.0917°**.
- Maximum roll amplitude: **0.001 rad = 0.0573°**.

The motions are intentionally below roughly one tenth of a degree. Reduced-motion users retain the scroll path but receive zero procedural bob/pitch/yaw/roll.

## Magnetic landing / snapping

A custom directional snap layer sits on top of Lenis:

- It waits **200 ms** after the last wheel event.
- It considers only the direction of travel.
- The target must be at least **0.5 px** away in that direction.
- It only snaps if the remaining distance is below **0.09 × perWall**.
- Since `perWall = 2.6 × viewportHeight`, the eligibility range is **0.234 viewport heights**: **210.6 px** at 900 px viewport height, **252.7 px** at 1080 px.
- Snap uses the same Lenis exponential filter, so it is a magnetic glide, not a hard section jump.

## Touch and mobile

- `syncTouch: true`: while a finger is moving, touch is direct (`lerp: 1`).
- On touch release, inertia target is `sign(velocity) × |velocity|^1.7`; exponent is exactly **1.7**.
- The release target smooths with `syncTouchLerp: 0.075`, the same **222.222 ms** time constant.
- On small coarse-pointer portrait screens (short side < **600 px**), a rotate-device gate replaces the gallery.

The rotate-phone icon runs a **3.2 s** infinite CSS animation with **cubic-bezier(0.65, 0, 0.35, 1)**: upright at 0–12%, turns to 90° by 42%, holds to 78%, fades by 90%, invisibly resets at 91%, then fades in upright.

## Other visible timing and eases

| Effect | Timing | Ease |
| --- | --- | --- |
| Initial dark overlay fade | **2.0 s**, delay **0.15 s** | GSAP `sine.inOut` |
| Label opacity in | **0.2 s** | GSAP default; no explicit ease |
| Handwriting reveal | **2.2 s** | `none` (linear) |
| Label metadata in | **0.8 s**, delay **1.85 s** | `sine.out` |
| Label opacity out | **0.4 s** | `sine.out` |

## Faithful reproduction checklist

1. Use fixed WebGL and an invisible scroll track.
2. Set wheel gain to **0.9** and damp with `1 − exp(−4.5 × dt)`.
3. Allocate **2.6 vh** per wall.
4. Slow progress near **0.45** with the inverse Gaussian-weighted CDF above.
5. Use cubic smoothstep and sine arcs for the camera path, with a visual hold before turning.
6. Use a **200 ms** directional snap window of **0.234 vh**.
7. Keep decorative drift exceptionally small and remove it under reduced motion.

The characteristic “Color Museum” feeling is the combined effect of exponential temporal damping, the local spatial linger, and a camera trajectory that settles at a wall before taking an alternating, eased side turn.

