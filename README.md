# StageRoom

**Speak with presence.** StageRoom is a 3D public-speaking practice room built with React, TypeScript and Three.js.

## MVP 1

- Cinematic auditorium with a textured, five-person seated audience model.
- GPU-instanced audience rows for 15, 60 and 120-person room sizes.
- Warm walnut acoustic panels, carpet texture, brass details, stage lighting, projection screen and PBR environment reflections.
- Three audience-energy settings with subtle crowd response.
- Practice title, session timer, microphone permission and live input meter.
- Responsive control surface and low-distraction visual design.
- WebXR immersive VR entry where the browser and headset support `immersive-vr`.
- No account system, hosted AI inference, analytics SDKs or heavy UI framework.

## Realistic audience asset

The seated audience model is **Avery, Riley, Morgan, Rowan and Nora**, a five-person textured GLB row by Innerscene. It is adapted from MakeHuman/MPFB CC0 assets and released under **CC0-1.0**. The GLB is optimized for web delivery with Meshopt geometry compression and WebP textures, reducing the downloaded asset from roughly 29 MB to under 4 MB.

Source: https://www.innerscene.com/tools/library/3d-parts/avery-riley-morgan-rowan-and-nora-3d-person-audience-row-of--da50868b

The figures are static seated models, not individually rigged characters. Audience energy currently changes subtle row-level movement; individual head, arm and facial animation is a later upgrade.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run typecheck
npm run build
npm run preview
```

## VR notes

Use a WebXR-compatible browser and headset, serve the app over HTTPS (or localhost for development), and connect a headset before opening immersive mode. MVP 1 places the same Three.js scene in VR. Motion controllers, hand tracking and presenter embodiment are later improvements.

## Scope and privacy

The microphone is not recorded or uploaded. It is used only for a local input-level meter and remains off until the user explicitly connects it. There is no AI evaluation in MVP 1.
