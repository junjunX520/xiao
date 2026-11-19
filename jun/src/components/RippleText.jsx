import { useEffect, useRef, useState } from 'react';
import {
  Geometry,
  Mesh,
  Program,
  Renderer,
  RenderTarget,
  Texture,
  Triangle,
} from 'ogl';
import { getRippleTextLayout } from '../lib/rippleText.js';
import './RippleText.css';

const MAX_WAVES = 100;
const QUALITY_SCALE = { low: 0.4, medium: 0.7, high: 1 };
const START_SCALE = 1.5;
const LIFE_CONSTANT = Math.log(500);

const waveVertex = `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  attribute vec2 iOffset;
  attribute vec2 iScale;
  attribute float iOpacity;
  varying vec2 vUv;
  varying float vOpacity;

  void main() {
    vUv = uv;
    vOpacity = iOpacity;
    gl_Position = vec4(iOffset + position * iScale, 0.0, 1.0);
  }
`;

const waveFragment = `
  precision highp float;
  varying vec2 vUv;
  varying float vOpacity;
  uniform float uRings;
  const float PI = 3.141592653589793;
  const float EDGE = 0.006737947;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = dot(p, p);
    if (r > 1.0) discard;
    float brush = (exp(-r * 5.0) - EDGE) / (1.0 - EDGE);
    brush *= 0.55 + 0.45 * cos(sqrt(r) * PI * 2.0 * uRings);
    gl_FragColor = vec4(vec3(brush * vOpacity * vOpacity), 1.0);
  }
`;

const screenVertex = `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const compositeFragment = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform sampler2D uDisplacement;
  uniform vec2 uTexel;
  uniform vec3 uTint;
  uniform vec3 uHighlight;
  uniform float uStrength;
  uniform float uSwirl;
  uniform float uDispersion;
  uniform float uGlint;
  uniform float uTintAmount;
  const float TAU = 6.283185307179586;

  void main() {
    float amount = texture2D(uDisplacement, vUv).r;
    float theta = amount * uSwirl * TAU;
    vec2 push = vec2(sin(theta), cos(theta)) * amount * uStrength;
    vec2 sampleUv = vUv + push;
    vec2 safeUv = clamp(sampleUv, vec2(0.0), vec2(1.0));
    float inside =
      step(0.0, sampleUv.x) *
      step(sampleUv.x, 1.0) *
      step(0.0, sampleUv.y) *
      step(sampleUv.y, 1.0);
    vec4 texel = texture2D(uTexture, safeUv);
    float textMask =
      smoothstep(0.015, 0.2, max(texel.r, max(texel.g, texel.b))) *
      inside;
    vec3 color;
    if (uDispersion > 0.001) {
      float split = uDispersion * 0.25;
      color.r = texture2D(uTexture, clamp(vUv + push * (1.0 + split), vec2(0.0), vec2(1.0))).r;
      color.g = texel.g;
      color.b = texture2D(uTexture, clamp(vUv + push * (1.0 - split), vec2(0.0), vec2(1.0))).b;
    } else {
      color = texel.rgb;
    }

    if (uTintAmount > 0.001) {
      color = mix(color, color * uTint * 1.9, clamp(amount * 1.6, 0.0, 1.0) * uTintAmount);
    }

    if (uGlint > 0.001) {
      float ex =
        texture2D(uDisplacement, vUv + vec2(uTexel.x, 0.0)).r -
        texture2D(uDisplacement, vUv - vec2(uTexel.x, 0.0)).r;
      float ey =
        texture2D(uDisplacement, vUv + vec2(0.0, uTexel.y)).r -
        texture2D(uDisplacement, vUv - vec2(0.0, uTexel.y)).r;
      vec3 normal = normalize(vec3(-ex * 26.0, -ey * 26.0, 1.0));
      vec3 light = normalize(vec3(-0.35, 0.55, 1.0));
      float raw = pow(max(dot(normal, light), 0.0), 22.0);
      float flatSpec = pow(max(light.z, 0.0), 22.0);
      color +=
        uHighlight *
        clamp((raw - flatSpec) / max(1.0 - flatSpec, 0.0001), 0.0, 1.0) *
        uGlint *
        textMask;
    }
    gl_FragColor = vec4(color, textMask);
  }
`;

function hexToRGB(hex) {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((character) => character + character)
          .join('')
      : clean;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return [1, 1, 1];
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

function createTextCanvas(lines, width, height) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * pixelRatio));
  canvas.height = Math.max(1, Math.round(height * pixelRatio));
  const context = canvas.getContext('2d');
  const layout = getRippleTextLayout(width, height, lines.length);
  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#fff';
  context.textAlign = 'left';
  context.textBaseline = 'top';

  lines.forEach((line, index) => {
    const font = `700 ${layout.fontSize}px "Arial Narrow", "Roboto Condensed", "Bahnschrift Condensed", "Helvetica Neue", sans-serif`;
    context.font = font;
    const scale = Math.min(1, (width - 2) / context.measureText(line).width);
    context.save();
    context.translate(0, layout.startY + layout.lineHeight * index);
    context.scale(scale, 1);
    context.fillText(line, 0, 0);
    context.restore();
  });

  return canvas;
}

export default function RippleText({ lines, className = '', onReady }) {
  const mountRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const [ready, setReady] = useState(false);
  onReadyRef.current = onReady;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch {
      return undefined;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    mount.appendChild(canvas);

    const textTexture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });

    const offsets = new Float32Array(MAX_WAVES * 2);
    const scales = new Float32Array(MAX_WAVES * 2);
    const opacities = new Float32Array(MAX_WAVES);
    const waves = Array.from({ length: MAX_WAVES }, () => ({
      x: 0,
      y: 0,
      scale: START_SCALE,
      target: START_SCALE,
      size: 1,
      opacity: 0,
    }));
    let currentWave = 0;

    const geometry = new Geometry(gl, {
      position: {
        size: 2,
        data: new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      },
      uv: {
        size: 2,
        data: new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
      },
      iOffset: { instanced: 1, size: 2, data: offsets },
      iScale: { instanced: 1, size: 2, data: scales },
      iOpacity: { instanced: 1, size: 1, data: opacities },
    });

    const waveUniforms = { uRings: { value: 4.3 } };
    const waveProgram = new Program(gl, {
      vertex: waveVertex,
      fragment: waveFragment,
      uniforms: waveUniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
    });
    waveProgram.setBlendFunc(gl.ONE, gl.ONE);
    const waveMesh = new Mesh(gl, {
      geometry,
      program: waveProgram,
      frustumCulled: false,
    });

    const displacementTarget = new RenderTarget(gl, {
      width: 2,
      height: 2,
      depth: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });

    const compositeUniforms = {
      uTexture: { value: textTexture },
      uDisplacement: { value: displacementTarget.texture },
      uTexel: { value: [1, 1] },
      uTint: { value: hexToRGB('#ff9adf') },
      uHighlight: { value: hexToRGB('#ffffff') },
      uStrength: { value: 0.075 },
      uSwirl: { value: 1.1 },
      uDispersion: { value: 0.014 },
      uGlint: { value: 0.18 },
      uTintAmount: { value: 0.2 },
    };

    const compositeMesh = new Mesh(gl, {
      geometry: new Triangle(gl),
      program: new Program(gl, {
        vertex: screenVertex,
        fragment: compositeFragment,
        uniforms: compositeUniforms,
        depthTest: false,
        depthWrite: false,
      }),
    });

    let width = 1;
    let height = 1;
    let resizePending = true;

    const resize = () => {
      width = Math.max(1, mount.clientWidth);
      height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height);

      const scale = QUALITY_SCALE.medium;
      const fieldWidth = Math.max(2, Math.round(width * scale));
      const fieldHeight = Math.max(2, Math.round(height * scale));
      displacementTarget.setSize(fieldWidth, fieldHeight);
      compositeUniforms.uTexel.value = [1 / fieldWidth, 1 / fieldHeight];
      textTexture.image = createTextCanvas(lines, width, height);
    };

    const resizeObserver = new ResizeObserver(() => {
      resizePending = true;
    });
    resizeObserver.observe(mount);
    resize();

    const addWave = (x, y) => {
      const wave = waves[currentWave];
      currentWave = (currentWave + 1) % MAX_WAVES;
      wave.x = x;
      wave.y = y;
      wave.scale = START_SCALE;
      wave.target = START_SCALE * 7;
      wave.size = 135;
      wave.opacity = 1;
    };

    const localPoint = (clientX, clientY) => {
      const rect = mount.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }
      return [
        clientX - rect.left,
        rect.height - (clientY - rect.top),
      ];
    };

    let previousX = 0;
    let previousY = 0;
    const handleMove = (event) => {
      const point = localPoint(event.clientX, event.clientY);
      if (!point) return;
      if (
        Math.abs(point[0] - previousX) > 10 ||
        Math.abs(point[1] - previousY) > 10
      ) {
        addWave(point[0], point[1]);
        previousX = point[0];
        previousY = point[1];
      }
    };
    const handleDown = (event) => {
      const point = localPoint(event.clientX, event.clientY);
      if (point) addWave(point[0], point[1]);
    };
    mount.addEventListener('pointermove', handleMove, { passive: true });
    mount.addEventListener('pointerdown', handleDown, { passive: true });

    let frame = 0;
    let previousTime = 0;
    let firstFrame = true;
    const loop = (time) => {
      if (resizePending) {
        resizePending = false;
        resize();
      }
      frame = requestAnimationFrame(loop);
      const delta = previousTime
        ? Math.min(0.05, (time - previousTime) / 1000)
        : 0;
      previousTime = time;
      const growth = 1 - Math.exp(-delta * 1.05);
      const decay = Math.exp((-delta * LIFE_CONSTANT) / 2.6);

      for (let index = 0; index < MAX_WAVES; index += 1) {
        const wave = waves[index];
        if (wave.opacity <= 0) {
          opacities[index] = 0;
          continue;
        }
        wave.opacity *= decay;
        wave.scale += (wave.target - wave.scale) * growth;
        if (wave.opacity < 0.002) {
          wave.opacity = 0;
          opacities[index] = 0;
          continue;
        }
        const half = (wave.scale * wave.size) / 2;
        offsets[index * 2] = (wave.x / width) * 2 - 1;
        offsets[index * 2 + 1] = (wave.y / height) * 2 - 1;
        scales[index * 2] = (half / width) * 2;
        scales[index * 2 + 1] = (half / height) * 2;
        opacities[index] = wave.opacity;
      }

      geometry.attributes.iOffset.needsUpdate = true;
      geometry.attributes.iScale.needsUpdate = true;
      geometry.attributes.iOpacity.needsUpdate = true;
      renderer.render({
        scene: waveMesh,
        target: displacementTarget,
        clear: true,
      });
      renderer.render({ scene: compositeMesh });

      if (firstFrame) {
        firstFrame = false;
        setReady(true);
        onReadyRef.current?.();
      }
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mount.removeEventListener('pointermove', handleMove);
      mount.removeEventListener('pointerdown', handleDown);
      if (canvas.parentNode === mount) mount.removeChild(canvas);
      const extension = gl.getExtension('WEBGL_lose_context');
      if (extension) extension.loseContext();
    };
  }, [lines]);

  return (
    <div
      ref={mountRef}
      className={`ripple-text ${ready ? 'is-ready' : ''} ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
