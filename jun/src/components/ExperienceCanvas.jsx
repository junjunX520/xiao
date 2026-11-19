import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  getSceneForProgress,
  mapRange,
  normaliseProjects,
} from '../lib/story.js';
import { getIntroSceneState } from '../lib/intro.js';
import {
  advanceParticleDisturbance,
  advanceTitleRevealPulse,
  createHelixField,
  fitProjectPlane,
  getBeaconRingRotation,
  getCoreRotation,
  getGlassXShapePoints,
  getHelixMotion,
  getPointerSensitivity,
  particleBudget,
  qualityForFrameRate,
} from '../lib/webgl.js';
import { WORK_TITLE_REVEAL_EVENT } from '../lib/titleReveal.js';

const particleVertexShader = `
  precision highp float;

  attribute float aSize;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aStrand;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uDisturbance;
  uniform float uTitlePulse;
  uniform float uIntroReveal;
  uniform vec2 uPointer;
  uniform mat4 uOuterInverse;
  uniform mat4 uMiddleInverse;
  uniform mat4 uInnerInverse;
  uniform mat4 uXInverse;
  uniform vec3 uBeaconCenter;
  uniform float uCollisionStrength;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vImpact;
  varying float vTitleWave;

  const float TAU = 6.283185307179586;

  float segmentDistance(vec2 point, vec2 start, vec2 end) {
    vec2 segment = end - start;
    float amount = clamp(
      dot(point - start, segment) / max(dot(segment, segment), 0.0001),
      0.0,
      1.0
    );
    return length(point - (start + segment * amount));
  }

  float ringField(
    vec3 worldPosition,
    mat4 inverseMatrix,
    float radius,
    float tube,
    float softness
  ) {
    vec3 local = (inverseMatrix * vec4(worldPosition, 1.0)).xyz;
    float distanceToRing = length(vec2(length(local.xy) - radius, local.z));
    return 1.0 - smoothstep(tube, tube + softness, distanceToRing);
  }

  float xField(vec3 worldPosition, mat4 inverseMatrix) {
    vec3 local = (inverseMatrix * vec4(worldPosition, 1.0)).xyz;
    float depth = 1.0 - smoothstep(0.22, 0.48, abs(local.z));
    float firstArm = segmentDistance(
      local.xy,
      vec2(-0.76, 0.92),
      vec2(0.56, -0.92)
    );
    float secondArm = segmentDistance(
      local.xy,
      vec2(0.76, 0.92),
      vec2(-0.56, -0.92)
    );
    float distanceToStroke = min(firstArm, secondArm);
    return depth * (1.0 - smoothstep(0.22, 0.54, distanceToStroke));
  }

  void main() {
    vec3 p = position * mix(0.045, 1.0, uIntroReveal);
    float heightMix = clamp((p.y + 6.15) / 12.3, 0.0, 1.0);
    float drift = sin(uTime * (0.16 + aSpeed * 0.19) + aPhase) * 0.035;
    p.y += drift;

    vec2 pointerDelta = p.xy - uPointer;
    float pointerField = exp(-dot(pointerDelta, pointerDelta) * 0.8);
    vec3 scatterDirection = vec3(
      sin(aPhase * 2.17),
      cos(aPhase * 1.63),
      sin(aPhase * 0.91 + 1.7)
    );
    p += scatterDirection * pointerField * uDisturbance * (0.3 + aSize * 0.16);
    p.y += sin(uTime * 0.9 + aPhase * 3.0) * pointerField * uDisturbance * 0.16;

    float revealFront = (1.0 - uTitlePulse) * 5.8;
    float revealDistance = length(p.xy - vec2(-0.9, 0.35));
    float revealWave =
      exp(-pow((revealDistance - revealFront) * 1.35, 2.0)) *
      pow(uTitlePulse, 0.55);
    p += scatterDirection * revealWave * (0.42 + aSize * 0.11);
    p.y += sin(aPhase * 2.4 + uTime * 1.3) * revealWave * 0.09;
    vTitleWave = revealWave;

    vec3 hotPink = vec3(1.0, 0.18, 0.48);
    vec3 rose = vec3(1.0, 0.38, 0.61);
    vec3 blush = vec3(1.0, 0.68, 0.79);
    vec3 pearl = vec3(1.0, 0.92, 0.96);
    vec3 coral = vec3(1.0, 0.5, 0.42);
    float colorSelector = fract(
      aPhase * 0.173 +
      aSpeed * 0.13 +
      aStrand * 0.11 +
      heightMix * 0.23
    );
    vec3 base = mix(hotPink, rose, smoothstep(0.1, 0.9, heightMix));
    base = mix(base, blush, 0.28);
    if (colorSelector > 0.88) {
      base = pearl;
    } else if (colorSelector > 0.78) {
      base = coral;
    }

    vColor = base;
    vAlpha =
      mix(0.7, 0.98, clamp(aSize / 3.3, 0.0, 1.0)) *
      mix(0.08, 1.0, uIntroReveal);

    vec3 worldPosition = (modelMatrix * vec4(p, 1.0)).xyz;
    float outerImpact = ringField(
      worldPosition,
      uOuterInverse,
      1.82,
      0.075,
      0.52
    );
    float middleImpact = ringField(
      worldPosition,
      uMiddleInverse,
      1.35,
      0.035,
      0.46
    );
    float innerImpact = ringField(
      worldPosition,
      uInnerInverse,
      0.92,
      0.018,
      0.4
    );
    float coreImpact = xField(worldPosition, uXInverse);
    vImpact = max(
      coreImpact,
      max(outerImpact, max(middleImpact, innerImpact))
    );

    vec3 collisionDirection = normalize(
      worldPosition - uBeaconCenter + vec3(0.0001)
    );
    vec3 localCollisionDirection = normalize(
      transpose(mat3(modelMatrix)) * collisionDirection
    );
    p +=
      scatterDirection * vImpact * uCollisionStrength * (0.32 + aSize * 0.08) +
      localCollisionDirection * vImpact * uCollisionStrength * (0.55 + aSize * 0.15);
    vColor = mix(vColor, pearl, vImpact * 0.42);
    vColor = mix(vColor, vec3(1.0, 0.74, 0.9), vTitleWave * 0.72);
    vAlpha = min(1.0, vAlpha + vImpact * 0.12);
    vAlpha = min(1.0, vAlpha + vTitleWave * 0.24);

    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = max(
      1.0,
      aSize *
      uPixelRatio *
      mix(0.28, 1.0, uIntroReveal) *
      (11.5 / max(1.0, -viewPosition.z))
    );
  }
`;

const particleFragmentShader = `
  precision highp float;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vImpact;
  varying float vTitleWave;

  void main() {
    vec2 point = gl_PointCoord * 2.0 - 1.0;
    float radius = length(point);
    if (radius > 1.0) discard;

    float core = 1.0 - smoothstep(0.34, 0.63, radius);
    float halo = exp(-radius * radius * 7.5) * (1.0 - radius) * 0.2;
    float alpha = (core * 0.96 + halo) * vAlpha;
    if (alpha < 0.012) discard;

    vec3 color = vColor * (0.92 + core * 0.72);
    color +=
      vec3(1.0, 0.62, 0.75) *
      vImpact *
      (core * 0.5 + halo * 1.8);
    color +=
      vec3(1.0, 0.52, 0.76) *
      vTitleWave *
      (core * 0.8 + halo * 2.2);
    gl_FragColor = vec4(color, alpha);
  }
`;

const BEACON_BASE_SCALE = 0.75;

function makeParticles(count) {
  const field = createHelixField(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(field.positions, 3),
  );
  geometry.setAttribute('aSize', new THREE.BufferAttribute(field.sizes, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(field.speeds, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(field.phases, 1));
  geometry.setAttribute(
    'aStrand',
    new THREE.BufferAttribute(Float32Array.from(field.strands), 1),
  );

  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uDisturbance: { value: 0 },
    uTitlePulse: { value: 0 },
    uIntroReveal: { value: 1 },
    uPointer: { value: new THREE.Vector2() },
    uOuterInverse: { value: new THREE.Matrix4() },
    uMiddleInverse: { value: new THREE.Matrix4() },
    uInnerInverse: { value: new THREE.Matrix4() },
    uXInverse: { value: new THREE.Matrix4() },
    uBeaconCenter: { value: new THREE.Vector3() },
    uCollisionStrength: { value: 1.7 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'particle-helix';
  points.frustumCulled = false;
  points.renderOrder = -1;

  return { points, geometry, material, uniforms, count: field.sizes.length };
}

function makeGlassGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 126);
  gradient.addColorStop(0, 'rgba(225, 250, 255, 0.95)');
  gradient.addColorStop(0.18, 'rgba(128, 220, 255, 0.4)');
  gradient.addColorStop(0.48, 'rgba(100, 170, 255, 0.12)');
  gradient.addColorStop(1, 'rgba(80, 140, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGlassEnvironmentTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const base = context.createLinearGradient(0, 0, 1024, 512);
  base.addColorStop(0, '#130d1a');
  base.addColorStop(0.45, '#d7cfe8');
  base.addColorStop(0.58, '#243944');
  base.addColorStop(1, '#050908');
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const reflections = [
    [206, 118, 180, 'rgba(255, 72, 205, 0.92)'],
    [520, 168, 140, 'rgba(255, 225, 247, 0.9)'],
    [752, 82, 110, 'rgba(127, 228, 255, 0.8)'],
    [890, 356, 150, 'rgba(255, 112, 192, 0.72)'],
    [344, 414, 120, 'rgba(255, 160, 92, 0.52)'],
  ];
  reflections.forEach(([x, y, radius, color]) => {
    const glow = context.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(0.35, color.replace(/[\d.]+\)$/, '0.22)'));
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = glow;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

function createGlassXCore(theme) {
  const glass = new THREE.Group();
  glass.name = 'glass-x-core';

  const gemMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    metalness: 0.02,
    roughness: 0.055,
    transmission: 0.58,
    thickness: 1.2,
    ior: 1.58,
    transparent: true,
    opacity: 0.68,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    envMapIntensity: 2.1,
    emissive: new THREE.Color('#ff79d4'),
    emissiveIntensity: 0.22,
    attenuationColor: new THREE.Color('#ffd8f2'),
    attenuationDistance: 2.6,
    iridescence: 0.5,
    iridescenceIOR: 1.55,
    iridescenceThicknessRange: [100, 420],
    flatShading: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const shape = new THREE.Shape();
  const points = getGlassXShapePoints();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.045,
    bevelSegments: 5,
    curveSegments: 8,
    steps: 1,
  });
  geometry.center();
  geometry.computeVertexNormals();

  const xMesh = new THREE.Mesh(geometry, gemMaterial);
  xMesh.name = 'glass-x';
  xMesh.scale.setScalar(0.92);
  glass.add(xMesh);

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color('#ffd5f1'),
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
  });
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 28),
    edgeMaterial,
  );
  xMesh.add(edges);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlassGlowTexture(),
      color: new THREE.Color('#ff73d1'),
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.scale.set(2.35, 2.35, 1);
  glow.position.z = -0.18;
  glass.add(glow);

  const light = new THREE.PointLight(0xff73d1, 3.4, 6, 2);
  light.position.set(0, 0, 0.4);
  glass.add(light);

  glass.rotation.set(0.08, 0.3, 0);
  return { core: glass, mesh: xMesh, glow };
}

function createBeacon(theme) {
  const group = new THREE.Group();
  group.name = 'beacon';

  const metal = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#7f9290'),
    metalness: 0.94,
    roughness: 0.23,
    transparent: true,
    opacity: 0.92,
  });
  const accent = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.accent),
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.82, 0.075, 20, 180),
    metal,
  );
  outerRing.scale.y = 1.34;
  outerRing.rotation.y = 0.22;
  group.add(outerRing);

  const middleRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.035, 12, 160),
    metal,
  );
  middleRing.rotation.x = Math.PI / 2.5;
  middleRing.rotation.z = -0.36;
  group.add(middleRing);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.018, 10, 150),
    accent,
  );
  innerRing.scale.y = 1.28;
  innerRing.rotation.y = -0.45;
  group.add(innerRing);

  const glassCore = createGlassXCore(theme);
  const core = glassCore.core;
  group.add(core);

  const orbitingSlices = new THREE.Group();
  for (let index = 0; index < 3; index += 1) {
    const slice = new THREE.Mesh(
      new THREE.TorusGeometry(1.15 + index * 0.18, 0.006, 4, 120),
      accent.clone(),
    );
    slice.material.opacity = 0.15 + index * 0.06;
    slice.rotation.x = Math.PI / 2 + index * 0.22;
    slice.rotation.z = index * 0.5;
    orbitingSlices.add(slice);
  }
  group.add(orbitingSlices);

  return {
    group,
    outerRing,
    middleRing,
    innerRing,
    core,
    xMesh: glassCore.mesh,
    coreGlow: glassCore.glow,
    orbitingSlices,
  };
}

function makeColorTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(300, 120, 12, 260, 160, 330);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.35, '#0e2d29');
  gradient.addColorStop(1, '#020604');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return new THREE.CanvasTexture(canvas);
}

function createProjectPlanes(projects, textureLoader) {
  const group = new THREE.Group();
  const planes = projects.slice(0, 4).map((project, index) => {
    const fallbackTexture = makeColorTexture(project.accent || '#76e6ff');
    const fallbackSize = fitProjectPlane(
      fallbackTexture.image?.width,
      fallbackTexture.image?.height,
    );
    const geometry = new THREE.PlaneGeometry(
      fallbackSize.width,
      fallbackSize.height,
      24,
      16,
    );
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(1.35, 0.3 - index * 0.35, -0.7 - index * 0.35);
    mesh.rotation.set(-0.08, -0.33 - index * 0.04, 0.03);
    mesh.userData.fallbackTexture = fallbackTexture;
    material.map = fallbackTexture;
    group.add(mesh);

    if (project.image) {
      textureLoader.load(
        project.image,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          const image = texture.image;
          const fitted = fitProjectPlane(
            image?.naturalWidth ?? image?.width,
            image?.naturalHeight ?? image?.height,
          );
          if (mesh.geometry) mesh.geometry.dispose();
          mesh.geometry = new THREE.PlaneGeometry(
            fitted.width,
            fitted.height,
            24,
            16,
          );
          if (mesh.material) mesh.material.map = texture;
          mesh.userData.loadedTexture = texture;
        },
        undefined,
        () => {
          // The generated accent texture keeps the composition intact.
        },
      );
    }

    return mesh;
  });

  return { group, planes };
}

export default function ExperienceCanvas({
  config,
  progress,
  activeProjectIndex,
  reducedMotion,
  introActive = false,
  introDuration = 3600,
  introStartedAt = 0,
}) {
  const containerRef = useRef(null);
  const progressRef = useRef(progress);
  const activeProjectRef = useRef(activeProjectIndex);
  const reducedMotionRef = useRef(reducedMotion);
  const introActiveRef = useRef(introActive);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    activeProjectRef.current = activeProjectIndex;
  }, [activeProjectIndex]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    introActiveRef.current = introActive;
  }, [introActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !window.matchMedia('(pointer: coarse)').matches,
        powerPreference: 'high-performance',
      });
    } catch {
      setFailed(true);
      return undefined;
    }

    const mobile = window.matchMedia('(pointer: coarse)').matches;
    const scene = new THREE.Scene();
    const environmentTexture = makeGlassEnvironmentTexture();
    scene.environment = environmentTexture;
    scene.environmentIntensity = 1.15;
    scene.fog = new THREE.FogExp2(0x020604, 0.054);
    renderer.setClearColor(0x020604, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    const initialIntroProgress = introActiveRef.current
      ? Math.min(
          1,
          Math.max(
            0,
            (performance.now() - introStartedAt) /
              Math.max(1, introDuration),
          ),
        )
      : 1;
    camera.position.set(
      0,
      0,
      getIntroSceneState(initialIntroProgress).cameraZ,
    );

    const particleField = makeParticles(
      particleBudget(window.innerWidth, window.innerHeight, mobile),
    );
    scene.add(particleField.points);

    scene.add(new THREE.AmbientLight(0x6ab7a4, 1.25));
    const keyLight = new THREE.PointLight(0x9df5ff, 15, 20, 2);
    keyLight.position.set(-3.5, 3.8, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xd5ff64, 8, 18, 2);
    rimLight.position.set(4, -2.4, 2);
    scene.add(rimLight);

    const beacon = createBeacon(config.theme);
    scene.add(beacon.group);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    const projectPlanes = createProjectPlanes(
      normaliseProjects(config.projects),
      textureLoader,
    );
    scene.add(projectPlanes.group);

    const pointerTarget = { x: 0, y: 0 };
    let lastPointerMove = -Infinity;
    const handlePointerMove = (event) => {
      pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = -((event.clientY / window.innerHeight) * 2 - 1);
      lastPointerMove = performance.now();
    };
    const handleTitleReveal = () => {
      if (!reducedMotionRef.current) titlePulse = 1;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener(WORK_TITLE_REVEAL_EVENT, handleTitleReveal);

    let qualityPixelRatio = null;
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const preferredPixelRatio =
        qualityPixelRatio ?? (window.devicePixelRatio || 1);
      const pixelRatio = Math.min(
        preferredPixelRatio,
        qualityPixelRatio ?? (mobile ? 1.5 : 1.75),
      );
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      particleField.uniforms.uPixelRatio.value = pixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    let frameId;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let introProgress = initialIntroProgress;
    let visible = !document.hidden;
    let disturbance = 0;
    let titlePulse = 0;
    let qualitySampleStart = performance.now();
    let qualitySampleFrames = 0;
    let qualityChecked = false;
    const cameraTarget = new THREE.Vector3();
    const beaconWorldPosition = new THREE.Vector3();

    const handleVisibility = () => {
      visible = !document.hidden;
      if (visible) {
        lastTime = performance.now();
        frameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const render = (time) => {
      if (disposed || !visible) return;
      frameId = requestAnimationFrame(render);

      const rawDelta = Math.max(0, time - lastTime);
      lastTime = time;
      const delta = Math.min(48, rawDelta);
      elapsed += delta / 1000;

      const scroll = progressRef.current;
      const motion = reducedMotionRef.current ? 0.12 : 1;
      if (introActiveRef.current) {
        introProgress = Math.min(
          1,
          Math.max(
            0,
            (performance.now() - introStartedAt) /
              Math.max(1, introDuration),
          ),
        );
      } else {
        introProgress = 1;
      }
      const introState = getIntroSceneState(introProgress);
      particleField.uniforms.uIntroReveal.value = introState.particles;
      particleField.uniforms.uCollisionStrength.value =
        1.7 * introState.core;
      const pointerSensitivity = getPointerSensitivity(scroll);
      const pointer = pointerRef.current;
      pointer.x += (pointerTarget.x - pointer.x) * 0.045;
      pointer.y += (pointerTarget.y - pointer.y) * 0.045;

      const pointerActive =
        !reducedMotionRef.current &&
        performance.now() - lastPointerMove < 90;
      disturbance = advanceParticleDisturbance(
        disturbance,
        pointerActive ? 1 : 0,
        delta,
      );
      const helixMotion = getHelixMotion(elapsed, scroll, motion);
      particleField.points.rotation.y = helixMotion.rotationY;
      particleField.points.rotation.z = helixMotion.rotationZ;
      particleField.points.position.y = helixMotion.positionY;
      particleField.uniforms.uTime.value = elapsed * motion;
      particleField.uniforms.uDisturbance.value = disturbance;
      titlePulse = advanceTitleRevealPulse(titlePulse, delta);
      particleField.uniforms.uTitlePulse.value = titlePulse;
      particleField.uniforms.uPointer.value.set(
        pointer.x * 4.8 * pointerSensitivity.x,
        pointer.y * 3.45 * pointerSensitivity.y,
      );
      beacon.group.rotation.y =
        elapsed * 0.075 * motion + pointer.x * 0.1 * pointerSensitivity.object;
      beacon.group.rotation.x =
        Math.sin(elapsed * 0.22) * 0.035 * motion -
        pointer.y * 0.06 * pointerSensitivity.object;
      beacon.core.rotation.y += getCoreRotation(delta, motion);
      beacon.core.rotation.x =
        0.16 + Math.sin(elapsed * 0.32) * 0.025 * motion;
      beacon.core.position.set(0, 0, 0);
      beacon.core.scale.setScalar(Math.max(0.0001, introState.core));
      beacon.coreGlow.material.opacity =
        (0.42 + Math.sin(elapsed * 1.25) * 0.1) *
        introState.core;
      const ringRotation = getBeaconRingRotation(delta, motion);
      const ringBoost = 1 + titlePulse * 2.25;
      beacon.outerRing.rotation.z += ringRotation.outer * ringBoost;
      beacon.middleRing.rotation.z += ringRotation.middle * ringBoost;
      beacon.orbitingSlices.rotation.y += ringRotation.orbiting * ringBoost;

      cameraTarget.set(
        Math.sin(scroll * Math.PI) * 1.45 +
          pointer.x * 0.11 * motion * pointerSensitivity.x,
        pointer.y * 0.08 * motion * pointerSensitivity.y +
          mapRange(scroll, 0.54, 1, 0.55, -0.35),
        introActiveRef.current
          ? introState.cameraZ
          : 7.7 - scroll * 3.1,
      );
      camera.position.lerp(cameraTarget, 0.035);
      camera.lookAt(
        Math.sin(scroll * Math.PI) * -0.36,
        mapRange(scroll, 0.48, 0.8, 0, 0.15),
        0,
      );

      const workAmount = smoothstep(0.24, 0.33, scroll) * (1 - smoothstep(0.52, 0.61, scroll));
      beacon.group.position.x = -0.5 * workAmount + Math.sin(scroll * Math.PI * 2) * 0.16;
      beacon.group.position.z = -scroll * 0.6;
      beacon.group.scale.setScalar(
        Math.max(0.0001, introState.rings) *
          BEACON_BASE_SCALE *
          (1 - smoothstep(0.6, 0.9, scroll) * 0.28),
      );
      beacon.group.position.y = Math.sin(elapsed * 0.45) * 0.05 * motion;
      beacon.group.updateMatrixWorld(true);
      beacon.group.getWorldPosition(beaconWorldPosition);
      particleField.uniforms.uBeaconCenter.value.copy(beaconWorldPosition);
      particleField.uniforms.uOuterInverse.value
        .copy(beacon.outerRing.matrixWorld)
        .invert();
      particleField.uniforms.uMiddleInverse.value
        .copy(beacon.middleRing.matrixWorld)
        .invert();
      particleField.uniforms.uInnerInverse.value
        .copy(beacon.innerRing.matrixWorld)
        .invert();
      particleField.uniforms.uXInverse.value
        .copy(beacon.xMesh.matrixWorld)
        .invert();

      projectPlanes.planes.forEach((plane, index) => {
        const active =
          getSceneForProgress(scroll) === 'work' &&
          index === activeProjectRef.current;
        const targetOpacity = active ? 0.88 : 0;
        plane.material.opacity += (targetOpacity - plane.material.opacity) * 0.09;
        const targetScale = active ? 1 : 0.84;
        plane.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.08,
        );
        plane.position.x =
          1.38 + pointer.x * 0.045 * motion * pointerSensitivity.object;
        plane.position.y =
          0.25 -
          activeProjectRef.current * 0.12 +
          pointer.y * 0.035 * motion * pointerSensitivity.object;
      });

      qualitySampleFrames += 1;
      if (!qualityChecked && performance.now() - qualitySampleStart > 2200) {
        const fps =
          (qualitySampleFrames * 1000) /
          Math.max(1, performance.now() - qualitySampleStart);
        if (fps < 40) {
          const profile = qualityForFrameRate(fps);
          qualityPixelRatio = profile.pixelRatio;
          particleField.geometry.setDrawRange(
            0,
            Math.max(1, Math.floor(particleField.count * profile.particleScale)),
          );
          resize();
        }
        qualityChecked = true;
      }

      renderer.render(scene, camera);
    };

    setFailed(false);
    frameId = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener(WORK_TITLE_REVEAL_EVENT, handleTitleReveal);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);

      scene.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => {
            material.map?.dispose();
            material.dispose();
          });
        } else if (object.material) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      environmentTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [config]);

  return (
    <div
      ref={containerRef}
      className={`experience-canvas ${failed ? 'is-fallback' : ''}`}
      aria-hidden="true"
    />
  );
}

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}
