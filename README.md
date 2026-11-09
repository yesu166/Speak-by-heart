# StageRoom

**Speak with presence.** StageRoom is a lightweight 3D public-speaking practice room built with React, TypeScript and Three.js.

## MVP 1

- Animated 3D auditorium with procedural seated audience characters.
- Three room sizes and three audience-energy settings.
- Practice title, session timer, microphone permission and live input meter.
- Responsive control surface and quiet, low-distraction visual design.
- WebXR immersive VR entry where the browser and headset support `immersive-vr`.
- No account system, hosted AI inference, analytics SDKs or heavy UI framework.

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

Use a WebXR-compatible browser and headset, serve the app over HTTPS (or localhost for development), and connect a headset before opening the immersive mode. MVP 1 enters the same Three.js scene in VR. Motion controllers, hand tracking and presenter embodiment are later improvements.

## Scope and privacy

The microphone is not recorded or uploaded. It is used only for a local input-level meter and remains off until the user explicitly connects it. There is no AI evaluation in MVP 1.

## Next milestones

1. Speech transcription and pace/filler-word analysis.
2. Camera-based pose and gesture feedback (opt-in).
3. Scenario-driven Q&A audience.
4. Saved practice history and personalised drills.
