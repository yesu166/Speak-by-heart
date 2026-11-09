import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

type AudienceSize = "Small room" | "Seminar" | "Auditorium";
type Energy = "Supportive" | "Neutral" | "Distracted";

export type SceneHandle = {
  enterVR: () => Promise<void>;
  setAudienceMood: (mood: Energy) => void;
};

type Props = { audience: AudienceSize; energy: Energy };

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

type SceneRuntime = {
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  batches: AudienceBatch[];
  mood: Energy;
  xrSession?: XRSession;
};

const AUDIENCE_MODEL_URL =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_3KrUYE2WtgFOq6wOmniZwGJHvVm/19401a7e-7f7a-480d-9e1b-29014b4d697e.glb";

function createCarpetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  context.fillStyle = "#272e2a";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const fibers = ["#3a4038", "#202722", "#465047", "#30372f", "#596052"];
  for (let i = 0; i < 11500; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    context.globalAlpha = 0.1 + Math.random() * 0.2;
    context.strokeStyle = fibers[i % fibers.length];
    context.lineWidth = 0.5 + Math.random() * 1.2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.random() * 2.5, y + 2 + Math.random() * 3);
    context.stroke();
  }
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 13);
  texture.anisotropy = 4;
  return texture;
}

function createWalnutTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  context.fillStyle = "#563c2d";
  context.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 170; i++) {
    const x = Math.random() * 512;
    const width = 1 + Math.random() * 4;
    context.globalAlpha = 0.05 + Math.random() * 0.13;
    context.strokeStyle = i % 3 === 0 ? "#d3a17b" : "#231b16";
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(x + Math.random() * 12 - 6, 150, x + Math.random() * 12 - 6, 350, x + Math.random() * 12 - 6, 512);
    context.stroke();
  }
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.anisotropy = 4;
  return texture;
}

function createScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 760;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const background = context.createLinearGradient(0, 0, 1400, 760);
  background.addColorStop(0, "#18211c");
  background.addColorStop(0.55, "#101714");
  background.addColorStop(1, "#25251e");
  context.fillStyle = background;
  context.fillRect(0, 0, 1400, 760);

  const glow = context.createRadialGradient(1060, 180, 20, 1060, 180, 620);
  glow.addColorStop(0, "rgba(194, 164, 115, .2)");
  glow.addColorStop(1, "rgba(194, 164, 115, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 1400, 760);

  context.fillStyle = "#c5d2a2";
  context.fillRect(112, 118, 7, 476);
  context.fillStyle = "rgba(208, 216, 191, .68)";
  context.font = "600 27px Arial, sans-serif";
  context.letterSpacing = "9px";
  context.fillText("STAGEROOM  /  SPEAKING LAB", 158, 190);

  context.fillStyle = "#f0eee2";
  context.font = "600 88px Arial, sans-serif";
  context.letterSpacing = "-2px";
  context.fillText("Speak with", 158, 365);
  context.fillText("presence.", 158, 465);

  context.fillStyle = "#b6c19e";
  context.font = "400 27px Arial, sans-serif";
  context.letterSpacing = "1px";
  context.fillText("A little more confident, every time.", 162, 545);

  context.fillStyle = "rgba(223, 199, 159, .55)";
  context.fillRect(158, 604, 1080, 1);
  context.fillStyle = "rgba(223, 228, 214, .5)";
  context.font = "500 17px Arial, sans-serif";
  context.letterSpacing = "4px";
  context.fillText("PRACTICE  •  PRESENCE  •  PROGRESS", 162, 650);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addBox(
  scene: THREE.Scene,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material,
  castShadow = false,
  receiveShadow = false
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  scene.add(mesh);
  return mesh;
}

function buildRoom(scene: THREE.Scene, renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const walnutTexture = createWalnutTexture();
  const carpetTexture = createCarpetTexture();
  const screenTexture = createScreenTexture();

  const walnut = new THREE.MeshStandardMaterial({ map: walnutTexture, roughness: 0.68, metalness: 0.04 });
  const darkWalnut = new THREE.MeshStandardMaterial({ color: 0x34271f, roughness: 0.82 });
  const acoustic = new THREE.MeshStandardMaterial({ color: 0x242b27, roughness: 0.96 });
  const carpet = new THREE.MeshStandardMaterial({ map: carpetTexture, roughness: 0.98 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb28a55, metalness: 0.72, roughness: 0.32 });
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x242a26, roughness: 0.83 });
  const screenFrame = new THREE.MeshStandardMaterial({ color: 0x292d27, metalness: 0.42, roughness: 0.4 });
  const woodFloor = new THREE.MeshStandardMaterial({ map: walnutTexture, roughness: 0.48 });
  const lampGlass = new THREE.MeshStandardMaterial({ color: 0xf4d7a2, emissive: 0xd59d59, emissiveIntensity: 2.0, roughness: 0.28 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(38, 48), carpet);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.04, -3.2);
  floor.receiveShadow = true;
  scene.add(floor);

  const rearWall = addBox(scene, 19, 9, 0.65, 0, 4.45, 9.0, acoustic);
  rearWall.receiveShadow = true;

  const stageBackWall = addBox(scene, 19, 9, 0.55, 0, 4.45, -15.1, darkWalnut);
  stageBackWall.receiveShadow = true;

  for (const side of [-1, 1]) {
    addBox(scene, 0.55, 9, 26, side * 9.4, 4.4, -3.1, acoustic);

    for (let z = -13.4; z <= 6.2; z += 1.2) {
      addBox(scene, 0.18, 5.6, 0.72, side * 9.04, 4.05, z, walnut);
      addBox(scene, 0.055, 5.6, 0.045, side * 8.92, 4.05, z, brass);
    }

    for (const z of [-11.1, -6.3, -1.5, 3.3]) {
      addBox(scene, 0.12, 0.68, 0.23, side * 9.05, 4.2, z, brass);
      addBox(scene, 0.09, 0.48, 0.11, side * 8.96, 4.2, z, lampGlass);
      const wallGlow = new THREE.PointLight(0xffc983, 7, 7, 2);
      wallGlow.position.set(side * 8.45, 4.1, z);
      scene.add(wallGlow);
    }
  }

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(19, 27), new THREE.MeshStandardMaterial({ color: 0x171d19, roughness: 0.95 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 8.8, -3.3);
  scene.add(ceiling);

  for (let x = -9; x <= 9; x += 0.9) {
    addBox(scene, 0.07, 0.12, 27, x, 8.18, -3.25, darkWalnut);
  }

  for (const x of [-6.5, -3.2, 0, 3.2, 6.5]) {
    const downlight = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.08, 18), brass);
    downlight.position.set(x, 8.08, -8.1);
    scene.add(downlight);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.115, 18), lampGlass);
    glow.rotation.x = Math.PI / 2;
    glow.position.set(x, 8.025, -8.1);
    scene.add(glow);
  }

  const stage = addBox(scene, 14.2, 0.42, 4.6, 0, 0.19, -11.1, charcoal, true, true);
  stage.castShadow = true;

  const stageTop = new THREE.Mesh(new THREE.PlaneGeometry(14.0, 4.5), woodFloor);
  stageTop.rotation.x = -Math.PI / 2;
  stageTop.position.set(0, 0.405, -11.1);
  stageTop.receiveShadow = true;
  scene.add(stageTop);

  for (let z = -13.0; z <= -9.1; z += 0.42) {
    addBox(scene, 13.8, 0.012, 0.012, 0, 0.415, z, darkWalnut);
  }

  addBox(scene, 14.1, 0.055, 0.11, 0, 0.08, -8.78, brass);

  addBox(scene, 5.6, 0.18, 0.5, 0, -0.13, -8.35, charcoal, false, true);
  addBox(scene, 5.2, 0.16, 0.48, 0, -0.01, -8.12, darkWalnut, false, true);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(9.3, 5.1, 0.24), screenFrame);
  frame.position.set(0, 5.0, -14.35);
  frame.castShadow = true;
  scene.add(frame);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(9.0, 4.8),
    new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false })
  );
  screen.position.set(0, 5.0, -14.21);
  scene.add(screen);

  // A restrained lectern and microphone give the practice stage a useful focal point.
  addBox(scene, 0.78, 0.12, 0.58, -5.15, 1.08, -10.25, walnut, true);
  addBox(scene, 0.14, 1.0, 0.14, -5.15, 0.56, -10.25, darkWalnut, true);
  addBox(scene, 0.8, 0.1, 0.58, -5.15, 0.08, -10.25, darkWalnut, true);
  const microphone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.17, 12), charcoal);
  microphone.rotation.z = Math.PI / 7;
  microphone.position.set(1.55, 1.55, -10.25);
  scene.add(microphone);
  const micStand = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 1.18, 10), brass);
  micStand.position.set(1.5, 0.92, -10.25);
  scene.add(micStand);
  const micBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.045, 20), charcoal);
  micBase.position.set(1.5, 0.44, -10.25);
  scene.add(micBase);

  const stageGlow = new THREE.PointLight(0xffbf7f, 18, 13, 1.8);
  stageGlow.position.set(0, 1.9, -8.5);
  scene.add(stageGlow);

  const screenGlow = new THREE.PointLight(0x82977c, 10, 11, 2);
  screenGlow.position.set(0, 5.6, -13.6);
  scene.add(screenGlow);

  const spotlightA = new THREE.SpotLight(0xffd9ac, 150, 28, Math.PI / 7, 0.48, 1.2);
  spotlightA.position.set(-4.2, 11.5, -5.1);
  spotlightA.target.position.set(-1.2, 0.2, -10.8);
  scene.add(spotlightA, spotlightA.target);

  const spotlightB = new THREE.SpotLight(0xd5dfbb, 105, 26, Math.PI / 7, 0.55, 1.4);
  spotlightB.position.set(4.4, 10.5, -4.7);
  spotlightB.target.position.set(1.8, 0.2, -10.6);
  scene.add(spotlightB, spotlightB.target);

  const key = new THREE.DirectionalLight(0xffe0bd, 1.65);
  key.position.set(-7, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -13;
  key.shadow.camera.right = 13;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 34;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.025;
  scene.add(key);

  scene.add(new THREE.HemisphereLight(0xe5e0d2, 0x222821, 1.35));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.58;
  pmrem.dispose();

  return environment;
}

function createPlacements(audience: AudienceSize, source?: THREE.Group): Placement[] {
  const rows: Record<AudienceSize, number> = {
    "Small room": 1,
    Seminar: 4,
    Auditorium: 8
  };
  const rowCount = rows[audience];
  const columns = [-3.34, 0, 3.34];
  let normalize = new THREE.Matrix4();
  if (source) {
    source.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(source);
    const center = box.getCenter(new THREE.Vector3());
    normalize = new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z);
  }
  const faceStage = new THREE.Matrix4().makeRotationY(Math.PI);
  const placements: Placement[] = [];

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < columns.length; col++) {
      const x = columns[col];
      const y = 0.025 + row * 0.105;
      const z = -6.35 + row * 1.23;
      const matrix = new THREE.Matrix4()
        .makeTranslation(x, y, z)
        .multiply(faceStage)
        .multiply(normalize);

      placements.push({
        matrix,
        pivot: new THREE.Vector3(x, y, z),
        phase: row * 1.71 + col * 2.43
      });
    }
  }
  return placements;
}

function createAudienceBatches(
  scene: THREE.Scene,
  source: THREE.Group,
  placements: Placement[]
): AudienceBatch[] {
  source.updateMatrixWorld(true);
  const batches: AudienceBatch[] = [];

  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.geometry || !object.material || !object.visible) return;

    const sourceMesh = object as THREE.Mesh;
    const sourceInstanced = object instanceof THREE.InstancedMesh;
    const sourceCount = sourceInstanced ? object.count : 1;
    const entries: AudienceEntry[] = [];
    const target = new THREE.InstancedMesh(
      sourceMesh.geometry,
      sourceMesh.material,
      placements.length * sourceCount
    );
    target.name = "StageRoom realistic crowd batch";
    target.castShadow = true;
    target.receiveShadow = true;
    target.frustumCulled = false;
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
        entries.push({ base: base.clone(), placementIndex });
      }
    });

    target.instanceMatrix.needsUpdate = true;
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

export const Auditorium = forwardRef<SceneHandle, Props>(function Auditorium({ audience, energy }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const sceneState = useRef<SceneRuntime>({ batches: [], mood: energy });

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
    let scenePlacements = createPlacements(audience);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x171b18);
    scene.fog = new THREE.Fog(0x171b18, 23, 49);

    const camera = new THREE.PerspectiveCamera(46, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 110);
    camera.position.set(0, 5.9, 15.2);
    camera.lookAt(0, 2.35, -5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    environmentTarget = buildRoom(scene, renderer);

    sceneState.current.renderer = renderer;
    sceneState.current.scene = scene;
    sceneState.current.camera = camera;
    sceneState.current.batches = [];
    sceneState.current.mood = energy;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      AUDIENCE_MODEL_URL,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.updateMatrixWorld(true);

        const actualPlacements = createPlacements(audience, model);
        scenePlacements = actualPlacements;
        const batches = createAudienceBatches(scene, model, actualPlacements);
        sceneState.current.batches = batches;
        (scene.userData as { audienceReady?: boolean }).audienceReady = true;
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.error("StageRoom audience model failed to load:", error);
        if (!fallbackAdded) {
          addFallbackAudience(scene, scenePlacements);
          fallbackAdded = true;
        }
      }
    );

    const clock = new THREE.Clock();
    const rowDeltas = scenePlacements.map(() => new THREE.Matrix4());
    const rotationMatrix = new THREE.Matrix4();
    const inversePivotMatrix = new THREE.Matrix4();
    const animatedMatrix = new THREE.Matrix4();

    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      const mood = sceneState.current.mood;
      const amplitude = mood === "Supportive" ? 0.0045 : mood === "Neutral" ? 0.002 : 0.011;
      const yawAmplitude = mood === "Distracted" ? 0.012 : 0.003;

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

      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      environmentTarget?.dispose();
      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }

      sceneState.current.renderer = undefined;
      sceneState.current.scene = undefined;
      sceneState.current.camera = undefined;
      sceneState.current.batches = [];
    };
  }, [audience]);

  return <div className="three-host" ref={host} aria-label="Realistic 3D auditorium with a seated virtual audience" />;
});
