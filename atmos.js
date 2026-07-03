/* ============================================================
 *  Devotion — Suspect X   ·   Atmosphere (three.js)
 *
 *  A living WebGL environment layer that sits BEHIND the text
 *  and character sprites. Each story beat sets a `mood`; this
 *  module cross-fades sky gradient, fog, particles, a soft
 *  light bloom, drifting math glyphs, slow gear silhouettes,
 *  and a shimmer of water toward that mood's configuration.
 * ============================================================ */

const Atmos = (() => {
  "use strict";

  /* ---- Mood table -------------------------------------------------
   * top / bot : sky gradient      fog : distance haze color
   * part      : 'snow'|'dust'|'none' + amount 0..1
   * gears/glyphs/water : 0..1 opacity of each subsystem
   * glow      : soft light bloom  {c: color, i: intensity, x, y}
   * drift     : camera parallax amplitude
   * ---------------------------------------------------------------- */
  const MOODS = {
    void:      { top:"#0b0d14", bot:"#05060a", fog:"#05060a", part:["dust",0.15], gears:0.10, glyphs:0.18, water:0, glow:{c:"#20263a",i:0.12,x:0,y:0.1}, drift:0.4 },
    gears:     { top:"#0e1018", bot:"#070810", fog:"#070810", part:["dust",0.1],  gears:0.55, glyphs:0.42, water:0, glow:{c:"#242c46",i:0.14,x:0,y:0},   drift:0.5 },
    rope:      { top:"#16181d", bot:"#0a0b0e", fog:"#0a0b0e", part:["none",0],     gears:0.14, glyphs:0.12, water:0, glow:{c:"#3a3f4a",i:0.10,x:0,y:0.2}, drift:0.15 },
    greeting:  { top:"#1c1620", bot:"#120f16", fog:"#120f16", part:["dust",0.35],  gears:0,    glyphs:0,    water:0, glow:{c:"#e8b46b",i:0.5, x:0,y:-0.15},drift:0.3 },
    afterglow: { top:"#241a20", bot:"#140f14", fog:"#140f14", part:["dust",0.3],   gears:0.08, glyphs:0.15, water:0, glow:{c:"#e0a866",i:0.35,x:-0.1,y:0},drift:0.3 },
    dawn:      { top:"#3f4760", bot:"#a9afbd", fog:"#8790a0", part:["dust",0.25],  gears:0,    glyphs:0,    water:0, glow:{c:"#e6e0cb",i:0.4, x:0.35,y:0.05},drift:0.7 },
    river_day: { top:"#2a3a44", bot:"#6b6455", fog:"#4a5a63", part:["dust",0.2],   gears:0,    glyphs:0,    water:0.55,glow:{c:"#9db4c2",i:0.18,x:0.2,y:0.3},drift:0.6 },
    river_night:{top:"#0d1420", bot:"#27394a", fog:"#12202c", part:["snow",0.5],   gears:0,    glyphs:0,    water:0.45,glow:{c:"#d8dde5",i:0.5, x:0.4,y:-0.25},drift:0.5 },
    apartment: { top:"#211e27", bot:"#14121a", fog:"#14121a", part:["dust",0.28],  gears:0.06, glyphs:0.22, water:0, glow:{c:"#e8b46b",i:0.4, x:-0.32,y:0},drift:0.35 },
    nextdoor:  { top:"#2c2229", bot:"#1a1319", fog:"#1a1319", part:["dust",0.18],  gears:0,    glyphs:0,    water:0, glow:{c:"#d9995f",i:0.4, x:0,y:0},     drift:0.2 },
    bento:     { top:"#3a2f22", bot:"#241a10", fog:"#2a2015", part:["dust",0.35],  gears:0,    glyphs:0,    water:0, glow:{c:"#f0c070",i:0.45,x:-0.05,y:-0.1},drift:0.4 },
    school:    { top:"#3a3830", bot:"#241f18", fog:"#2c281f", part:["dust",0.5],   gears:0,    glyphs:0.10, water:0, glow:{c:"#d9b878",i:0.4, x:-0.4,y:0.05},drift:0.4 },
    lab:       { top:"#222932", bot:"#141920", fog:"#161c24", part:["dust",0.12],  gears:0,    glyphs:0.14, water:0, glow:{c:"#c8d4de",i:0.2, x:0,y:0.35}, drift:0.4 },
    police:    { top:"#282b33", bot:"#181a20", fog:"#1a1d24", part:["dust",0.1],   gears:0,    glyphs:0,    water:0, glow:{c:"#aab6c2",i:0.18,x:0.1,y:0.3}, drift:0.35 },
    interrogation:{top:"#101114",bot:"#050506",fog:"#050506", part:["none",0],     gears:0,    glyphs:0.08, water:0, glow:{c:"#efe4b4",i:0.55,x:0,y:0.35}, drift:0.12 },
    cinema:    { top:"#0d0a12", bot:"#060409", fog:"#060409", part:["dust",0.3],   gears:0,    glyphs:0,    water:0, glow:{c:"#cfd6e8",i:0.55,x:0,y:0.2},  drift:0.3 },
    snowroad:  { top:"#9aa6b6", bot:"#6f7a8a", fog:"#8894a4", part:["snow",0.85],  gears:0,    glyphs:0,    water:0, glow:{c:"#eef2e0",i:0.35,x:-0.42,y:0.1},drift:0.5 },
  };

  let renderer, scene, camera, clock;
  let skyMat, glowSprite, water, gearGroup, glyphGroup;
  let snow, dust;
  const parts = {};              // name -> {points, velocities, mat}
  let W = 1, H = 1, raf = 0;

  // current (cur) and target (tgt) interpolated values
  const cur = mkVals(MOODS.void);
  const tgt = mkVals(MOODS.void);

  // Abstract moods have no photo, so the three.js gradient sky is shown.
  // Photographic moods hide the sky (sky:0) so the real scene shows through.
  const ABSTRACT = new Set(["void", "gears", "rope", "greeting", "afterglow"]);

  function mkVals(m) {
    return {
      top: new THREE.Color(m.top), bot: new THREE.Color(m.bot),
      fog: new THREE.Color(m.fog),
      snow: m.part[0] === "snow" ? m.part[1] : 0,
      dust: m.part[0] === "dust" ? m.part[1] : 0,
      gears: m.gears, glyphs: m.glyphs, water: m.water,
      glowC: new THREE.Color(m.glow.c), glowI: m.glow.i,
      glowX: m.glow.x, glowY: m.glow.y, drift: m.drift, sky: 1,
    };
  }

  /* ---- textures generated on a canvas ---------------------------- */
  function discTex() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, "rgba(255,255,255,1)");
    rg.addColorStop(0.5, "rgba(255,255,255,0.6)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  }
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

  /* ---- particle system builder ----------------------------------- */
  function makeParticles(count, box, size, tex, color) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random()*2-1) * box.x;
      pos[i*3+1] = (Math.random()*2-1) * box.y;
      pos[i*3+2] = (Math.random()*2-1) * box.z - 8;
      vel[i*3]   = (Math.random()*2-1);
      vel[i*3+1] = Math.random();
      vel[i*3+2] = 0;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size, map: tex, color: new THREE.Color(color),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.NormalBlending, sizeAttenuation: true,
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
          gl_FragColor = vec4(col, a);
        }`,
    });
    const geo = new THREE.PlaneGeometry(80, 22);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, -14, -12);
    return m;
  }

  /* ---- init ------------------------------------------------------ */
  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);          // transparent: photo shows behind
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(cur.fog.getHex(), 20, 90);
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.set(0, 0, 16);
    clock = new THREE.Clock();

    // gradient sky (large inverted sphere)
    skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, transparent: true,
      uniforms: { uTop: { value: cur.top.clone() }, uBot: { value: cur.bot.clone() }, uOpacity: { value: 1 } },
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        varying vec3 vP; uniform vec3 uTop,uBot; uniform float uOpacity;
        void main(){ float h = normalize(vP).y*0.5+0.5; gl_FragColor=vec4(mix(uBot,uTop,pow(h,0.9)), uOpacity);}`,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat));

    // light bloom sprite
    const gm = new THREE.SpriteMaterial({ map: glowTex(), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffffff });
    glowSprite = new THREE.Sprite(gm);
    glowSprite.scale.set(60, 60, 1);
    glowSprite.position.set(0, 0, -20);
    scene.add(glowSprite);

    // water
    water = makeWater(); scene.add(water);

    // particles
    const disc = discTex();
    snow = makeParticles(1400, { x: 34, y: 22, z: 30 }, 0.9, disc, "#ffffff");
    dust = makeParticles(900,  { x: 30, y: 18, z: 24 }, 0.5, disc, "#d8cdb4");
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
    const texCache = syms.map(glyphTex);
    for (let i = 0; i < 26; i++) {
      const t = texCache[i % texCache.length];
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

    resize();
    window.addEventListener("resize", resize);
    loop();
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  }

  /* ---- set mood (defines new targets) ---------------------------- */
  function setMood(name) {
    const m = MOODS[name] || MOODS.void;
    const v = mkVals(m);
    v.sky = ABSTRACT.has(name) ? 1 : 0;    // hide gradient when a photo backs the scene
    Object.assign(tgt, v);
  }

  /* ---- per-frame interpolation & animation ----------------------- */
  const TAU = Math.PI * 2;
  function lerpC(a, b, t) { a.lerp(b, t); }

  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const k = 1 - Math.pow(0.0015, dt);   // smoothing toward target

    lerpC(cur.top, tgt.top, k); lerpC(cur.bot, tgt.bot, k); lerpC(cur.fog, tgt.fog, k);
    lerpC(cur.glowC, tgt.glowC, k);
    cur.snow += (tgt.snow - cur.snow) * k;
    cur.dust += (tgt.dust - cur.dust) * k;
    cur.gears += (tgt.gears - cur.gears) * k;
    cur.glyphs += (tgt.glyphs - cur.glyphs) * k;
    cur.water += (tgt.water - cur.water) * k;
    cur.glowI += (tgt.glowI - cur.glowI) * k;
    cur.glowX += (tgt.glowX - cur.glowX) * k;
    cur.glowY += (tgt.glowY - cur.glowY) * k;
    cur.drift += (tgt.drift - cur.drift) * k;
    cur.sky += (tgt.sky - cur.sky) * k;

    // sky + fog
    skyMat.uniforms.uTop.value.copy(cur.top);
    skyMat.uniforms.uBot.value.copy(cur.bot);
    skyMat.uniforms.uOpacity.value = cur.sky;
    scene.fog.color.copy(cur.fog);

    // glow bloom
    glowSprite.material.color.copy(cur.glowC);
    glowSprite.material.opacity = cur.glowI;
    glowSprite.position.x = cur.glowX * 34;
    glowSprite.position.y = cur.glowY * 24;

    // water
    water.material.uniforms.uTime.value = t;
    water.material.uniforms.uOpacity.value = cur.water;
    water.material.uniforms.uTop.value.copy(cur.top).lerp(new THREE.Color("#ffffff"), 0.15);
    water.material.uniforms.uBot.value.copy(cur.bot);

    // particles
    animateParticles(snow, cur.snow, dt, 7.5, 1.4);
    animateParticles(dust, cur.dust, dt, 0.5, 0.7);

    // gears
    gearGroup.children.forEach((g) => {
      g.rotation.z += g.userData.spd * dt;
      g.material.opacity = cur.gears;
    });

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

    renderer.render(scene, camera);
  }

  function animateParticles(sys, opacity, dt, fall, sway) {
    sys.mat.opacity = opacity;
    if (opacity < 0.01) return;
    const p = sys.points.geometry.attributes.position.array;
    const v = sys.vel, b = sys.box, t = clock.elapsedTime;
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
