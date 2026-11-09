import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

type AudienceSize = "Small room" | "Seminar" | "Auditorium";
type Energy = "Supportive" | "Neutral" | "Distracted";

export type SceneHandle = {
  enterVR: () => Promise<void>;
  setAudienceMood: (mood: Energy) => void;
};

type Props = { audience: AudienceSize; energy: Energy };

type Person = {
  group: THREE.Group;
  head: THREE.Mesh;
  torso: THREE.Mesh;
  accent: THREE.Mesh;
  baseY: number;
  phase: number;
  kind: number;
};

const skinTones = [0xd9a982, 0x9b694d, 0xf0c6a0, 0x704933, 0xc58b68, 0xe7b894];
const outfitColors = [0x34483f, 0x3f4b59, 0x806c53, 0x58444f, 0x5b6559, 0x303b43, 0x7a765e, 0x8b5f4f];

export const Auditorium = forwardRef<SceneHandle, Props>(function Auditorium({ audience, energy }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const sceneState = useRef<{ renderer?: THREE.WebGLRenderer; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; people: Person[]; mood: Energy; frame?: number; xrSession?: XRSession }>({ people: [], mood: energy });

  useImperativeHandle(ref, () => ({
    enterVR: async () => {
      const state = sceneState.current;
      if (!state.renderer) throw new Error("The 3D scene is not ready.");
      const session = await navigator.xr!.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor"] });
      state.xrSession = session;
      await state.renderer.xr.setSession(session);
    },
    setAudienceMood: (mood) => {
      sceneState.current.mood = mood;
      sceneState.current.people.forEach((person, index) => {
        person.group.userData.moodOffset = mood === "Supportive" ? 0.12 : mood === "Neutral" ? 0 : Math.sin(index * 8.13) * 0.16;
      });
    }
  }), []);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x151a17);
    scene.fog = new THREE.Fog(0x151a17, 13, 38);

    const camera = new THREE.PerspectiveCamera(43, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 5.4, 13.2);
    camera.lookAt(0, 2.1, -5.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe3ddc8, 0x20251f, 2.0));
    const key = new THREE.DirectionalLight(0xffd6a3, 3.1);
    key.position.set(-6, 12, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const stageLight = new THREE.SpotLight(0xffd8a9, 95, 30, Math.PI / 5, 0.45, 1.2);
    stageLight.position.set(0, 11, 0);
    stageLight.target.position.set(0, 0, -5);
    scene.add(stageLight, stageLight.target);
    const rim = new THREE.PointLight(0x88a88c, 32, 20);
    rim.position.set(7, 4, -10);
    scene.add(rim);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 44), new THREE.MeshStandardMaterial({ color: 0x1d211e, roughness: 0.92 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.2, -5);
    floor.receiveShadow = true;
    scene.add(floor);

    const stage = new THREE.Mesh(new THREE.BoxGeometry(10, 0.42, 4.4), new THREE.MeshStandardMaterial({ color: 0x343b33, roughness: 0.72 }));
    stage.position.set(0, 0.05, -8.7);
    stage.receiveShadow = true;
    stage.castShadow = true;
    scene.add(stage);

    const stageFace = new THREE.Mesh(new THREE.BoxGeometry(9.9, 0.14, 0.09), new THREE.MeshStandardMaterial({ color: 0x9b7950, metalness: 0.25, roughness: 0.4 }));
    stageFace.position.set(0, -0.02, -6.5);
    scene.add(stageFace);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.25), new THREE.MeshBasicMaterial({ color: 0x232d28 }));
    screen.position.set(0, 4.0, -11.02);
    scene.add(screen);
    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(6.62, 3.47, 0.12), new THREE.MeshStandardMaterial({ color: 0x606b5a, metalness: 0.25, roughness: 0.5 }));
    screenFrame.position.set(0, 4.0, -11.1);
    scene.add(screenFrame);

    const screenArt = new THREE.Group();
    const barMaterial = new THREE.MeshBasicMaterial({ color: 0xc2c6a7 });
    const line1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.075, 0.01), barMaterial);
    line1.position.set(-0.75, 4.52, -10.99);
    const line2 = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.055, 0.01), new THREE.MeshBasicMaterial({ color: 0x8c9e8c }));
    line2.position.set(-1.25, 4.2, -10.99);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.75, 0.02), new THREE.MeshBasicMaterial({ color: 0xca9564 }));
    accent.position.set(-2.4, 3.9, -10.99);
    screenArt.add(line1, line2, accent);
    scene.add(screenArt);

    // Architectural ribs and side acoustic panels.
    for (let i = 0; i < 8; i++) {
      const x = -10.5 + i * 3;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 8.5, 0.16), new THREE.MeshStandardMaterial({ color: 0x3c443d, roughness: 0.8 }));
      rib.position.set(x, 4.0, -13.5);
      scene.add(rib);
    }
    for (const x of [-8, 8]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 7, 17), new THREE.MeshStandardMaterial({ color: 0x252d27, roughness: 0.9 }));
      panel.position.set(x, 3.3, -5);
      scene.add(panel);
    }

    const people: Person[] = [];
    const counts: Record<AudienceSize, number> = { "Small room": 12, Seminar: 42, Auditorium: 86 };
    const total = counts[audience];
    const rows = Math.ceil(total / 11);
    const seatGeo = new THREE.BoxGeometry(0.72, 0.5, 0.62);
    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x665c4c, roughness: 0.85 });
    const backMaterial = new THREE.MeshStandardMaterial({ color: 0x514c40, roughness: 0.82 });
    const bodyGeo = new THREE.CapsuleGeometry(0.24, 0.58, 3, 6);
    const headGeo = new THREE.SphereGeometry(0.19, 10, 8);
    const accentGeo = new THREE.SphereGeometry(0.045, 7, 6);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < 11 && people.length < total; col++) {
        const group = new THREE.Group();
        const x = (col - 5) * 0.89 + (row % 2) * 0.18;
        const z = -2.1 - row * 1.05;
        const y = row * 0.34;
        const skin = new THREE.MeshStandardMaterial({ color: skinTones[(row * 7 + col * 3) % skinTones.length], roughness: 0.9 });
        const outfit = new THREE.MeshStandardMaterial({ color: outfitColors[(row * 5 + col * 2) % outfitColors.length], roughness: 0.85 });
        const seat = new THREE.Mesh(seatGeo, seatMaterial);
        seat.position.set(0, 0.54, 0.22);
        const back = new THREE.Mesh(backMaterial === seatMaterial ? seatGeo : seatGeo, backMaterial);
        back.scale.set(1, 1.5, 0.28);
        back.position.set(0, 0.82, 0.48);
        const torso = new THREE.Mesh(bodyGeo, outfit);
        torso.scale.set(0.84, 0.78, 0.82);
        torso.position.y = 1.0;
        torso.castShadow = true;
        const head = new THREE.Mesh(headGeo, skin);
        head.position.y = 1.57;
        head.scale.set(0.9, 1.05, 0.94);
        head.castShadow = true;
        const accent = new THREE.Mesh(accentGeo, new THREE.MeshStandardMaterial({ color: 0xd4bda0, roughness: 0.8 }));
        accent.position.set(0.07, 1.59, -0.168);
        group.add(seat, back, torso, head, accent);
        group.position.set(x, y, z);
        group.rotation.y = Math.PI;
        scene.add(group);
        people.push({ group, head, torso, accent, baseY: y, phase: Math.random() * Math.PI * 2, kind: (row + col) % 5 });
      }
    }

    sceneState.current.renderer = renderer;
    sceneState.current.scene = scene;
    sceneState.current.camera = camera;
    sceneState.current.people = people;
    sceneState.current.mood = energy;

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      people.forEach((person, index) => {
        const moodOffset = person.group.userData.moodOffset ?? 0;
        const distracted = sceneState.current.mood === "Distracted" && index % 4 === 0;
        const attentive = sceneState.current.mood === "Supportive";
        const sway = Math.sin(t * 0.7 + person.phase) * 0.018;
        person.group.position.y = person.baseY + sway;
        person.head.rotation.x = Math.sin(t * (distracted ? 2.1 : 0.8) + person.phase) * (distracted ? 0.1 : 0.035) + moodOffset;
        person.head.rotation.y = Math.sin(t * 0.5 + person.phase) * (distracted ? 0.3 : 0.08);
        person.torso.rotation.z = Math.sin(t * 0.65 + person.phase) * 0.012;
        if (attentive && person.kind === 0) person.head.rotation.x -= Math.sin(t * 1.25 + person.phase) * 0.025;
        person.accent.visible = person.kind === 3 && distracted;
      });
      renderer.render(scene, camera);
    });

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
      sceneState.current.renderer = undefined;
      sceneState.current.people = [];
    };
  }, [audience]);

  return <div className="three-host" ref={host} aria-label="Animated 3D auditorium with a virtual audience" />;
});