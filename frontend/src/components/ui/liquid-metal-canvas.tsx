"use client";

import React, { useEffect, useRef } from "react";

interface LiquidMetalCanvasProps {
  className?: string;
}

export function LiquidMetalCanvas({ className = "" }: LiquidMetalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    // Vertex Shader Source
    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Fragment Shader Source (Raymarched Liquid Chrome / Molten Metal Blob)
    const fsSource = `
      precision highp float;
      varying vec2 vUv;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uScroll;

      // 3D Noise functions
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        i = mod289(i);
        vec4 p = permute(permute(permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));

        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      // Smooth minimum for organic blob merging
      float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
      }

      // Signed Distance Field of Liquid Chrome Object
      float map(vec3 p) {
        float time = uTime * 0.4;
        vec2 m = uMouse * 0.8;
        
        // Base liquid sphere
        vec3 p1 = p;
        p1.x -= m.x * 0.4;
        p1.y -= m.y * 0.4 + uScroll * 0.3;
        
        float d1 = length(p1) - 1.25;

        // Dynamic fluid morphing noise
        float noise = snoise(p * 1.5 + vec3(time * 0.5, time * 0.3, time * 0.4));
        d1 += noise * 0.35;

        // Secondary smaller fluid orb
        vec3 p2 = p - vec3(sin(time * 0.7) * 0.6, cos(time * 0.5) * 0.5, sin(time * 0.3) * 0.4);
        float d2 = length(p2) - 0.65;
        d2 += snoise(p2 * 2.0 - vec3(time)) * 0.2;

        return smin(d1, d2, 0.6);
      }

      // Calculate Normal
      vec3 calcNormal(vec3 p) {
        vec2 e = vec2(0.002, 0.0);
        return normalize(vec3(
          map(p + e.xyy) - map(p - e.xyy),
          map(p + e.yxy) - map(p - e.yxy),
          map(p + e.yyx) - map(p - e.yyx)
        ));
      }

      void main() {
        vec2 st = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);

        // Ray setup
        vec3 ro = vec3(0.0, 0.0, 3.2);
        vec3 rd = normalize(vec3(st, -1.5));

        float t = 0.0;
        float d = 0.0;
        for (int i = 0; i < 64; i++) {
          vec3 p = ro + rd * t;
          d = map(p);
          if (d < 0.001 || t > 8.0) break;
          t += d;
        }

        vec3 color = vec3(0.0); // Transparent / Dark background

        if (d < 0.01) {
          vec3 p = ro + rd * t;
          vec3 n = calcNormal(p);
          vec3 viewDir = normalize(-rd);

          // Studio Lighting Setup (Dark Chrome Reflective Environment)
          vec3 lightDir1 = normalize(vec3(1.5, 2.0, 2.0));
          vec3 lightDir2 = normalize(vec3(-2.0, -1.0, 1.5));
          vec3 lightDir3 = normalize(vec3(0.0, -2.5, -1.0));

          // Specular Highlights
          float spec1 = pow(max(dot(reflect(-lightDir1, n), viewDir), 0.0), 32.0);
          float spec2 = pow(max(dot(reflect(-lightDir2, n), viewDir), 0.0), 16.0);
          
          // Fresnel Reflection Edge
          float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.5);

          // Chrome Base Gradient
          vec3 chromeBase = mix(vec3(0.04, 0.04, 0.06), vec3(0.85, 0.88, 0.92), fresnel);
          
          // Environment metallic reflection lines
          float env = sin(n.x * 6.0 + n.y * 6.0 + uTime * 0.2) * 0.5 + 0.5;
          chromeBase += vec3(0.3, 0.32, 0.35) * pow(env, 3.0);

          // Silver Highlights & Dark Charcoal Shadowing
          color = chromeBase;
          color += vec3(0.95, 0.97, 1.0) * spec1 * 1.4;
          color += vec3(0.4, 0.45, 0.5) * spec2 * 0.8;
          color += vec3(0.9, 0.92, 0.95) * fresnel * 0.6;

          // Subtle ambient glow
          color = mix(color, vec3(0.06, 0.06, 0.08), 0.15);
        }

        gl_FragColor = vec4(color, d < 0.01 ? 0.95 : 0.0);
      }
    `;

    // Compile Shader Helper
    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, vsSource);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    // Quad Geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uScroll = gl.getUniformLocation(program, "uScroll");

    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let scroll = { y: 0, targetY: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = x;
      mouse.targetY = y;
    };

    const handleScroll = () => {
      scroll.targetY = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);

    let animationFrameId: number;
    const startTime = performance.now();

    const resize = () => {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }
    };

    const render = () => {
      resize();

      // Smooth lerp mouse & scroll
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;
      scroll.y += (scroll.targetY - scroll.y) * 0.05;

      const currentTime = (performance.now() - startTime) / 1000;

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, currentTime);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uScroll, scroll.y);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`relative w-full h-full min-h-[350px] sm:min-h-[450px] flex items-center justify-center overflow-hidden ${className}`}>
      {/* Background radial glow behind liquid chrome */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] via-transparent to-slate-400/[0.04] rounded-3xl pointer-events-none" />
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[500px] max-h-[500px] object-contain cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
