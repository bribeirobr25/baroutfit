"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Live hero field: a domain-warped noise that drifts like dye seeping through
// cloth, in the vermilion→amber signal over near-black. Pure WebGL (one
// fullscreen shader plane), DPR-capped, paused when the tab is hidden, and fully
// static under prefers-reduced-motion. Decorative only (aria-hidden).

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uPointer;

  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0,0.0)), c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++){ v += a * noise(p); p = m * p; a *= 0.5; }
    return v;
  }
  void main(){
    vec2 uv = vUv;
    float asp = uRes.x / max(uRes.y, 1.0);
    vec2 p = (uv - 0.5); p.x *= asp;
    float t = uTime * 0.045;
    vec2 q = vec2(fbm(p * 1.5 + vec2(0.0, t)), fbm(p * 1.5 + vec2(5.2, 1.3) - t));
    float f = fbm(p * 1.8 + q * 1.6 + uPointer * 0.35 + t);

    vec3 base  = vec3(0.035, 0.034, 0.046);
    vec3 verm  = vec3(1.0, 0.353, 0.212);
    vec3 amber = vec3(1.0, 0.761, 0.294);
    vec3 col = base;
    col = mix(col, verm * 0.82, smoothstep(0.38, 0.92, f));
    col = mix(col, amber * 0.72, smoothstep(0.58, 1.04, f + 0.08 * q.x));
    col *= 0.8 + 0.46 * smoothstep(0.2, 0.8, fbm(p * 3.0 - t));
    float vig = smoothstep(1.35, 0.1, length(uv - 0.5));
    col *= mix(0.62, 1.0, vig);
    col += (hash(uv * uRes + t) - 0.5) * 0.025;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function FabricBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      return; // no WebGL — the CSS gradient under the canvas stays
    }

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x08080a, 1);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0, 0) },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    function resize() {
      const w = mount!.clientWidth || window.innerWidth;
      const h = mount!.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w * dpr, h * dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    const target = new THREE.Vector2(0, 0);
    function onPointer(e: PointerEvent) {
      target.set(
        (e.clientX / window.innerWidth - 0.5) * 2,
        (0.5 - e.clientY / window.innerHeight) * 2,
      );
    }
    if (!reduce) window.addEventListener("pointermove", onPointer, { passive: true });

    let raf = 0;
    let inView = true;
    const start = performance.now();
    function frame(now: number) {
      uniforms.uTime.value = (now - start) / 1000;
      uniforms.uPointer.value.lerp(target, 0.04);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    // Render only when the hero is on-screen AND the tab is visible (saves GPU /
    // battery once the user scrolls past — a common perf miss).
    function play() {
      if (!reduce && inView && !document.hidden && raf === 0) {
        raf = requestAnimationFrame(frame);
      }
    }
    function pause() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    if (reduce) {
      renderer.render(scene, camera); // single static frame, no loop
    } else {
      play();
    }

    function onVisibility() {
      if (document.hidden) pause();
      else play();
    }
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
        if (reduce) return;
        if (inView) play();
        else pause();
      },
      { threshold: 0 },
    );
    io.observe(mount);

    return () => {
      pause();
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      // CSS fallback gradient shows if WebGL is unavailable or before init.
      style={{
        background:
          "radial-gradient(120% 90% at 70% 10%, rgba(255,90,54,0.18), transparent 55%), radial-gradient(90% 80% at 15% 80%, rgba(255,194,75,0.12), transparent 55%), #08080a",
      }}
    />
  );
}
