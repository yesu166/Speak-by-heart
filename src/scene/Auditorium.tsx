import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

type AudienceSize = "Small room" | "Seminar" | "Auditorium";
type Energy = "Supportive" | "Neutral" | "Distracted";
export type Venue = "Main auditorium" | "Classroom" | "Conference room" | "Outdoor amphitheatre";

export type SceneHandle = {
  enterVR: () => Promise<void>;
  setAudienceMood: (mood: Energy) => void;
};

type Props = { audience: AudienceSize; energy: Energy; venue: Venue };

type Placement = {
  matrix: THREE.Matrix4;
  pivot: THREE.Vector3;
  phase: number;
};

type AudienceEntry = {
  base: THREE.Matrix4;
  placementIndex: number;
};

type AudienceBatch = {
  mesh: THREE.InstancedMesh;
  entries: AudienceEntry[];
};

type AnimatedAudienceActor = {
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
  root: THREE.Object3D;
  head?: THREE.Bone;
  chest?: THREE.Bone;
  headRest?: THREE.Quaternion;
  chestRest?: THREE.Quaternion;
  settled: boolean;
  seed: number;
};

type SceneRuntime = {
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  batches: AudienceBatch[];
  actors: AnimatedAudienceActor[];
  mood: Energy;
  xrSession?: XRSession;
};

const AUDIENCE_MODEL_URL =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_3KrUYE2WtgFOq6wOmniZwGJHvVm/19401a7e-7f7a-480d-9e1b-29014b4d697e.glb";
const SEATED_ACTORS = [
  {
    url: "https://d2ol7oe51mr4n9.cloudfront.net/user_3KrUYE2WtgFOq6wOmniZwGJHvVm/6fe86f9d-7327-4c05-943c-4c4f79df8619.glb",
    x: -4.05,
    z: -7.25,
    delay: 0.2,
    seed: 0.6
  },
  {
    url: "https://d2ol7oe51mr4
…[1 chars truncated — re-run with head/grep/tail for full output]…
= false;
    target.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const sourceInstance = new THREE.Matrix4();
    const base = new THREE.Matrix4();

    placements.forEach((placement, placementIndex) => {
      for (let instanceIndex = 0; instanceIndex < sourceCount; instanceIndex++) {
        if (sourceInstanced) {
          object.getMatrixAt(instanceIndex, sourceInstance);
          base.copy(placement.matrix).multiply(sourceMesh.matrixWorld).multiply(sourceInstance);
        } else {
          base.copy(placement.matrix).multiply(sourceMesh.matrixWorld);
        }

        target.setMatrixAt(entries.length, base);
        if (isClothing) {
          const colorIndex = (placementIndex + instanceIndex + paletteOffset) % clothingPalette.length;
          target.setColorAt(entries.length, new THREE.Color(clothingPalette[colorIndex]));
        }
        entries.push({ base: base.clone(), placementIndex });
      }
    });

    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
    target.computeBoundingBox();
    target.computeBoundingSphere();
    scene.add(target);
    batches.push({ mesh: target, entries });
  });

  return batches;
}

function addFallbackAudience(scene: THREE.Scene, placements: Placement[]): void {
  const skin = new THREE.MeshStandardMaterial({ color: 0xb78362, roughness: 0.82 });
  const jacket = new THREE.MeshStandardMaterial({ color: 0x435148, roughness: 0.9 });
  const seat = new THREE.MeshStandardMaterial({ color: 0x62564a, roughness: 0.88 });
  const seatGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.46);
  const bodyGeometry = new THREE.CapsuleGeometry(0.19, 0.38, 3, 7);
  const headGeometry = new THREE.SphereGeometry(0.15, 12, 10);

  placements.forEach((placement) => {
    for (let index = 0; index < 5; index++) {
      const person = new THREE.Group();
      const x = (index - 2) * 0.64;
      const chair = new THREE.Mesh(seatGeometry, seat);
      chair.position.set(x, 0.48, 0.02);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.09), seat);
      back.position.set(x, 0.76, -0.18);
      const torso = new THREE.Mesh(bodyGeometry, jacket);
      torso.position.set(x, 0.91, -0.04);
      torso.rotation.x = -0.12;
      const head = new THREE.Mesh(headGeometry, skin);
      head.position.set(x, 1.34, -0.04);
      person.add(chair, back, torso, head);
      person.position.set(placement.pivot.x, placement.pivot.y, placement.pivot.z);
      person.rotation.y = Math.PI;
      scene.add(person);
    }
  });
}

function addAudienceChair(scene: THREE.Scene, x: number, z: number, material: THREE.Material): void {
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.62), material);
  seat.position.set(0, 0.45, 0.02);
  seat.castShadow = true;
  seat.receiveShadow = true;
  chair.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.085), material);
  back.position.set(0, 0.82, 0.29);
  back.castShadow = true;
  chair.add(back);

  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x342a22, roughness: 0.82, metalness: 0.08 });
  for (const legX of [-0.24, 0.24]) {
    for (const legZ of [-0.22, 0.22]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.44, 0.045), legMaterial);
      leg.position.set(legX, 0.22, legZ);
      chair.add(leg);
    }
  }
  chair.position.set(x, 0, z);
  scene.add(chair);
}

function addAnimatedAudienceActor(
  scene: THREE.Scene,
  gltf: GLTF,
  actorInfo: (typeof SEATED_ACTORS)[number],
  index: number
): AnimatedAudienceActor {
  const root = SkeletonUtils.clone(gltf.scene);
  root.name = index === 0 ? "StageRoom animated seated audience Sam" : "StageRoom animated seated audience Maya";
  root.position.set(actorInfo.x, 0.012, actorInfo.z);
  root.rotation.y = Math.PI;
  root.scale.setScalar(0.9);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  scene.add(root);

  const chairMaterial = new THREE.MeshStandardMaterial({
    color: index === 0 ? 0x51453a : 0x3e4a41,
    roughness: 0.74,
    metalness: 0.04
  });
  addAudienceChair(scene, actorInfo.x, actorInfo.z, chairMaterial);

  const mixer = new THREE.AnimationMixer(root);
  const sourceClip = gltf.animations.find((clip) => clip.name === "Sit_Stand") ?? gltf.animations[0];
  const sitDownClip = THREE.AnimationUtils.subclip(sourceClip, "SeatIntoPlace", 0, 75, 30);
  const action = mixer.clipAction(sitDownClip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.startAt(actorInfo.delay).play();

  return {
    mixer,
    action,
    root,
    head: root.getObjectByName("head") as THREE.Bone | undefined,
    chest: root.getObjectByName("spine_03") as THREE.Bone | undefined,
    settled: false,
    seed: actorInfo.seed
  };
}

export const Auditorium = forwardRef<SceneHandle, Props>(function Auditorium({ audience, energy, venue }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const [crowdStatus, setCrowdStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const sceneState = useRef<SceneRuntime>({ batches: [], actors: [], mood: energy });

  useImperativeHandle(ref, () => ({
    enterVR: async () => {
      const state = sceneState.current;
      if (!state.renderer) throw new Error("The 3D scene is not ready.");
      if (!navigator.xr) throw new Error("WebXR is not available in this browser.");
      const session = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: ["local-floor", "bounded-floor"]
      });
      state.xrSession = session;
      session.addEventListener("end", () => {
        state.xrSession = undefined;
      });
      await state.renderer.xr.setSession(session);
    },
    setAudienceMood: (mood) => {
      sceneState.current.mood = mood;
    }
  }), []);

  useEffect(() => {
    const container = host.current;
    if (!container) return;

    let disposed = false;
    let environmentTarget: THREE.WebGLRenderTarget | undefined;
    let fallbackAdded = false;
    setCrowdStatus("loading");
    let scenePlacements = createPlacements(audience, undefined, venue);

    const scene = new THREE.Scene();
    const outdoor = venue === "Outdoor amphitheatre";
    const backgroundColor = outdoor ? 0x111b26 : venue === "Classroom" ? 0x4d5145 : venue === "Conference room" ? 0x11191d : 0x171b18;
    scene.background = new THREE.Color(backgroundColor);
    scene.fog = outdoor
      ? new THREE.Fog(backgroundColor, 40, 72)
      : new THREE.Fog(backgroundColor, 27, 56);

    // Speaker's point of view: the camera stands on the stage and faces the audience.
    // The previous camera was behind the rear wall, which completely hid the crowd.
    const camera = new THREE.PerspectiveCamera(56, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 110);
    camera.position.set(0, 2.65, -12.45);
    camera.lookAt(0, 1.32, 0.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.setSize(container.clientWidth, container.clientHeight);
    const compactView = window.matchMedia("(max-width: 900px)").matches;
    renderer.shadowMap.enabled = !compactView;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    environmentTarget = buildRoom(scene, renderer, venue);

    sceneState.current.renderer = renderer;
    sceneState.current.scene = scene;
    sceneState.current.camera = camera;
    sceneState.current.batches = [];
    sceneState.current.actors = [];
    sceneState.current.mood = energy;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const actorLoader = new GLTFLoader();
    actorLoader.setMeshoptDecoder(MeshoptDecoder);
    const crowdLoadStarted = performance.now();
    loadGltfAsset(loader, AUDIENCE_MODEL_URL)
      .then((gltf) => {
        if (disposed) return;
        window.dispatchEvent(new CustomEvent("stagroom-crowd-model-loaded", { detail: { ms: performance.now() - crowdLoadStarted } }));
        const model = gltf.scene;
        model.updateMatrixWorld(true);

        const actualPlacements = createPlacements(audience, model, venue);
        scenePlacements = actualPlacements;
        const batches = createAudienceBatches(scene, model, actualPlacements);
        sceneState.current.batches = batches;
        crowdModelReady = true;
        (scene.userData as { audienceReady?: boolean }).audienceReady = true;
        setCrowdStatus("ready");
        window.dispatchEvent(new CustomEvent("stagroom-crowd-ready", { detail: { batches: batches.length, people: actualPlacements.length * 5, buildMs: performance.now() - crowdLoadStarted } }));
      })
      .catch((error) => {
        if (disposed) return;
        console.error("StageRoom audience model failed to load:", error);
        if (!fallbackAdded) {
          addFallbackAudience(scene, scenePlacements);
          fallbackAdded = true;
          setCrowdStatus("fallback");
        }
      });

    Promise.all(SEATED_ACTORS.map((actor) => loadGltfAsset(actorLoader, actor.url)))
      .then((models) => {
        if (disposed) return;
        sceneState.current.actors = models.map((model, index) =>
          addAnimatedAudienceActor(scene, model, SEATED_ACTORS[index], index)
        );
        (scene.userData as { animatedActorsReady?: boolean }).animatedActorsReady = true;
        window.dispatchEvent(new CustomEvent("stagroom-actors-ready", { detail: { people: sceneState.current.actors.length } }));
      })
      .catch((error) => {
        if (disposed) return;
        console.warn("StageRoom animated foreground audience could not load:", error);
      });

    const clock = new THREE.Clock();
    let crowdModelReady = false;
    let lastRenderedAt = 0;
    const rowDeltas = scenePlacements.map(() => new THREE.Matrix4());
    const cameraHome = camera.position.clone();
    const cameraLook = new THREE.Vector3(0, 1.32, 0.6);
    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (event: PointerEvent) => {
      pointerX = THREE.MathUtils.clamp((event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2, -1, 1);
      pointerY = THREE.MathUtils.clamp((event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2, -1, 1);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    const rotationMatrix = new THREE.Matrix4();
    const inversePivotMatrix = new THREE.Matrix4();
    const animatedMatrix = new THREE.Matrix4();
    const actorHeadOffset = new THREE.Quaternion();
    const actorChestOffset = new THREE.Quaternion();
    const actorEuler = new THREE.Euler();

    renderer.setAnimationLoop(() => {
      const now = performance.now();
      // During GLB decoding, a lower render cadence leaves more CPU headroom for asset parsing.
      // Once the crowd is in, the room runs at a smooth 45 fps; WebXR keeps headset pacing.
      const targetFps = renderer.xr.isPresenting ? 90 : crowdModelReady ? 45 : 20;
      if (!renderer.xr.isPresenting && now - lastRenderedAt < 1000 / targetFps) return;
      lastRenderedAt = now;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const mood = sceneState.current.mood;
      const amplitude = mood === "Supportive" ? 0.0045 : mood === "Neutral" ? 0.002 : 0.011;
      const yawAmplitude = mood === "Distracted" ? 0.025 : mood === "Neutral" ? 0.006 : 0.003;

      // The camera has a restrained head-look response, so the virtual room feels occupied rather than frozen.
      camera.position.x += (cameraHome.x + pointerX * 0.22 - camera.position.x) * 0.035;
      camera.position.y += (cameraHome.y - pointerY * 0.09 - camera.position.y) * 0.035;
      camera.lookAt(cameraLook.x + pointerX * 0.3, cameraLook.y - pointerY * 0.13, cameraLook.z);

      const dustField = scene.userData.dustField as { positions: Float32Array; drift: Float32Array; geometry: THREE.BufferGeometry; count: number } | undefined;
      if (dustField) {
        for (let i = 0; i < dustField.count; i++) {
          const index = i * 3;
          dustField.positions[index] += dustField.drift[index] * delta;
          dustField.positions[index + 1] += dustField.drift[index + 1] * delta;
          dustField.positions[index + 2] += dustField.drift[index + 2] * delta;
          if (dustField.positions[index + 1] > 7.1) dustField.positions[index + 1] = 0.25;
          if (dustField.positions[index] > 7) dustField.positions[index] = -7;
          if (dustField.positions[index] < -7) dustField.positions[index] = 7;
        }
        (dustField.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }

      const stageLights = scene.userData.stageLights as THREE.SpotLight[] | undefined;
      if (stageLights) {
        stageLights[0].intensity = 150 + Math.sin(elapsed * 0.55) * 1.4;
        stageLights[1].intensity = 105 + Math.sin(elapsed * 0.43 + 1.4) * 1.1;
      }

      scenePlacements.forEach((placement, index) => {
        const bob = Math.sin(elapsed * 1.05 + placement.phase) * amplitude;
        const yaw = Math.sin(elapsed * 0.34 + placement.phase) * yawAmplitude;
        rowDeltas[index]
          .makeTranslation(placement.pivot.x, placement.pivot.y + bob, placement.pivot.z)
          .multiply(rotationMatrix.makeRotationY(yaw))
          .multiply(inversePivotMatrix.makeTranslation(-placement.pivot.x, -placement.pivot.y, -placement.pivot.z));
      });

      sceneState.current.batches.forEach((batch) => {
        batch.entries.forEach((entry, index) => {
          animatedMatrix.multiplyMatrices(rowDeltas[entry.placementIndex], entry.base);
          batch.mesh.setMatrixAt(index, animatedMatrix);
        });
        batch.mesh.instanceMatrix.needsUpdate = true;
      });

      sceneState.current.actors.forEach((actor) => {
        actor.mixer.update(delta);
        if (!actor.settled && actor.action.paused) {
          actor.settled = true;
          actor.headRest = actor.head?.quaternion.clone();
          actor.chestRest = actor.chest?.quaternion.clone();
        }
        if (actor.settled) {
          const headTurn = mood === "Distracted" ? 0.09 : mood === "Neutral" ? 0.045 : 0.03;
          const headSway = Math.sin(elapsed * 0.34 + actor.seed) * headTurn;
          const headNod = Math.sin(elapsed * 0.58 + actor.seed * 1.7) * (mood === "Supportive" ? 0.022 : 0.012);
          const breath = Math.sin(elapsed * 0.72 + actor.seed) * 0.004;
          if (actor.head && actor.headRest) {
            actorEuler.set(headNod, headSway, 0, "XYZ");
            actorHeadOffset.setFromEuler(actorEuler);
            actor.head.quaternion.copy(actor.headRest).multiply(actorHeadOffset);
          }
          if (actor.chest && actor.chestRest) {
            actorEuler.set(breath, 0, 0, "XYZ");
            actorChestOffset.setFromEuler(actorEuler);
            actor.chest.quaternion.copy(actor.chestRest).multiply(actorChestOffset);
          }
        }
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
      disposed = true;
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      renderer.setAnimationLoop(null);

      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();

      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        objectMaterials.forEach((material) => {
          materials.add(material);
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) textures.add(value);
          });
        });
      });

      geometries.forEach((geometry) => {
        if (!sharedGltfGeometries.has(geometry)) geometry.dispose();
      });
      materials.forEach((material) => {
        if (!sharedGltfMaterials.has(material)) material.dispose();
      });
      textures.forEach((texture) => {
        if (!sharedGltfTextures.has(texture)) texture.dispose();
      });
      environmentTarget?.dispose();
      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }

      sceneState.current.renderer = undefined;
      sceneState.current.scene = undefined;
      sceneState.current.camera = undefined;
      sceneState.current.batches = [];
      sceneState.current.actors.forEach((actor) => actor.mixer.stopAllAction());
      sceneState.current.actors = [];
    };
  }, [audience, venue]);

  return (
    <div className="three-host" ref={host} aria-label="Realistic 3D practice venue with a seated virtual audience">
      {crowdStatus === "loading" && (
        <div className="scene-loading" role="status">
          <span className="scene-loading-orb" />
          <span>PREPARING THE ROOM</span>
        </div>
      )}
      {crowdStatus === "fallback" && (
        <div className="scene-fallback-note" role="status">Using a lightweight local audience model</div>
      )}
    </div>
  );
});
