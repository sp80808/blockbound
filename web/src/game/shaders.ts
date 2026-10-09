import * as THREE from 'three';

/**
 * Lightweight helper creating a typed ShaderMaterial class with direct
 * property getters/setters for uniforms. Avoids bundling external CJS bridges
 * during headless testing.
 */
function createShaderMaterial<T extends Record<string, any>>(
  defaultUniforms: T,
  vertexShader: string,
  fragmentShader: string
) {
  return class extends THREE.ShaderMaterial {
    constructor(parameters: Partial<T> = {}) {
      const uniforms: Record<string, { value: any }> = {};
      for (const [key, val] of Object.entries(defaultUniforms)) {
        uniforms[key] = { value: val instanceof THREE.Color ? val.clone() : val };
      }
      super({
        vertexShader,
        fragmentShader,
        uniforms
      });

      for (const key of Object.keys(defaultUniforms)) {
        Object.defineProperty(this, key, {
          get: () => this.uniforms[key].value,
          set: (v) => {
            this.uniforms[key].value = v;
          }
        });
      }

      for (const [key, val] of Object.entries(parameters)) {
        if (key in this.uniforms) {
          this.uniforms[key].value = val;
        }
      }
    }
  } as unknown as {
    new (parameters?: Partial<T>): THREE.ShaderMaterial & T;
  };
}

/**
 * Procedural District Ground Shader.
 * Replaces flat ground meshes with dynamic district-specific terrain:
 * - Suburb: stylized lawn wind shimmer and dapple striping
 * - Harbour: animated caustic water ripples and shoreline foam
 * - Neon: retro cyber-grid luminescence with pulsing coordinates
 */
export const DistrictGroundMaterial = createShaderMaterial(
  {
    uTime: 0,
    uBaseColor: new THREE.Color('#388258'),
    uAccentColor: new THREE.Color('#4ea873'),
    uDistrict: 0,
    uReducedMotion: 0
  },
  /* glsl vertex */ `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform float uDistrict;
    uniform float uReducedMotion;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;

      if (uReducedMotion < 0.5) {
        if (uDistrict < 0.5) {
          // Sunny Suburb: subtle lawn breeze ripple on the top face
          if (normal.y > 0.5) {
            pos.y += sin(pos.x * 0.9 + uTime * 1.6) * cos(pos.z * 0.9 + uTime * 1.2) * 0.015;
          }
        } else if (uDistrict < 1.5) {
          // Candy Harbour: gentle water swell
          if (normal.y > 0.5) {
            pos.y += (sin(pos.x * 1.2 + uTime * 2.2) + cos(pos.z * 1.2 + uTime * 1.8)) * 0.02;
          }
        }
      }

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  /* glsl fragment */ `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    uniform vec3 uBaseColor;
    uniform vec3 uAccentColor;
    uniform float uDistrict;
    uniform float uTime;
    uniform float uReducedMotion;

    void main() {
      vec3 color = uBaseColor;
      float t = uReducedMotion > 0.5 ? 0.0 : uTime;

      if (uDistrict < 0.5) {
        // Sunny Suburb: stylized alternating lawn striping
        float stripe = sin((vWorldPosition.x + vWorldPosition.z) * 1.8) * 0.5 + 0.5;
        color = mix(uBaseColor, uAccentColor, stripe * 0.14);
      } else if (uDistrict < 1.5) {
        // Candy Harbour: stylized water ripples with caustic rings
        float ripple1 = sin(length(vWorldPosition.xz * 0.8) * 3.5 - t * 2.0);
        float ripple2 = cos((vWorldPosition.x * 1.5 + vWorldPosition.z * 0.7) - t * 1.4);
        float ripple = smoothstep(0.35, 0.88, (ripple1 + ripple2) * 0.5);
        color = mix(uBaseColor, uAccentColor, ripple * 0.28);
      } else {
        // Neon Metropolis: retro cyber-grid line luminescence with pulsing distance glow
        vec2 grid = abs(fract(vWorldPosition.xz * 0.8 - 0.5) - 0.5);
        float line = step(0.44, max(grid.x, grid.y));
        float pulse = 0.85 + 0.25 * sin(t * 3.0 + length(vWorldPosition.xz) * 0.4);
        color = mix(uBaseColor, uAccentColor, line * 0.6 * pulse);
      }

      // Diorama half-Lambert directional lighting simulation
      vec3 lightDir = normalize(vec3(-0.45, 0.85, 0.5));
      float diff = max(dot(vNormal, lightDir), 0.0);
      float lighting = 0.76 + 0.24 * diff;
      gl_FragColor = vec4(color * lighting, 1.0);
    }
  `
);

/**
 * Procedural Dynamic Shockwave Ring Shader.
 * Generates an expanding energy ring with smooth feathering and chromatic fringe
 * when dice strike or token lands on key tiles.
 */
export const ShockwaveMaterial = createShaderMaterial(
  {
    uProgress: 0,
    uColor: new THREE.Color('#fff7c2'),
    uGlowColor: new THREE.Color('#fbbf24')
  },
  /* glsl vertex */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl fragment */ `
    varying vec2 vUv;
    uniform float uProgress;
    uniform vec3 uColor;
    uniform vec3 uGlowColor;

    void main() {
      vec2 centered = vUv - vec2(0.5);
      float dist = length(centered) * 2.0;

      float ringRadius = clamp(uProgress, 0.05, 0.95);
      float ringWidth = mix(0.18, 0.06, uProgress);

      float d = abs(dist - ringRadius);
      float ring = smoothstep(ringWidth, 0.0, d);

      float outerFringe = smoothstep(ringWidth * 0.6, 0.0, abs(dist - (ringRadius + 0.025)));
      float alpha = ring * (1.0 - uProgress) * 0.88;

      vec3 finalColor = mix(uColor, uGlowColor, ring * 0.65) + vec3(outerFringe * 0.25);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);
