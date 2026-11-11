# StageRoom

**Speak with presence.** StageRoom is a browser-based 3D public-speaking simulator built with React, TypeScript and Three.js. The experience is designed around the speaker's point of view: the venue fills the viewport, while practice controls fade away until the pointer approaches an edge.

## Experience

- Full-viewport 3D practice venue with edge-revealed, auto-hiding controls.
- Four room environments: main auditorium, classroom, conference room and outdoor amphitheatre.
- Five distinct textured seated audience models, instanced into 15, 60 or 120 background seats.
- Two individual rigged foreground audience members. They play a real sit-down animation, then settle into subtle head and breathing idles.
- The displayed audience totals are 17, 62 and 122, including the two foreground characters.
- Walnut and acoustic room finishes, carpet texture, stage lighting, projection screen, glass, outdoor trees and floating dust in enclosed venues.
- Supportive, neutral and distracted audience-energy settings.
- Low-volume crowd murmur while a session is running, matched to the selected venue, and a short applause cue when a session ends.
- Session timer, microphone permission, local input meter and fullscreen mode.
- WebXR immersive VR entry where the browser and headset support `immersive-vr`.
- Three.js and GLB assets are loaded in the browser. No desktop app or local installation is needed for the hosted site.

## 3D assets and licenses

The background row is **Avery, Riley, Morgan, Rowan and Nora**, a five-person seated GLB by Innerscene, adapted from MakeHuman/MPFB assets and released under **CC0-1.0**:

https://www.innerscene.com/tools/library/3d-parts/avery-riley-morgan-rowan-and-nora-3d-person-audience-row-of--da50868b

The two animated foreground characters are **Sam** and **Maya**, each distributed as a rigged CC0 GLB with an original six-second sit/stand animation. StageRoom trims the animation to the sit-down section, then adds a restrained procedural head and chest idle:

- https://www.innerscene.com/tools/library/3d-parts/sit-down-and-stand-up-sam-3d-person-animated-66ca6c29
- https://www.innerscene.com/tools/library/3d-parts/sit-down-and-stand-up-maya-3d-person-animated-2fc646b4

The crowd ambience and applause audio are CC0 files from SFXMint:

- https://sfxmint.com/sounds/crowd-murmur-77
- https://sfxmint.com/sounds/crowd-murmur-51
- https://sfxmint.com/sounds/crowd-murmur-64
- https://sfxmint.com/sounds/crowd-applause-58

The background row is still a set of static seated models repeated with GPU instancing. The two foreground people are the genuinely rigged and animated characters; the entire audience is not individually animated, and there are no facial-expression or lip-sync systems yet.

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

Use a WebXR-compatible browser and headset, serve the app over HTTPS (or localhost for development), and connect a headset before opening immersive mode. The same Three.js venue is used in VR. Motion-controller interactions and hand tracking are later improvements.

## Scope and privacy

The microphone remains off until explicitly enabled. It is used only for a local input-level meter and is not recorded or uploaded. There is no hosted AI evaluation in the current MVP.
