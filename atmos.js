/* ============================================================
 *  Devotion — Suspect X   ·   Atmosphere (three.js r128)
 *
 *  A living WebGL environment. Each story beat sets a `mood`.
 *  Photographic scenes live INSIDE the WebGL scene as a
 *  crossfading, cover-fit, ken-burns background plane; a full
 *  EffectComposer chain (UnrealBloom → grade/vignette/grain/
 *  chromatic-aberration/scrim) is applied on top, so real light
 *  sources in the photos bloom. Abstract cold-open moods fall
 *  back to a gradient sky. Character sprites + text are DOM,
 *  layered above the canvas and unaffected by postprocessing.
 *
 *  Postprocessing technique translated from cloudai-x/threejs-skills
 *  (authored for r160+ modules) to this r128 UMD build.
 * ============================================================ */

const Atmos = (() => {
  "use strict";

  /* ---- Mood table -------------------------------------------------
   * top / bot : sky gradient      fog : distance haze color
   * part      : 'snow'|'dust'|'none' + amount 0..1
   * gears/glyphs/water : 0..1 opacity of each subsystem
   * glow      : soft light bloom  {c: color, i: intensity, x, y}
   * bloom     : UnrealBloom strength   grade : color tint of final pass
   * vig/ca/grain : vignette / chromatic aberration / film grain
   * ---------------------------------------------------------------- */
  const MOODS = {
    void:      { top:"#0b0d14", bot:"#05060a", fog:"#05060a", part:["dust",0.15], gears:0.10, glyphs:0.18, water:0, glow:{c:"#20263a",i:0.12,x:0,y:0.1}, drift:0.4, bloom:0.35, grade:"#b9c4dd", vig:1.00, ca:0.0016, grain:0.055 },
    gears:     { top:"#0e1018", bot:"#070810", fog:"#070810", part:["dust",0.1],  gears:0.55, glyphs:0.42, water:0, glow:{c:"#242c46",i:0.14,x:0,y:0},   drift:0.5, bloom:0.40, grade:"#b9c4dd", vig:0.98, ca:0.0018, grain:0.055 },
    rope:      { top:"#16181d", bot:"#0a0b0e", fog:"#0a0b0e", part:["none",0],     gears:0.14, glyphs:0.12, water:0, glow:{c:"#3a3f4a",i:0.10,x:0,y:0.2}, drift:0.15, bloom:0.30, grade:"#c2c6cc", vig:1.04, ca:0.0022, grain:0.06 },
    greeting:  { top:"#1c1620", bot:"#120f16", fog:"#120f16", part:["dust",0.35],  gears:0,    glyphs:0,    water:0, glow:{c:"#e8b46b",i:0.5, x:0,y:-0.15},drift:0.3, bloom:0.70, grade:"#f0c070", vig:0.92, ca:0.0014, grain:0.05 },
    afterglow: { top:"#241a20", bot:"#140f14", fog:"#140f14", part:["dust",0.3],   gears:0.08, glyphs:0.15, water:0, glow:{c:"#e0a866",i:0.35,x:-0.1,y:0},drift:0.3, bloom:0.55, grade:"#eab878", vig:0.94, ca:0.0016, grain:0.05 },
    dawn:      { top:"#3f4760", bot:"#a9afbd", fog:"#8790a0", part:["dust",0.25],  gears:0,    glyphs:0,    water:0, glow:{c:"#e6e0cb",i:0.4, x:0.35,y:0.05},drift:0.7, bloom:0.55, grade:"#e8e2d2", vig:0.88, ca:0.0010, grain:0.045 },
    river_day: { top:"#2a3a44", bot:"#6b6455", fog:"#4a5a63", part:["dust",0.2],   gears:0,    glyphs:0,    water:0.55,glow:{c:"#9db4c2",i:0.18,x:0.2,y:0.3},drift:0.6, bloom:0.45, grade:"#cfe0ef", vig:0.90, ca:0.0010, grain:0.045 },
    river_night:{top:"#0d1420", bot:"#27394a", fog:"#12202c", part:["snow",0.5],   gears:0,    glyphs:0,    water:0.45,glow:{c:"#d8dde5",i:0.5, x:0.4,y:-0.25},drift:0.5, bloom:0.95, grade:"#bcd0ea", vig:0.98, ca:0.0026, grain:0.06 },
    apartment: { top:"#211e27", bot:"#14121a", fog:"#14121a", part:["dust",0.28],  gears:0.06, glyphs:0.22, water:0, glow:{c:"#e8b46b",i:0.4, x:-0.32,y:0},drift:0.35, bloom:0.55, grade:"#eecf9a", vig:0.96, ca:0.0018, grain:0.055 },
    nextdoor:  { top:"#2c2229", bot:"#1a1319", fog:"#1a1319", part:["dust",0.18],  gears:0,    glyphs:0,    water:0, glow:{c:"#d9995f",i:0.4, x:0,y:0},     drift:0.2, bloom:0.65, grade:"#e6b483", vig:0.97, ca:0.0020, grain:0.055 },
    bento:     { top:"#3a2f22", bot:"#241a10", fog:"#2a2015", part:["dust",0.35],  gears:0,    glyphs:0,    water:0, glow:{c:"#f0c070",i:0.45,x:-0.05,y:-0.1},drift:0.4, bloom:0.60, grade:"#f2c877", vig:0.90, ca:0.0014, grain:0.05 },
    school:    { top:"#3a3830", bot:"#241f18", fog:"#2c281f", part:["dust",0.5],   gears:0,    glyphs:0.10, water:0, glow:{c:"#d9b878",i:0.4, x:-0.4,y:0.05},drift:0.4, bloom:0.45, grade:"#e6d2a2", vig:0.90, ca:0.0014, grain:0.05 },
    lab:       { top:"#222932", bot:"#141920", fog:"#161c24", part:["dust",0.12],  gears:0,    glyphs:0.14, water:0, glow:{c:"#c8d4de",i:0.2, x:0,y:0.35}, drift:0.4, bloom:0.45, grade:"#c8d6e6", vig:0.95, ca:0.0018, grain:0.05 },
    police:    { top:"#282b33", bot:"#181a20", fog:"#1a1d24", part:["dust",0.1],   gears:0,    glyphs:0,    water:0, glow:{c:"#aab6c2",i:0.18,x:0.1,y:0.3}, drift:0.35, bloom:0.40, grade:"#c2cede", vig:0.96, ca:0.0016, grain:0.05 },
    interrogation:{top:"#101114",bot:"#050506",fog:"#050506", part:["none",0],     gears:0,    glyphs:0.08, water:0, glow:{c:"#efe4b4",i:0.55,x:0,y:0.35}, drift:0.12, bloom:0.75, grade:"#efe8c8", vig:1.05, ca:0.0032, grain:0.065 },
    cinema:    { top:"#0d0a12", bot:"#060409", fog:"#060409", part:["dust",0.3],   gears:0,    glyphs:0,    water:0, glow:{c:"#cfd6e8",i:0.55,x:0,y:0.2},  drift:0.3, bloom:1.10, grade:"#c4cfe8", vig:1.02, ca:0.0035, grain:0.07 },
    snowroad:  { top:"#9aa6b6", bot:"#6f7a8a", fog:"#8894a4", part:["snow",0.85],  gears:0,    glyphs:0,    water:0, glow:{c:"#eef2e0",i:0.35,x:-0.42,y:0.1},drift:0.5, bloom:0.50, grade:"#e8eef0", vig:0.86, ca:0.0012, grain:0.045 },
  };

  // moods with a photographic backdrop (scenes/<mood>.jpg)
  const PHOTO = new Set(["dawn","river_day","river_night","apartment","nextdoor",
    "bento","school","lab","police","interrogation","cinema","snowroad"]);

  // Abstract moods have no photo, so the three.js gradient sky is shown.
  const ABSTRACT = new Set(["void", "gears", "rope", "greeting", "afterglow"]);

  let renderer, scene, camera, clock;
  let skyMat, skyMesh, glowSprite, water, gearGroup, glyphGroup;
  let snow, dust;
  const parts = {};              // name -> {points, vel, mat, box}
  let W = 1, H = 1, raf = 0;

  // --- postprocessing + WebGL background photo ---
  let composer = null, bloomPass = null, finalPass = null;
  let bgPlane = null, bgMat = null;
  const texCache = new Map();          // mood -> THREE.Texture
  const texLRU = [];                   // mood order, most-recent last
  const TEX_KEEP = 5;                   // residency cap (evict beyond this)
  const IMG_ASPECT = 1600 / 900;
  const PHOTO_Z = -60;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const BLOOM_SCALE = isMobile ? 0.4 : 0.5;
  const MAX_DPR = isMobile ? 1.5 : 2;
  const COMPOSER_DPR = isMobile ? 0.85 : 1.0;  // cap the post chain well below native
                                               // (photo+bloom are soft; DOM text stays crisp)
  const dpr = () => Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const cdpr = () => Math.min(dpr(), COMPOSER_DPR);
  const texLoader = new THREE.TextureLoader();
  const photoFade = { mixTarget: 0, pending: false, curMood: null };

  // no-alloc scratch colors used in loop()
  const WHITE = new THREE.Color(0xffffff);

  // fps watchdog (auto-drop bloom on sustained slow frames)
  let slowMs = 0;

  function mkVals(m) {
    return {
      top: new THREE.Color(m.top), bot: new THREE.Color(m.bot),
      fog: new THREE.Color(m.fog),
      snow: m.part[0] === "snow" ? m.part[1] : 0,
      dust: m.part[0] === "dust" ? m.part[1] : 0,
      gears: m.gears, glyphs: m.glyphs, water: m.water,
      glowC: new THREE.Color(m.glow.c), glowI: m.glow.i,
      glowX: m.glow.x, glowY: m.glow.y, drift: m.drift, sky: 1,
      bloom: m.bloom, grade: new THREE.Color(m.grade),
      vig: m.vig, ca: m.ca, grain: m.grain, usePhoto: 0,
    };
  }

  // current (cur) and target (tgt) interpolated values
  const cur = mkVals(MOODS.void);
  const tgt = mkVals(MOODS.void);

  /* ---- textures generated on a canvas ---------------------------- */
  function glowTex() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, "rgba(255,255,255,0.9)");
    rg.addColorStop(0.35, "rgba(255,255,255,0.35)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  function glyphTex(sym) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.font = "88px Georgia, 'Times New Roman', serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(sym, 64, 68);
    return new THREE.CanvasTexture(c);
  }

  /* ---- particle system builder (shader twinkle) ------------------ */
  function makeParticles(count, box, size, color, additive) {
    const geo = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    const vel   = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const psize = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random()*2-1) * box.x;
      pos[i*3+1] = (Math.random()*2-1) * box.y;
      pos[i*3+2] = -8 - Math.random() * box.z;   // strictly in front of camera (all negative)
      vel[i*3]   = (Math.random()*2-1);
      vel[i*3+1] = Math.random();
      vel[i*3+2] = 0;
      phase[i]   = Math.random() * 6.2831853;
      psize[i]   = 0.6 + Math.random() * 0.9;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aPhase",   new THREE.BufferAttribute(phase, 1));
    geo.setAttribute("aSize",    new THREE.BufferAttribute(psize, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: 0 },
        uSize:    { value: size * 26.0 },     // reference px at ref distance
        uColor:   { value: new THREE.Color(color) },
        uDpr:     { value: dpr() },
        uMax:     { value: isMobile ? 24.0 : 48.0 },
      },
      vertexShader: `
        attribute float aPhase; attribute float aSize;
        uniform float uTime, uSize, uDpr, uMax; varying float vTw;
        void main(){
          vTw = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float depth = max(-mv.z, 1.0);
          float sz = uSize * aSize * uDpr * (0.7 + 0.6 * vTw) * (30.0 / depth);
          gl_PointSize = clamp(sz, 1.0, uMax);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        precision mediump float;
        uniform float uOpacity; uniform vec3 uColor; varying float vTw;
        void main(){
          vec2 d = gl_PointCoord - 0.5;
          float m = smoothstep(0.5, 0.0, length(d));   // soft round disc
          gl_FragColor = vec4(uColor, m * uOpacity * (0.45 + 0.55 * vTw));
        }`,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return { points, vel, mat, box };
  }

  /* ---- gear silhouette ------------------------------------------- */
  function gearMesh(teeth, outer, inner, hole, depth) {
    const s = new THREE.Shape();
    const step = Math.PI * 2 / (teeth * 2);
    for (let i = 0; i < teeth * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = i * step;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
    }
    s.closePath();
    const h = new THREE.Path();
    h.absarc(0, 0, hole, 0, Math.PI * 2, true);
    s.holes.push(h);
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    geo.center();
    const mat = new THREE.MeshBasicMaterial({
      color: 0x05070c, transparent: true, opacity: 0, depthWrite: false,
    });
    mat.color.convertSRGBToLinear();   // keep gears near-black after the final gamma-out
    return new THREE.Mesh(geo, mat);
  }

  /* ---- water shimmer plane --------------------------------------- */
  function makeWater() {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uOpacity: { value: 0 },
        uTop: { value: new THREE.Color("#9db4c2") },
        uBot: { value: new THREE.Color("#16222d") },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime,uOpacity; uniform vec3 uTop,uBot;
        void main(){
          float y = vUv.y;
          float bands = sin((vUv.y*22.0) + sin(vUv.x*8.0+uTime*0.6)*1.2 - uTime*1.1);
          float shim = smoothstep(0.55,1.0,bands)*0.5;
          vec3 col = mix(uBot,uTop, y*0.8+0.1) + shim*0.18;
          float a = uOpacity * (0.35 + shim) * smoothstep(0.0,0.3,y);
          gl_FragColor = vec4(pow(max(col,0.0), vec3(2.2)), a);  // sRGB->linear
        }`,
    });
    const geo = new THREE.PlaneGeometry(80, 22);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, -14, -12);
    return m;
  }

  /* ---- WebGL background photo: crossfade + cover-fit + ken burns -- */
  function makeBgPlane() {
    bgMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, fog: false,
      uniforms: {
        uTexA: { value: null }, uTexB: { value: null },
        uHasA: { value: 0 }, uHasB: { value: 0 },
        uMix:  { value: 0 }, uUsePhoto: { value: 0 },
        uAspA: { value: new THREE.Vector2(IMG_ASPECT, 16/9) }, // (imgAspect, screenAspect)
        uAspB: { value: new THREE.Vector2(IMG_ASPECT, 16/9) },
        uKen:  { value: new THREE.Vector3(1.06, 0.0, 0.0) },   // (zoom, panX, panY)
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTexA, uTexB;
        uniform float uHasA, uHasB, uMix, uUsePhoto;
        uniform vec2 uAspA, uAspB;   // .x=imageAspect  .y=screenAspect
        uniform vec3 uKen;           // zoom, panX, panY
        vec2 cover(vec2 uv, vec2 asp){
          float ia = asp.x, sa = asp.y;
          vec2 c = uv - 0.5;
          if (sa > ia) c.y *= ia / sa;   // screen wider -> crop top/bottom
          else         c.x *= sa / ia;   // screen taller -> crop sides
          return c + 0.5;
        }
        void main(){
          vec2 kuv = (vUv - 0.5) / uKen.x + 0.5 + vec2(uKen.y, uKen.z);
          // DECODE sRGB JPG -> LINEAR so composer buffer holds true light
          vec4 a = texture2D(uTexA, cover(kuv, uAspA)); a.rgb = pow(a.rgb, vec3(2.2)); a *= uHasA;
          vec4 b = texture2D(uTexB, cover(kuv, uAspB)); b.rgb = pow(b.rgb, vec3(2.2)); b *= uHasB;
          vec4 col = mix(a, b, uMix);
          gl_FragColor = vec4(col.rgb, col.a * uUsePhoto);
        }`,
    });
    bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMat);
    bgPlane.position.set(0, 0, PHOTO_Z);
    bgPlane.renderOrder = -1000;
    bgPlane.frustumCulled = false;
    return bgPlane;
  }

  function fitBg() {
    const dist = camera.position.z - PHOTO_Z;                 // 16 - (-60) = 76
    const vH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist;
    const vW = vH * (W / H);
    bgPlane.scale.set(vW * 1.18, vH * 1.18, 1);              // 18% margin for camera drift
    const sa = W / H;
    bgMat.uniforms.uAspA.value.y = sa;
    bgMat.uniforms.uAspB.value.y = sa;
  }

  function touchLRU(mood) {
    const k = texLRU.indexOf(mood); if (k >= 0) texLRU.splice(k, 1);
    texLRU.push(mood);
    while (texLRU.length > TEX_KEEP) {
      const old = texLRU.shift();
      // never evict textures currently bound to A or B
      const t = texCache.get(old);
      if (t && t !== bgMat.uniforms.uTexA.value && t !== bgMat.uniforms.uTexB.value) {
        t.dispose(); texCache.delete(old);
      } else if (t) { texLRU.push(old); break; }
    }
  }

  function loadTex(mood, cb) {
    if (texCache.has(mood)) { touchLRU(mood); cb(texCache.get(mood)); return; }
    texLoader.load('scenes/' + mood + '.jpg', (tex) => {
      tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      // NO tex.encoding = sRGBEncoding — the bg shader decodes manually.
      if (renderer.initTexture) renderer.initTexture(tex);   // warm GPU upload off the crossfade frame
      texCache.set(mood, tex); touchLRU(mood); cb(tex);
    });
  }

  function setPhoto(mood) {
    if (!PHOTO.has(mood)) return;
    if (mood === photoFade.curMood && bgMat.uniforms.uUsePhoto.value > 0.5) return; // same scene, no-op
    loadTex(mood, (tex) => {
      const invisible = (cur.usePhoto === undefined) || cur.usePhoto < 0.05;
      if (invisible) {
        // plane hidden (cold-open / returning from abstract): HARD CUT into A
        bgMat.uniforms.uTexA.value = tex; bgMat.uniforms.uHasA.value = 1;
        bgMat.uniforms.uTexB.value = null; bgMat.uniforms.uHasB.value = 0;
        bgMat.uniforms.uMix.value = 0; photoFade.mixTarget = 0; photoFade.pending = false;
      } else {
        // plane visible (photo -> photo): if a crossfade is still in flight, force-promote it first
        if (photoFade.pending) {
          bgMat.uniforms.uTexA.value = bgMat.uniforms.uTexB.value;
          bgMat.uniforms.uHasA.value = 1;
          bgMat.uniforms.uMix.value = 0;
        }
        bgMat.uniforms.uTexB.value = tex; bgMat.uniforms.uHasB.value = 1;
        bgMat.uniforms.uMix.value = 0; photoFade.mixTarget = 1; photoFade.pending = true;
      }
      photoFade.curMood = mood;
    });
  }

  /* ---- postprocessing pipeline (r128 examples/js) ---------------- */
  function initPost() {
    if (typeof THREE.EffectComposer === "undefined" ||
        typeof THREE.UnrealBloomPass === "undefined" ||
        typeof THREE.RenderPass === "undefined" ||
        typeof THREE.ShaderPass === "undefined") { composer = null; return; }

    composer = new THREE.EffectComposer(renderer);
    composer.setPixelRatio(cdpr());
    composer.addPass(new THREE.RenderPass(scene, camera));

    bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(2, 2),   // placeholder; real size forced below after addPass
      0.6,    // strength (tweened per mood)
      0.55,   // radius
      0.80    // threshold (linear light -> only true highlights bloom)
    );
    composer.addPass(bloomPass);   // <-- this call OVERWRITES the ctor resolution

    const FinalGradeShader = {
      uniforms: {
        tDiffuse: { value: null },
        uTime:  { value: 0 },
        uRes:   { value: new THREE.Vector2(1, 1) },
        uVig:   { value: 1.0 },
        uGrain: { value: 0.055 },
        uCA:    { value: 0.0018 },
        uTint:  { value: new THREE.Color(0xffffff) },
        uSat:   { value: 0.94 },
        uLift:  { value: 0.0 },
        uScrim: { value: 0.30 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float uTime, uVig, uGrain, uCA, uSat, uLift, uScrim;
        uniform vec2 uRes; uniform vec3 uTint;
        float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          vec2 d = vUv - 0.5;
          float r = length(d);
          vec2 off = d * uCA * r;                       // chromatic aberration (edge-weighted)
          vec3 col;
          col.r = texture2D(tDiffuse, vUv + off).r;
          col.g = texture2D(tDiffuse, vUv).g;
          col.b = texture2D(tDiffuse, vUv - off).b;
          col += uLift;                                  // grade: lift
          float l = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(l), col, uSat) * uTint;         // saturation + tint
          col *= smoothstep(1.35, 0.55, r * uVig);       // WIDE vignette: edge-only, mid-frame stays ~1.0
          col *= 1.0 - uScrim * smoothstep(0.4, 0.0, vUv.y);  // BOTTOM scrim (uv origin bottom-left)
          col += (rnd(vUv * uRes + fract(uTime)) - 0.5) * uGrain;
          col = pow(max(col, 0.0), vec3(1.0/2.2));       // single sRGB gamma-out (composer RT is linear)
          gl_FragColor = vec4(col, 1.0);
        }`,
    };
    finalPass = new THREE.ShaderPass(FinalGradeShader);
    composer.addPass(finalPass);   // last pass => renderToScreen auto-true

    // FORCE bloom size in device px * scale (addPass clobbered the ctor vec2).
    const pr = cdpr();
    bloomPass.setSize(Math.max(1, Math.round(W * pr * BLOOM_SCALE)),
                      Math.max(1, Math.round(H * pr * BLOOM_SCALE)));
    finalPass.uniforms.uRes.value.set(Math.round(W * pr), Math.round(H * pr));
  }

  /* ---- init ------------------------------------------------------ */
  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: false });
    renderer.setPixelRatio(dpr());
    renderer.setClearColor(0x05060a, 1);      // OPAQUE: photo now lives in GL
    // Chain stays LINEAR; single sRGB gamma-out is in the final pass. Do NOT set outputEncoding.
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(cur.fog.getHex(), 20, 90);
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.set(0, 0, 16);
    clock = new THREE.Clock();

    // background photo plane (behind everything, inside sky sphere)
    scene.add(makeBgPlane());

    // gradient sky (large inverted sphere)
    skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, transparent: true,
      uniforms: { uTop: { value: cur.top.clone() }, uBot: { value: cur.bot.clone() }, uOpacity: { value: 1 } },
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        varying vec3 vP; uniform vec3 uTop,uBot; uniform float uOpacity;
        // decode authored sRGB gradient -> LINEAR (the final pass re-encodes once)
        void main(){ float h = normalize(vP).y*0.5+0.5; vec3 c = mix(uBot,uTop,pow(h,0.9)); gl_FragColor=vec4(pow(c, vec3(2.2)), uOpacity);}`,
    });
    skyMesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat);
    skyMesh.renderOrder = -999;               // deterministic: plane(-1000) -> sky(-999) -> rest
    scene.add(skyMesh);

    // light bloom sprite (bright additive core => bloom seed)
    const gm = new THREE.SpriteMaterial({ map: glowTex(), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffffff });
    glowSprite = new THREE.Sprite(gm);
    glowSprite.scale.set(60, 60, 1);
    glowSprite.position.set(0, 0, -20);
    scene.add(glowSprite);

    // water
    water = makeWater(); scene.add(water);

    // particles (shader twinkle): snow additive (blooms), dust normal (won't wash photo)
    snow = makeParticles(isMobile ? 700 : 1400, { x: 34, y: 22, z: 30 }, 0.9, "#ffffff", true);
    dust = makeParticles(isMobile ? 450 : 900,  { x: 30, y: 18, z: 24 }, 0.5, "#d8cdb4", false);
    scene.add(snow.points); scene.add(dust.points);
    parts.snow = snow; parts.dust = dust;

    // gears
    gearGroup = new THREE.Group();
    const g1 = gearMesh(12, 9, 6.6, 3.2, 1.2); g1.position.set(-14, 6, -34); g1.userData.spd = 0.10;
    const g2 = gearMesh(16, 13, 9.8, 5, 1.4);  g2.position.set(12, -7, -46); g2.userData.spd = -0.06;
    const g3 = gearMesh(9, 6, 4.3, 2, 1);      g3.position.set(6, 10, -28);  g3.userData.spd = 0.16;
    [g1, g2, g3].forEach((g) => gearGroup.add(g));
    scene.add(gearGroup);

    // glyphs
    glyphGroup = new THREE.Group();
    const syms = ["∑","∫","π","√","∞","≠","⊂","∂","θ","λ","≡","ℵ","∮","∇","φ","Δ"];
    const gcache = syms.map(glyphTex);
    for (let i = 0; i < 26; i++) {
      const t = gcache[i % gcache.length];
      const mat = new THREE.SpriteMaterial({ map: t, transparent: true, opacity: 0,
        depthWrite: false, color: new THREE.Color("#aac4dd") });
      const sp = new THREE.Sprite(mat);
      const sc = 0.8 + Math.random() * 1.6;
      sp.scale.set(sc, sc, 1);
      sp.position.set((Math.random()*2-1)*26, (Math.random()*2-1)*16, -6 - Math.random()*26);
      sp.userData = { drift: 0.15 + Math.random()*0.25, phase: Math.random()*6.28, baseX: sp.position.x };
      glyphGroup.add(sp);
    }
    scene.add(glyphGroup);

    initPost();
    resize();
    window.addEventListener("resize", resize);
    loop();
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    const pr = dpr();
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H);
    camera.aspect = W / H; camera.updateProjectionMatrix();

    if (composer) {
      const cpr = cdpr();
      composer.setPixelRatio(cpr);
      composer.setSize(W, H);               // composer RT = W*cpr x H*cpr
      const dw = Math.round(W * cpr), dh = Math.round(H * cpr);
      finalPass.uniforms.uRes.value.set(dw, dh);
      // LAST sizing call — bloom base mip = device px * BLOOM_SCALE / 2 (UnrealBloom halves internally)
      bloomPass.setSize(Math.max(1, Math.round(dw * BLOOM_SCALE)),
                        Math.max(1, Math.round(dh * BLOOM_SCALE)));
    }
    if (bgPlane) fitBg();
    if (snow) snow.mat.uniforms.uDpr.value = pr;
    if (dust) dust.mat.uniforms.uDpr.value = pr;
  }

  /* ---- set mood (defines new targets) ---------------------------- */
  function setMood(name) {
    const m = MOODS[name] || MOODS.void;
    const v = mkVals(m);
    v.sky = ABSTRACT.has(name) ? 1 : 0;
    v.usePhoto = PHOTO.has(name) ? 1 : 0;
    Object.assign(tgt, v);
    if (PHOTO.has(name)) setPhoto(name);
  }

  /* ---- per-frame interpolation & animation ----------------------- */
  function lerpC(a, b, t) { a.lerp(b, t); }

  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const k = 1 - Math.pow(0.0015, dt);

    lerpC(cur.top, tgt.top, k); lerpC(cur.bot, tgt.bot, k); lerpC(cur.fog, tgt.fog, k);
    lerpC(cur.glowC, tgt.glowC, k); lerpC(cur.grade, tgt.grade, k);
    cur.snow += (tgt.snow - cur.snow) * k;
    cur.dust += (tgt.dust - cur.dust) * k;
    cur.gears += (tgt.gears - cur.gears) * k;
    cur.glyphs += (tgt.glyphs - cur.glyphs) * k;
    cur.water += (tgt.water - cur.water) * k;
    cur.glowI += (tgt.glowI - cur.glowI) * k;
    cur.glowX += (tgt.glowX - cur.glowX) * k;
    cur.glowY += (tgt.glowY - cur.glowY) * k;
    cur.drift += (tgt.drift - cur.drift) * k;
    cur.sky   += (tgt.sky   - cur.sky)   * k;
    cur.bloom += (tgt.bloom - cur.bloom) * k;
    cur.vig   += (tgt.vig   - cur.vig)   * k;
    cur.ca    += (tgt.ca    - cur.ca)    * k;
    cur.grain += (tgt.grain - cur.grain) * k;
    if (cur.usePhoto === undefined) cur.usePhoto = 0;
    cur.usePhoto += ((tgt.usePhoto || 0) - cur.usePhoto) * k;

    // sky + fog (cull when fully faded to skip full-screen overdraw)
    skyMesh.visible = cur.sky > 0.01;
    skyMat.uniforms.uTop.value.copy(cur.top);
    skyMat.uniforms.uBot.value.copy(cur.bot);
    skyMat.uniforms.uOpacity.value = cur.sky;
    scene.fog.color.copy(cur.fog);

    // background photo: crossfade + promote + ken burns (cull when invisible)
    if (bgMat) {
      bgPlane.visible = cur.usePhoto > 0.01;
      bgMat.uniforms.uUsePhoto.value = cur.usePhoto;
      bgMat.uniforms.uMix.value += (photoFade.mixTarget - bgMat.uniforms.uMix.value) * (1 - Math.pow(0.02, dt));
      if (photoFade.pending && bgMat.uniforms.uMix.value > 0.985) {
        bgMat.uniforms.uTexA.value = bgMat.uniforms.uTexB.value;
        bgMat.uniforms.uHasA.value = 1;
        bgMat.uniforms.uMix.value = 0; photoFade.mixTarget = 0;
        bgMat.uniforms.uHasB.value = 0; bgMat.uniforms.uTexB.value = null;
        photoFade.pending = false;
      }
      const z = 1.05 + 0.03 * Math.sin(t * 0.05);
      bgMat.uniforms.uKen.value.set(z, Math.sin(t * 0.03) * 0.012, Math.cos(t * 0.037) * 0.009);
    }

    // glow bloom sprite
    glowSprite.material.color.copy(cur.glowC);
    glowSprite.material.opacity = cur.glowI * (0.92 + 0.08 * Math.sin(t * 7.0));
    glowSprite.position.x = cur.glowX * 34;
    glowSprite.position.y = cur.glowY * 24;

    // water (WHITE singleton -> no per-frame allocation)
    water.material.uniforms.uTime.value = t;
    water.material.uniforms.uOpacity.value = cur.water;
    water.material.uniforms.uTop.value.copy(cur.top).lerp(WHITE, 0.15);
    water.material.uniforms.uBot.value.copy(cur.bot);

    // particles (shader twinkle)
    animateParticles(snow, cur.snow, dt, 7.5, 1.4, t);
    animateParticles(dust, cur.dust, dt, 0.5, 0.7, t);

    // gears
    gearGroup.children.forEach((g) => { g.rotation.z += g.userData.spd * dt; g.material.opacity = cur.gears; });

    // glyphs
    glyphGroup.children.forEach((sp) => {
      const u = sp.userData;
      sp.position.y += u.drift * dt;
      sp.position.x = u.baseX + Math.sin(t * 0.3 + u.phase) * 1.5;
      if (sp.position.y > 18) sp.position.y = -18;
      sp.material.opacity = cur.glyphs * (0.5 + 0.5 * Math.sin(t * 0.6 + u.phase));
    });

    // camera parallax drift
    camera.position.x = Math.sin(t * 0.18) * cur.drift;
    camera.position.y = Math.cos(t * 0.13) * cur.drift * 0.5;
    camera.lookAt(0, 0, -10);

    // drive post + render
    if (composer) {
      // FPS watchdog: if frames stay slow, drop bloom (keeps grade/vignette cheap)
      if (bloomPass.enabled) {
        if (dt > 0.030) { slowMs += 1; } else { slowMs = Math.max(0, slowMs - 2); }
        if (slowMs > 90) bloomPass.enabled = false;    // ~1.5s sustained <33fps → shed bloom
      }
      bloomPass.strength = cur.bloom;
      finalPass.uniforms.uTime.value = t;
      finalPass.uniforms.uVig.value = cur.vig;
      finalPass.uniforms.uGrain.value = cur.grain;
      finalPass.uniforms.uCA.value = cur.ca;
      finalPass.uniforms.uTint.value.copy(cur.grade);
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  function animateParticles(sys, opacity, dt, fall, sway, t) {
    sys.mat.uniforms.uOpacity.value = opacity;
    sys.mat.uniforms.uTime.value = t;
    if (opacity < 0.01) return;
    const p = sys.points.geometry.attributes.position.array;
    const v = sys.vel, b = sys.box;
    for (let i = 0; i < p.length; i += 3) {
      p[i+1] -= (fall * (0.4 + v[i+1] * 0.6)) * dt;
      p[i]   += Math.sin(t * 0.5 + i) * sway * dt * v[i] * 0.2;
      if (p[i+1] < -b.y) { p[i+1] = b.y; p[i] = (Math.random()*2-1) * b.x; }
    }
    sys.points.geometry.attributes.position.needsUpdate = true;
  }

  return { init, setMood, resize };
})();

if (typeof window !== "undefined") window.Atmos = Atmos;
