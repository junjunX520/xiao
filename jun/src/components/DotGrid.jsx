'use client';

import { useEffect, useRef } from 'react';

import './DotGrid.css';

const VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aMotion;
layout(location = 2) in vec2 aState;

uniform vec2 uResolution;
uniform float uSize;
uniform float uSwell;
uniform float uStretch;
uniform float uGlow;

out vec2 vLocal;
out vec2 vPoint;
out float vLength;
out float vRadius;
out float vEnergy;

void main() {
  float energy = aState.x;
  float radius = 0.5 * uSize * aState.y * (1.0 + uSwell * energy);
  float speed = length(aMotion.zw);
  float angle = speed > 0.001 ? atan(aMotion.w, aMotion.z) : 0.0;
  float axis = floor(angle / 1.5707963 + 0.5) * 1.5707963;
  angle = axis + (angle - axis) * smoothstep(8.0, 70.0, speed);
  vec2 dir = vec2(cos(angle), sin(angle));
  float halfLength = min(uSize * 2.0, speed * uStretch * 0.02);
  float pad = radius * (1.0 + uGlow * energy * 2.5) + 2.0;
  vec2 local = aCorner * vec2(halfLength + pad, pad);
  vec2 point = aMotion.xy + dir * local.x + vec2(-dir.y, dir.x) * local.y;
  vLocal = local;
  vPoint = point;
  vLength = halfLength;
  vRadius = radius;
  vEnergy = energy;
  vec2 clip = point / uResolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;

in vec2 vLocal;
in vec2 vPoint;
in float vLength;
in float vRadius;
in float vEnergy;

uniform vec2 uResolution;
uniform vec3 uBase;
uniform vec3 uActive;
uniform float uGlow;
uniform float uOpacity;
uniform float uFade;
uniform int uShape;

out vec4 outColor;

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  float d;
  if (uShape == 1) {
    float corner = vRadius * 0.3;
    vec2 q = abs(vLocal) - vec2(vLength + vRadius, vRadius) + corner;
    d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner;
  } else {
    d = length(vec2(max(abs(vLocal.x) - vLength, 0.0), vLocal.y)) - vRadius;
  }
  float aa = max(fwidth(d), 0.0001);
  float body = clamp(0.5 - d / aa, 0.0, 1.0);
  float halo = uGlow * vEnergy * 0.5 * exp(-max(d, 0.0) / max(vRadius * 1.3, 0.6));
  float alpha = body + (1.0 - body) * halo;
  vec3 color = mix(uBase, uActive, clamp(vEnergy * 1.2, 0.0, 1.0));
  float fade = 1.0;
  if (uFade > 0.0) {
    vec2 edge = min(vPoint, uResolution - vPoint) / (uFade * 0.4 * min(uResolution.x, uResolution.y));
    fade = smootherstep01(edge.x) * smootherstep01(edge.y);
  }
  alpha *= uOpacity * fade;
  outColor = vec4(color * alpha, alpha);
}
`;

const toRgb = (color) => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(
    String(color).trim(),
  );
  if (!match) return [1, 1, 1];
  const hex =
    match[1].length === 3
      ? match[1].replace(/./g, (digit) => digit + digit)
      : match[1];
  return [0, 2, 4].map(
    (index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255,
  );
};

const smootherstep = (value) => {
  const x = Math.min(1, Math.max(0, value));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

const backOut = (value) => {
  const strength = 1.9;
  const x = value - 1;
  return 1 + x * x * ((strength + 1) * x + strength);
};

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

const DotGrid = ({
  dotSize = 5,
  gap = 18,
  baseColor = '#3a3446',
  activeColor = '#ffffff',
  proximity = 140,
  strength = 1,
  bounce = 0.6,
  tension = 0.4,
  returnDuration = 0.8,
  shockRadius = 320,
  shockStrength = 5,
  swell = 0.8,
  stretch = 0.5,
  glow = 0.5,
  shape = 'circle',
  fade = 0,
  opacity = 1,
  intro = true,
  mouseInteraction = true,
  clickShock = true,
  paused = false,
  dpr,
  className = '',
  style,
}) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const settings = {
    dotSize,
    gap,
    baseColor,
    activeColor,
    proximity,
    strength,
    bounce,
    tension,
    returnDuration,
    shockRadius,
    shockStrength,
    swell,
    stretch,
    glow,
    shape,
    fade,
    opacity,
    intro,
    mouseInteraction,
    clickShock,
    paused,
    dpr,
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    if (!gl) return undefined;

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(
      program,
      compile(gl, gl.FRAGMENT_SHADER, FRAGMENT),
    );
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return undefined;
    }

    const uniforms = {};
    for (const name of [
      'uResolution',
      'uSize',
      'uSwell',
      'uStretch',
      'uGlow',
      'uBase',
      'uActive',
      'uOpacity',
      'uFade',
      'uShape',
    ]) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const cornerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 24, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const view = {
      width: 0,
      height: 0,
      left: 0,
      top: 0,
      ratio: 1,
    };
    const grid = {
      count: 0,
      cols: 1,
      rows: 1,
      cell: 1,
      centerX: 0,
      centerY: 0,
      reach: 1,
    };
    let rest = new Float32Array(0);
    let offset = new Float32Array(0);
    let velocity = new Float32Array(0);
    let force = new Float32Array(0);
    let next = new Float32Array(0);
    let wave = new Float32Array(0);
    let energy = new Float32Array(0);
    let instances = new Float32Array(0);
    const pointer = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      time: 0,
      inside: false,
      presence: 0,
    };
    const shocks = [];
    let introStart =
      settingsRef.current.intro && !reduced ? -1 : null;
    let visible = true;
    let raf = 0;
    let last = 0;

    const rebuild = () => {
      const size = settingsRef.current.dotSize;
      const spacing = settingsRef.current.gap;
      const cell = Math.max(2, size + spacing);
      const cols = Math.max(
        1,
        Math.floor((view.width + spacing) / cell),
      );
      const rows = Math.max(
        1,
        Math.floor((view.height + spacing) / cell),
      );
      const startX =
        (view.width - (cols * cell - spacing)) / 2 + size / 2;
      const startY =
        (view.height - (rows * cell - spacing)) / 2 + size / 2;
      const count = cols * rows;
      rest = new Float32Array(count * 2);
      offset = new Float32Array(count * 2);
      velocity = new Float32Array(count * 2);
      force = new Float32Array(count * 2);
      next = new Float32Array(count * 2);
      wave = new Float32Array(count * 4);
      energy = new Float32Array(count);
      instances = new Float32Array(count * 6);
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const index = (row * cols + col) * 2;
          rest[index] = startX + col * cell;
          rest[index + 1] = startY + row * cell;
        }
      }
      Object.assign(grid, {
        count,
        cols,
        rows,
        cell,
        centerX: view.width / 2,
        centerY: view.height / 2,
        reach: Math.hypot(view.width, view.height) / 2,
      });
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        instances.byteLength,
        gl.DYNAMIC_DRAW,
      );
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(
        settingsRef.current.dpr ??
          window.devicePixelRatio ??
          1,
        2,
      );
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      Object.assign(view, {
        width,
        height,
        left: rect.left,
        top: rect.top,
        ratio,
      });
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      rebuild();
      render(performance.now());
    };

    const step = (deltaTime, now) => {
      const currentSettings = settingsRef.current;
      const motion = reduced ? 0 : 1;
      const dampingRatio =
        1 -
        0.85 *
          Math.min(1, Math.max(0, currentSettings.bounce));
      const omega =
        4 /
        (dampingRatio *
          Math.max(0.2, currentSettings.returnDuration));
      const stiffness = omega * omega;
      const damping = 2 * dampingRatio * omega;
      const radius = Math.max(1, currentSettings.proximity);
      const speed = Math.hypot(pointer.vx, pointer.vy);
      const drive =
        currentSettings.mouseInteraction && pointer.inside
          ? 6500 *
            Math.tanh(speed / 900) *
            currentSettings.strength *
            motion
          : 0;
      const directionX = speed > 0.001 ? pointer.vx / speed : 0;
      const directionY = speed > 0.001 ? pointer.vy / speed : 0;
      const width = grid.cell * 1.4;
      const travel = 650;
      const activeShocks = shocks.map((shock) => {
        const front = ((now - shock.start) / 1000) * travel;
        const power = smootherstep(
          1 -
            front /
              Math.max(1, currentSettings.shockRadius),
        );
        return {
          ...shock,
          front,
          amplitude:
            power *
            currentSettings.shockStrength *
            grid.cell *
            0.24 *
            motion,
        };
      });
      const coupling =
        (Math.max(0, currentSettings.tension) * 900) ** 2 /
        (grid.cell * grid.cell);
      const viscosity = Math.sqrt(coupling) * 0.06;
      const limit =
        Math.sqrt(stiffness + 8 * coupling) +
        damping +
        8 * viscosity;
      const steps = Math.min(
        24,
        Math.max(
          1,
          Math.ceil(deltaTime / Math.min(1 / 120, 1.2 / limit)),
        ),
      );
      const stepSize = deltaTime / steps;
      for (let i = 0; i < grid.count; i += 1) {
        const index = i * 2;
        const restX = rest[index];
        const restY = rest[index + 1];
        let accelerationX = 0;
        let accelerationY = 0;
        if (drive > 0) {
          const deltaX =
            restX + offset[index] - pointer.x;
          const deltaY =
            restY + offset[index + 1] - pointer.y;
          const distance = Math.hypot(deltaX, deltaY);
          if (distance < radius) {
            const weight =
              smootherstep(1 - distance / radius) * drive;
            const normalX =
              distance > 0.001 ? deltaX / distance : 0;
            const normalY =
              distance > 0.001 ? deltaY / distance : 0;
            accelerationX +=
              weight *
              (directionX + normalX * 0.6);
            accelerationY +=
              weight *
              (directionY + normalY * 0.6);
          }
        }
        let waveX = 0;
        let waveY = 0;
        let waveVelocityX = 0;
        let waveVelocityY = 0;
        for (const shock of activeShocks) {
          if (shock.amplitude <= 0) continue;
          const deltaX = restX - shock.x;
          const deltaY = restY - shock.y;
          const distance = Math.hypot(deltaX, deltaY);
          const profilePosition =
            (distance - shock.front) / width;
          if (
            Math.abs(profilePosition) < 3 &&
            distance > 0.001
          ) {
            const normalX = deltaX / distance;
            const normalY = deltaY / distance;
            const profile = Math.exp(
              -profilePosition * profilePosition,
            );
            const push = shock.amplitude * profile;
            const rate =
              ((shock.amplitude *
                2 *
                profilePosition *
                profile) /
                width) *
              travel;
            waveX += normalX * push;
            waveY += normalY * push;
            waveVelocityX += normalX * rate;
            waveVelocityY += normalY * rate;
            accelerationX +=
              normalX * push * stiffness * 0.35;
            accelerationY +=
              normalY * push * stiffness * 0.35;
          }
        }
        force[index] = accelerationX;
        force[index + 1] = accelerationY;
        const target = i * 4;
        wave[target] = waveX;
        wave[target + 1] = waveY;
        wave[target + 2] = waveVelocityX;
        wave[target + 3] = waveVelocityY;
      }
      const { cols, rows } = grid;
      const stride = cols * 2;
      for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const index = (row * cols + col) * 2;
            let accelerationX =
              force[index] -
              stiffness * offset[index] -
              damping * velocity[index];
            let accelerationY =
              force[index + 1] -
              stiffness * offset[index + 1] -
              damping * velocity[index + 1];
            if (coupling > 0) {
              let offsetX = -4 * offset[index];
              let offsetY = -4 * offset[index + 1];
              let velocityX = -4 * velocity[index];
              let velocityY = -4 * velocity[index + 1];
              if (col > 0) {
                offsetX += offset[index - 2];
                offsetY += offset[index - 1];
                velocityX += velocity[index - 2];
                velocityY += velocity[index - 1];
              }
              if (col < cols - 1) {
                offsetX += offset[index + 2];
                offsetY += offset[index + 3];
                velocityX += velocity[index + 2];
                velocityY += velocity[index + 3];
              }
              if (row > 0) {
                offsetX += offset[index - stride];
                offsetY += offset[index - stride + 1];
                velocityX += velocity[index - stride];
                velocityY += velocity[index - stride + 1];
              }
              if (row < rows - 1) {
                offsetX += offset[index + stride];
                offsetY += offset[index + stride + 1];
                velocityX += velocity[index + stride];
                velocityY += velocity[index + stride + 1];
              }
              accelerationX +=
                coupling * offsetX + viscosity * velocityX;
              accelerationY +=
                coupling * offsetY + viscosity * velocityY;
            }
            next[index] =
              velocity[index] + accelerationX * stepSize;
            next[index + 1] =
              velocity[index + 1] +
              accelerationY * stepSize;
          }
        }
        for (let i = 0; i < offset.length; i += 1) {
          velocity[i] = next[i];
          offset[i] += velocity[i] * stepSize;
        }
      }
      for (let i = 0; i < grid.count; i += 1) {
        const index = i * 2;
        const target = i * 4;
        energy[i] = Math.min(
          1,
          (Math.hypot(
            velocity[index] + wave[target + 2],
            velocity[index + 1] + wave[target + 3],
          ) /
            380) *
            0.85 +
            (Math.hypot(
              offset[index] + wave[target],
              offset[index + 1] + wave[target + 1],
            ) /
              (grid.cell * 2.2)) *
              0.35,
        );
      }
      for (let i = shocks.length - 1; i >= 0; i -= 1) {
        if (
          activeShocks[i].front >
          currentSettings.shockRadius + width * 3
        ) {
          shocks.splice(i, 1);
        }
      }
      const decay = 1 - Math.exp(-deltaTime / 0.08);
      pointer.vx -= pointer.vx * decay;
      pointer.vy -= pointer.vy * decay;
      const presenceTarget =
        currentSettings.mouseInteraction && pointer.inside ? 1 : 0;
      pointer.presence +=
        (presenceTarget - pointer.presence) *
        (1 - Math.exp(-deltaTime / 0.2));
    };

    const render = (now) => {
      const currentSettings = settingsRef.current;
      const radius = Math.max(1, currentSettings.proximity);
      const introAge =
        introStart === null
          ? Infinity
          : introStart < 0
            ? 0
            : (now - introStart) / 1000;
      const introFront = introAge * grid.reach * 1.25;
      const introBand = grid.cell * 4;
      for (let i = 0; i < grid.count; i += 1) {
        const index = i * 2;
        const source = i * 4;
        const x =
          rest[index] + offset[index] + wave[source];
        const y =
          rest[index + 1] +
          offset[index + 1] +
          wave[source + 1];
        let glowing = energy[i];
        if (pointer.presence > 0.001) {
          const distance = Math.hypot(
            x - pointer.x,
            y - pointer.y,
          );
          if (distance < radius) {
            glowing = Math.max(
              glowing,
              smootherstep(1 - distance / radius) *
                0.4 *
                pointer.presence,
            );
          }
        }
        let scale = 1;
        if (introStart !== null) {
          const distance = Math.hypot(
            rest[index] - grid.centerX,
            rest[index + 1] - grid.centerY,
          );
          const appear = Math.min(
            1,
            Math.max(0, (introFront - distance) / introBand),
          );
          scale =
            appear >= 1 ? 1 : Math.max(0, backOut(appear));
          glowing = Math.max(
            glowing,
            Math.sin(appear * Math.PI) * 0.6,
          );
        }
        const target = i * 6;
        instances[target] = x;
        instances[target + 1] = y;
        instances[target + 2] =
          velocity[index] + wave[source + 2];
        instances[target + 3] =
          velocity[index + 1] + wave[source + 3];
        instances[target + 4] = glowing;
        instances[target + 5] = scale;
      }
      const base = toRgb(currentSettings.baseColor);
      const accent = toRgb(currentSettings.activeColor);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.uniform2f(uniforms.uResolution, view.width, view.height);
      gl.uniform1f(
        uniforms.uSize,
        Math.max(0.5, currentSettings.dotSize),
      );
      gl.uniform1f(
        uniforms.uSwell,
        reduced ? 0 : Math.max(0, currentSettings.swell),
      );
      gl.uniform1f(
        uniforms.uStretch,
        reduced ? 0 : Math.max(0, currentSettings.stretch),
      );
      gl.uniform1f(
        uniforms.uGlow,
        Math.max(0, currentSettings.glow),
      );
      gl.uniform3f(uniforms.uBase, base[0], base[1], base[2]);
      gl.uniform3f(
        uniforms.uActive,
        accent[0],
        accent[1],
        accent[2],
      );
      gl.uniform1f(
        uniforms.uOpacity,
        Math.min(1, Math.max(0, currentSettings.opacity)),
      );
      gl.uniform1f(
        uniforms.uFade,
        Math.min(1, Math.max(0, currentSettings.fade)),
      );
      gl.uniform1i(
        uniforms.uShape,
        currentSettings.shape === 'square' ? 1 : 0,
      );
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, instances);
      gl.drawArraysInstanced(
        gl.TRIANGLE_STRIP,
        0,
        4,
        grid.count,
      );
      gl.bindVertexArray(null);
    };

    const settled = (now) => {
      if (shocks.length) return false;
      if (introStart !== null) {
        if (
          introStart < 0 ||
          (now - introStart) / 1000 < 1.6
        ) {
          return false;
        }
        introStart = null;
      }
      if (Math.abs(pointer.vx) + Math.abs(pointer.vy) > 1) {
        return false;
      }
      const presenceTarget =
        settingsRef.current.mouseInteraction && pointer.inside
          ? 1
          : 0;
      if (
        Math.abs(presenceTarget - pointer.presence) > 0.002
      ) {
        return false;
      }
      for (let i = 0; i < offset.length; i += 1) {
        if (
          Math.abs(offset[i]) > 0.02 ||
          Math.abs(velocity[i]) > 0.5
        ) {
          return false;
        }
      }
      return true;
    };

    const frame = (now) => {
      raf = 0;
      if (settingsRef.current.paused || !visible) return;
      if (introStart !== null && introStart < 0) {
        introStart = now;
      }
      const deltaTime = Math.min(
        0.05,
        (now - last) / 1000 || 0,
      );
      last = now;
      step(deltaTime, now);
      render(now);
      if (!settled(now)) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (
        raf ||
        settingsRef.current.paused ||
        !visible
      ) {
        return;
      }
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const locate = (event) => {
      const rect = canvas.getBoundingClientRect();
      view.left = rect.left;
      view.top = rect.top;
      return [
        event.clientX - rect.left,
        event.clientY - rect.top,
      ];
    };

    const onMove = (event) => {
      if (!settingsRef.current.mouseInteraction) return;
      const [x, y] = locate(event);
      const inside =
        x >= 0 &&
        y >= 0 &&
        x <= view.width &&
        y <= view.height;
      const time = event.timeStamp || performance.now();
      if (inside && pointer.inside && pointer.time) {
        const elapsed =
          Math.max(4, time - pointer.time) / 1000;
        const velocityX = (x - pointer.x) / elapsed;
        const velocityY = (y - pointer.y) / elapsed;
        pointer.vx += (velocityX - pointer.vx) * 0.6;
        pointer.vy += (velocityY - pointer.vy) * 0.6;
      } else {
        pointer.vx = 0;
        pointer.vy = 0;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.time = time;
      if (inside !== pointer.inside || inside) {
        pointer.inside = inside;
        wake();
      }
    };

    const onLeave = () => {
      pointer.inside = false;
      pointer.time = 0;
      wake();
    };

    const onOut = (event) => {
      if (!event.relatedTarget) onLeave();
    };

    const onDown = (event) => {
      if (!settingsRef.current.clickShock || reduced) return;
      const [x, y] = locate(event);
      if (
        x < 0 ||
        y < 0 ||
        x > view.width ||
        y > view.height
      ) {
        return;
      }
      shocks.push({ x, y, start: performance.now() });
      if (shocks.length > 6) shocks.shift();
      wake();
    };

    window.addEventListener('pointermove', onMove, {
      passive: true,
    });
    window.addEventListener('pointerdown', onDown, {
      passive: true,
    });
    window.addEventListener('pointerout', onOut);
    window.addEventListener('blur', onLeave);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      wake();
    });
    resizeObserver.observe(canvas);

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
      },
    );
    visibilityObserver.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else {
        wake();
      }
    };
    document.addEventListener(
      'visibilitychange',
      onVisibility,
    );

    resize();
    wake();

    engineRef.current = {
      rebuild: () => {
        rebuild();
        render(performance.now());
        wake();
      },
      refresh: () => {
        render(performance.now());
        wake();
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener(
        'visibilitychange',
        onVisibility,
      );
      gl.deleteBuffer(cornerBuffer);
      gl.deleteBuffer(instanceBuffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.rebuild();
  }, [dotSize, gap]);

  useEffect(() => {
    engineRef.current?.refresh();
  }, [
    baseColor,
    activeColor,
    swell,
    stretch,
    glow,
    shape,
    fade,
    opacity,
    paused,
    proximity,
    mouseInteraction,
  ]);

  return (
    <div
      className={`dot-grid ${className}`.trim()}
      style={style}
    >
      <canvas ref={canvasRef} className="dot-grid__canvas" />
    </div>
  );
};

export default DotGrid;
