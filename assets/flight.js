/* =====================================================================
   flight.js — הנחיתה אל עולם הבינה המלאכותית
   רצף קולנועי של ~17 שניות: סטרטוספירה מעל ים עננים → צלילה דרך
   העננים עם טורבולנציה → פריצה אל עיר-נתונים זוהרת בשעת זהב →
   הנמכה בין המגדלים → נחיתה על המסלול. פוסט-פרוסס משלנו
   (bloom, vignette, אברציה, גריין) על גבי הבנייה הרגילה של three.js.
   ===================================================================== */
(function () {
  'use strict';
  var T = window.THREE;
  if (!T) { return; }

  /* ---------- איכות לפי מכשיר ---------- */
  var LOW = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 4) < 4;
  var DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.0 : 1.5);
  var N = {
    stars: LOW ? 1500 : 3200,
    clouds: LOW ? 700 : 1500,
    towers: LOW ? 320 : 520,
    streams: LOW ? 320 : 720,
    nodes: LOW ? 60 : 110
  };

  T.ColorManagement.enabled = false;   // צבעים כפי שנכתבו; המיפוי הטונאלי בסוף

  var DUR = 8500;
  var canvas = document.getElementById('sky');
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true });
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = T.LinearSRGBColorSpace;
  renderer.autoClear = true;

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 9000);

  var SUN = new T.Vector3(0.42, 0.10, -0.90).normalize();
  var CLOUD_Y0 = 360, CLOUD_Y1 = 540;

  /* =====================================================================
     כיפת שמיים
     ===================================================================== */
  var skyU = {
    uTop: { value: new T.Color(0x04021a) },
    uMid: { value: new T.Color(0x1b0f55) },
    uHorizon: { value: new T.Color(0xf29a3a) },
    uSunDir: { value: SUN },
    uSunColor: { value: new T.Color(0xffd7a0) },
    uSunI: { value: 1.0 }
  };
  var sky = new T.Mesh(new T.SphereGeometry(7000, 48, 24), new T.ShaderMaterial({
    uniforms: skyU, side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vW=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: [
      'uniform vec3 uTop,uMid,uHorizon,uSunDir,uSunColor; uniform float uSunI; varying vec3 vW;',
      'void main(){',
      '  vec3 d=normalize(vW-cameraPosition); float h=d.y;',
      '  vec3 c=mix(uHorizon,uMid,smoothstep(-0.04,0.22,h));',
      '  c=mix(c,uTop,smoothstep(0.18,0.85,h));',
      '  float s=max(dot(d,uSunDir),0.0);',
      '  c+=uSunColor*uSunI*(pow(s,900.0)*3.0+pow(s,48.0)*0.9+pow(s,6.0)*0.22+pow(s,2.0)*0.06);',
      '  c*=0.25+0.75*smoothstep(-0.5,0.02,h);',
      '  gl_FragColor=vec4(c,1.0);',
      '}'].join('\n')
  }));
  sky.renderOrder = -10;
  scene.add(sky);

  /* =====================================================================
     כוכבים (רק בסטרטוספירה)
     ===================================================================== */
  var stars = (function () {
    var g = new T.BufferGeometry(), p = new Float32Array(N.stars * 3), c = new Float32Array(N.stars * 3);
    for (var i = 0; i < N.stars; i++) {
      var th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.9 + 0.1);   // רק מעל האופק
      var r = 6200;
      p[i * 3] = r * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = r * Math.cos(ph); p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      var k = 0.6 + Math.random() * 0.4, w = Math.random();
      c[i * 3] = k; c[i * 3 + 1] = k * (w < 0.2 ? 0.85 : 1); c[i * 3 + 2] = k * (w < 0.2 ? 0.7 : 1.05);
    }
    g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('color', new T.BufferAttribute(c, 3));
    var m = new T.Points(g, new T.PointsMaterial({ size: 9, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    m.renderOrder = -9; scene.add(m); return m;
  })();

  /* =====================================================================
     שמש — ספרייט זוהר
     ===================================================================== */
  function radialTex(size, stops) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var g = c.getContext('2d'), rg = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(function (s) { rg.addColorStop(s[0], s[1]); });
    g.fillStyle = rg; g.fillRect(0, 0, size, size);
    return new T.CanvasTexture(c);
  }
  var sunTex = radialTex(256, [[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,240,200,0.9)'], [0.35, 'rgba(255,190,110,0.35)'], [1, 'rgba(255,150,60,0)']]);
  var sun = new T.Sprite(new T.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, fog: false, opacity: 1 }));
  sun.scale.set(1400, 1400, 1);
  sun.renderOrder = -8;
  scene.add(sun);

  /* =====================================================================
     ים עננים — נקודות עם שיידר נפחי-למראה
     ===================================================================== */
  var cloudU = {
    uTime: { value: 0 }, uSunDir: { value: SUN },
    uLit: { value: new T.Color(0xfff1dc) }, uShade: { value: new T.Color(0x8b7fd6) },
    uFog: { value: new T.Color(0xf29a3a) }, uFogDensity: { value: 0.00035 }, uOpacity: { value: 1 }
  };
  var CLOUD_VS = [
    'attribute vec3 aPos; attribute vec2 aSize; attribute float aSeed; uniform float uTime; uniform vec3 uSunDir;',
    'varying vec2 vUv; varying float vSeed,vDepth,vLit;',
    'void main(){',
    '  vec3 p=aPos; p.x+=sin(uTime*0.07+aSeed*6.2831)*12.0; p.z+=cos(uTime*0.05+aSeed*3.1)*8.0;',
    '  vec4 mv=modelViewMatrix*vec4(p,1.0);',
    '  mv.xy+=position.xy*aSize;',
    '  gl_Position=projectionMatrix*mv;',
    '  vUv=uv; vSeed=aSeed; vDepth=-mv.z;',
    '  vec3 fake=normalize(vec3(sin(aSeed*7.0),0.55,cos(aSeed*7.0)));',
    '  vLit=0.45+0.55*max(dot(fake,uSunDir),0.0);',
    '}'].join('\n');
  var CLOUD_FS = [
    'uniform vec3 uLit,uShade,uFog; uniform float uOpacity,uFogDensity; varying vec2 vUv; varying float vSeed,vDepth,vLit;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
    'void main(){',
    '  vec2 c=vUv-0.5; float d=length(c*vec2(1.0,1.35))*2.0;',
    '  float n=noise(c*3.2+vSeed*23.0)*0.5+noise(c*7.0-vSeed*11.0)*0.32+noise(c*15.0+vSeed*5.0)*0.18;',
    '  float a=smoothstep(1.0,0.18,d+n*0.7); if(a<0.012) discard;',
    '  a*=uOpacity*0.8;',
    '  vec3 col=mix(uShade,uLit,clamp(vLit*(1.2-d*0.6)*(0.62+n*0.55),0.0,1.0));',
    '  col=mix(col,uFog,1.0-exp(-vDepth*uFogDensity));',
    '  gl_FragColor=vec4(col,a);',
    '}'].join('\n');
  var clouds = (function () {
    var n = N.clouds, geo = new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1, 1));
    geo.instanceCount = n;
    var pos = new Float32Array(n * 3), size = new Float32Array(n * 2), seed = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var band = Math.random() < 0.55;
      var x = band ? (Math.random() - .5) * 1700 : (Math.random() - .5) * 5600;
      var z = band ? -300 + (Math.random() - .5) * 2800 : (Math.random() - .5) * 6400 - 400;
      var y = CLOUD_Y0 + Math.pow(Math.random(), 1.4) * (CLOUD_Y1 - CLOUD_Y0);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      var w = (band ? 120 : 220) + Math.random() * 300;
      size[i * 2] = w; size[i * 2 + 1] = w * (0.42 + Math.random() * 0.3);
      seed[i] = Math.random();
    }
    geo.setAttribute('aPos', new T.InstancedBufferAttribute(pos, 3));
    geo.setAttribute('aSize', new T.InstancedBufferAttribute(size, 2));
    geo.setAttribute('aSeed', new T.InstancedBufferAttribute(seed, 1));
    var m = new T.ShaderMaterial({ uniforms: cloudU, transparent: true, depthWrite: false, depthTest: true, blending: T.NormalBlending, fog: false, side: T.DoubleSide, vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS });
    var mesh = new T.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = 5; scene.add(mesh); return mesh;
  })();

  /* יריעת עננים — משטח רציף שנותן "ים" מלמעלה ותקרה מלמטה */
  var sheet = new T.Mesh(new T.PlaneGeometry(16000, 16000, 1, 1), new T.ShaderMaterial({
    uniforms: cloudU, transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
    vertexShader: 'varying vec3 vW; varying float vDepth; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mv=viewMatrix*w; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }',
    fragmentShader: [
      'uniform vec3 uLit,uShade,uFog; uniform float uOpacity,uFogDensity,uTime; varying vec3 vW; varying float vDepth;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
      '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
      'float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(17.0,9.0); a*=0.5; } return v; }',
      'void main(){',
      '  vec2 q=vW.xz*0.0011+vec2(uTime*0.006,0.0);',
      '  float n=fbm(q); float n2=fbm(q*2.7+3.0);',
      '  float a=smoothstep(0.30,0.72,n+n2*0.25)*0.92;',
      '  float dy=abs(cameraPosition.y-vW.y); a*=smoothstep(35.0,220.0,dy);',          // נמוג כשעוברים דרכו
      '  vec3 col=mix(uShade,uLit,smoothstep(0.25,0.95,n*1.15+n2*0.2));',
      '  col=mix(col,uFog,1.0-exp(-vDepth*uFogDensity));',
      '  gl_FragColor=vec4(col,a*uOpacity);',
      '}'].join('\n')
  }));
  sheet.rotation.x = -Math.PI / 2; sheet.position.y = CLOUD_Y0 + 75; sheet.renderOrder = 4; sheet.frustumCulled = false;
  scene.add(sheet);

  /* =====================================================================
     קרקע — משטח נתונים מחזיר אור
     ===================================================================== */
  var groundU = {
    uTime: { value: 0 }, uSunDir: { value: SUN },
    uBase: { value: new T.Color(0x07041c) }, uLine: { value: new T.Color(0x6a4cff) },
    uFog: { value: new T.Color(0x2a1a5e) }, uFogDensity: { value: 0.0011 }, uSheen: { value: 1.0 }
  };
  var ground = new T.Mesh(new T.PlaneGeometry(9000, 9000, 1, 1), new T.ShaderMaterial({
    uniforms: groundU, fog: false,
    vertexShader: 'varying vec3 vW; varying float vDepth; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mv=viewMatrix*w; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }',
    fragmentShader: [
      'uniform float uTime,uFogDensity,uSheen; uniform vec3 uBase,uLine,uFog,uSunDir; varying vec3 vW; varying float vDepth;',
      'void main(){',
      '  vec2 p=vW.xz; vec2 g=abs(fract(p/60.0)-0.5); float dist=length(p);',
      '  float line=1.0-smoothstep(0.0,0.035,min(g.x,g.y));',
      '  float pulse=0.5+0.5*sin(dist*0.02-uTime*1.6);',
      '  vec3 col=uBase+uLine*line*(0.2+0.6*pulse)*exp(-dist*0.0011)*0.5;',
      '  float rw=smoothstep(30.0,0.0,abs(p.x))*(1.0-smoothstep(80.0,160.0,p.y))*smoothstep(-1600.0,-1400.0,p.y);',
      '  col+=vec3(0.10,0.07,0.22)*rw;',
      '  vec3 vd=normalize(vW-cameraPosition);',
      '  col+=vec3(1.0,0.62,0.28)*pow(max(dot(vd,uSunDir),0.0),30.0)*0.55*uSheen;',
      '  col=mix(col,uFog,1.0-exp(-vDepth*uFogDensity));',
      '  gl_FragColor=vec4(col,1.0);',
      '}'].join('\n')
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0;
  scene.add(ground);

  /* =====================================================================
     העיר — מגדלי נתונים עם חלונות חיים (שיידר לכל instance)
     ===================================================================== */
  var towerU = {
    uTime: { value: 0 }, uBody: { value: new T.Color(0x0b0728) },
    uGold: { value: new T.Color(0xffa63a) }, uCyan: { value: new T.Color(0x6fe6ff) },
    uFog: { value: new T.Color(0x2a1a5e) }, uFogDensity: { value: 0.0011 }, uGlow: { value: 1.35 }
  };
  var towerMat = new T.ShaderMaterial({
    uniforms: towerU, fog: false,
    vertexShader: [
      'attribute vec4 aRand; varying vec3 vLocal,vScale,vNormal; varying vec4 vRand; varying float vDepth;',
      'void main(){',
      '  vScale=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));',
      '  vLocal=position; vNormal=normal; vRand=aRand;',
      '  vec4 w=modelMatrix*instanceMatrix*vec4(position,1.0); vec4 mv=viewMatrix*w; vDepth=-mv.z;',
      '  gl_Position=projectionMatrix*mv;',
      '}'].join('\n'),
    fragmentShader: [
      'uniform float uTime,uFogDensity,uGlow; uniform vec3 uBody,uGold,uCyan,uFog;',
      'varying vec3 vLocal,vScale,vNormal; varying vec4 vRand; varying float vDepth;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'void main(){',
      '  vec3 n=abs(vNormal); vec3 neon=mix(uGold,uCyan,vRand.z); vec3 col=uBody;',
      '  float vert=(vLocal.y+0.5)*vScale.y;',
      '  if(n.y<0.5){',
      '    float horiz=(n.x>0.5)?(vLocal.z+0.5)*vScale.z:(vLocal.x+0.5)*vScale.x;',
      '    float hw=(n.x>0.5)?vScale.z:vScale.x;',
      '    vec2 gg=vec2(horiz/2.4,vert/2.9); vec2 cell=floor(gg); vec2 f=fract(gg);',
      '    float win=step(0.18,f.x)*step(f.x,0.82)*step(0.16,f.y)*step(f.y,0.66);',
      '    float r=hash(cell+vRand.x*13.7);',
      '    float lit=step(1.0-vRand.y,r);',
      '    float flick=0.75+0.25*sin(uTime*(0.6+r*2.4)+r*40.0);',
      '    vec3 glow=mix(uGold,uCyan,step(vRand.z,hash(cell*3.1+vRand.x)));',
      '    col+=glow*win*lit*flick*uGlow;',
      '    float e=smoothstep(hw*0.5-0.9,hw*0.5-0.05,abs(horiz-hw*0.5));',
      '    col+=neon*e*0.7;',
      '    col+=neon*smoothstep(0.955,1.0,vLocal.y+0.5)*2.2;',
      '    // פס נתונים שרץ למעלה',
      '    float band=smoothstep(0.02,0.0,abs(fract(vert/vScale.y-uTime*0.12*(0.5+vRand.w))-0.5)-0.01);',
      '    col+=neon*band*0.35*vRand.w;',
      '  } else if(vNormal.y>0.0){ col=uBody+neon*0.85; }',
      '  col=mix(col,uFog,1.0-exp(-vDepth*uFogDensity));',
      '  gl_FragColor=vec4(col,1.0);',
      '}'].join('\n')
  });
  var towerTops = [];
  var towers = (function () {
    var n = N.towers, geo = new T.BoxGeometry(1, 1, 1);
    var mesh = new T.InstancedMesh(geo, towerMat, n);
    var rand = new Float32Array(n * 4), m = new T.Matrix4(), q = new T.Quaternion(), i = 0;
    function place(x, z, w, d, h, spire) {
      m.compose(new T.Vector3(x, h / 2, z), q, new T.Vector3(w, h, d));
      mesh.setMatrixAt(i, m);
      rand[i * 4] = Math.random(); rand[i * 4 + 1] = 0.22 + Math.random() * 0.4; rand[i * 4 + 2] = Math.random() < 0.28 ? 1 : 0; rand[i * 4 + 3] = spire ? 1 : Math.random() * 0.6;
      if (h > 90) towerTops.push(new T.Vector3(x, h, z));
      i++;
    }
    // שני צריחים ליד הליבה
    place(-150, -420, 34, 34, 420, true); place(170, -470, 30, 30, 380, true); place(-330, -700, 26, 26, 330, true);
    while (i < n) {
      var side = Math.random() < 0.5 ? -1 : 1;
      var dist = 46 + Math.pow(Math.random(), 0.75) * 980;
      var x = side * dist, z = -1500 + Math.random() * 2300;
      var near = Math.exp(-Math.abs(x) / 420) * Math.exp(-Math.abs(z + 450) / 700);
      var h = 14 + Math.pow(Math.random(), 2.4) * 150 + near * (40 + Math.random() * 190);
      var w = 9 + Math.random() * 26, d = 9 + Math.random() * 26;
      place(x, z, w, d, h, false);
    }
    geo.setAttribute('aRand', new T.InstancedBufferAttribute(rand, 4));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  })();

  /* =====================================================================
     זרמי נתונים — חלקיקים שטסים בין ראשי המגדלים
     ===================================================================== */
  var streams = (function () {
    var n = N.streams, g = new T.BufferGeometry();
    var pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    var paths = [];
    var gold = new T.Color(0xffc46b), cyan = new T.Color(0x7ff0ff), white = new T.Color(0xfff6e8);
    for (var i = 0; i < n; i++) {
      var a = towerTops[Math.floor(Math.random() * towerTops.length)], b = towerTops[Math.floor(Math.random() * towerTops.length)];
      if (!a || !b) { a = new T.Vector3(0, 100, 0); b = new T.Vector3(100, 120, -300); }
      var mid = a.clone().lerp(b, 0.5); mid.y += 40 + Math.random() * 160;
      paths.push({ a: a, b: b, c: mid, t: Math.random(), v: 0.05 + Math.random() * 0.12 });
      var cc = Math.random() < 0.15 ? white : (Math.random() < 0.6 ? gold : cyan);
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    var tex = radialTex(64, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
    var pts = new T.Points(g, new T.PointsMaterial({ size: 7, map: tex, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    pts.frustumCulled = false; pts.userData.paths = paths; scene.add(pts); return pts;
  })();
  var _q = new T.Vector3();
  function updateStreams(dt) {
    var pa = streams.userData.paths, arr = streams.geometry.attributes.position.array;
    for (var i = 0; i < pa.length; i++) {
      var p = pa[i]; p.t += dt * p.v; if (p.t > 1) { p.t -= 1; }
      var t = p.t, u = 1 - t;
      _q.set(0, 0, 0).addScaledVector(p.a, u * u).addScaledVector(p.c, 2 * u * t).addScaledVector(p.b, t * t);
      arr[i * 3] = _q.x; arr[i * 3 + 1] = _q.y; arr[i * 3 + 2] = _q.z;
    }
    streams.geometry.attributes.position.needsUpdate = true;
  }

  /* =====================================================================
     רשת נוירונים — צמתים מרחפים וקשרים פועמים
     ===================================================================== */
  var nodes, links;
  (function () {
    var n = N.nodes, pts = [];
    for (var i = 0; i < n; i++) {
      var x = (Math.random() - .5) * 900, z = -900 + Math.random() * 1200, y = 90 + Math.random() * 260;
      if (Math.abs(x) < 60) x += x < 0 ? -80 : 80;
      pts.push(new T.Vector3(x, y, z));
    }
    var geo = new T.SphereGeometry(2.6, 10, 8);
    nodes = new T.InstancedMesh(geo, new T.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0, fog: false }), n);
    var m = new T.Matrix4();
    for (var j = 0; j < n; j++) { m.makeTranslation(pts[j].x, pts[j].y, pts[j].z); nodes.setMatrixAt(j, m); }
    nodes.instanceMatrix.needsUpdate = true; nodes.frustumCulled = false; scene.add(nodes);
    var lp = [], ph = [];
    for (var a = 0; a < n; a++) {
      var best = [];
      for (var b = 0; b < n; b++) { if (a === b) continue; var d = pts[a].distanceTo(pts[b]); if (d < 260) best.push([d, b]); }
      best.sort(function (u, v) { return u[0] - v[0]; });
      for (var k = 0; k < Math.min(3, best.length); k++) {
        var o = pts[best[k][1]], f = Math.random() * 6.28;
        lp.push(pts[a].x, pts[a].y, pts[a].z, o.x, o.y, o.z); ph.push(f, f);
      }
    }
    var lg = new T.BufferGeometry();
    lg.setAttribute('position', new T.Float32BufferAttribute(lp, 3));
    lg.setAttribute('aPhase', new T.Float32BufferAttribute(ph, 1));
    links = new T.LineSegments(lg, new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new T.Color(0x8fe9ff) } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
      vertexShader: 'attribute float aPhase; varying float vP; void main(){ vP=aPhase; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform float uTime,uOpacity; uniform vec3 uColor; varying float vP; void main(){ float p=pow(0.5+0.5*sin(uTime*1.8+vP),3.0); gl_FragColor=vec4(uColor,(0.08+0.5*p)*uOpacity); }'
    }));
    links.frustumCulled = false; scene.add(links);
  })();

  /* =====================================================================
     הליבה — כדור זוהר וטבעות הולוגרפיות מעל מרכז העיר
     ===================================================================== */
  var core = new T.Group(); core.position.set(0, 300, -520);
  var coreGlow = new T.Sprite(new T.SpriteMaterial({ map: radialTex(256, [[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,220,150,0.8)'], [0.5, 'rgba(255,170,80,0.25)'], [1, 'rgba(255,150,60,0)']]), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, opacity: 0 }));
  coreGlow.scale.set(260, 260, 1); core.add(coreGlow);
  var coreWire = new T.Mesh(new T.IcosahedronGeometry(34, 2), new T.MeshBasicMaterial({ color: 0xffd48a, wireframe: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, fog: false }));
  core.add(coreWire);
  var rings = [];
  [[90, 0.9, 0], [130, 0.6, 1], [175, 0.45, 2]].forEach(function (r) {
    var ring = new T.Mesh(new T.TorusGeometry(r[0], 1.1, 8, 120), new T.MeshBasicMaterial({ color: r[2] === 1 ? 0x7ff0ff : 0xffc46b, transparent: true, opacity: 0, blending: T.AdditiveBlending, fog: false }));
    ring.rotation.x = Math.PI / 2 + (r[2] - 1) * 0.35; ring.userData.v = r[1] * (r[2] % 2 ? -1 : 1);
    core.add(ring); rings.push(ring);
  });
  scene.add(core);

  /* =====================================================================
     מסלול נחיתה — פסי אורות ואורות ריצה (rabbit lights)
     ===================================================================== */
  var runway = (function () {
    var pos = [], kind = [], idx = [];
    var i = 0;
    for (var z = 120; z > -1500; z -= 22) {                 // אורות שוליים
      pos.push(-17, 0.5, z, 17, 0.5, z); kind.push(0, 0); idx.push(i, i); i++;
    }
    for (var z2 = 60; z2 > -1500; z2 -= 30) {               // קו מרכז
      pos.push(0, 0.4, z2); kind.push(1); idx.push(z2);
    }
    for (var k = 0; k < 40; k++) {                          // אורות גישה שרצים לכיוון הנחיתה
      pos.push(0, 2.0, 140 + k * 26); kind.push(2); idx.push(k);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('aKind', new T.Float32BufferAttribute(kind, 1));
    g.setAttribute('aIdx', new T.Float32BufferAttribute(idx, 1));
    var mat = new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uScale: { value: innerHeight } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
      vertexShader: [
        'attribute float aKind,aIdx; uniform float uTime,uScale; varying float vK,vB;',
        'void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv;',
        '  float b=1.0; if(aKind>1.5){ b=smoothstep(0.86,1.0,fract(uTime*0.9-aIdx*0.04)); } else if(aKind>0.5){ b=0.55+0.45*sin(uTime*3.0+aIdx*0.05); }',
        '  vK=aKind; vB=b; gl_PointSize=min((aKind>1.5?14.0:9.0)*uScale/max(-mv.z,1.0)*0.9+1.5, 42.0); }'].join('\n'),
      fragmentShader: [
        'uniform float uOpacity; varying float vK,vB;',
        'void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c)*2.0; float a=smoothstep(1.0,0.0,d); a*=a;',
        '  vec3 col=vK>1.5?vec3(1.0,1.0,1.0):(vK>0.5?vec3(1.0,0.8,0.45):vec3(1.0,0.72,0.3));',
        '  gl_FragColor=vec4(col*(0.6+1.4*vB),a*uOpacity); }'].join('\n')
    });
    var pts = new T.Points(g, mat); pts.frustumCulled = false; scene.add(pts); return pts;
  })();

  /* =====================================================================
     פוסט-פרוסס משלנו: bloom + אברציה + vignette + גריין + הבזק
     ===================================================================== */
  var W = Math.floor(innerWidth * DPR), H = Math.floor(innerHeight * DPR);
  var rtOpts = { type: T.HalfFloatType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: true, stencilBuffer: false };
  var rtScene = new T.WebGLRenderTarget(W, H, rtOpts);
  var half = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, type: T.HalfFloatType, depthBuffer: false };
  var rtA = new T.WebGLRenderTarget(W >> 1, H >> 1, half), rtB = new T.WebGLRenderTarget(W >> 1, H >> 1, half);
  var rtC = new T.WebGLRenderTarget(W >> 2, H >> 2, half), rtD = new T.WebGLRenderTarget(W >> 2, H >> 2, half);
  var ortho = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var quadGeo = new T.PlaneGeometry(2, 2);
  var VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
  var brightMat = new T.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uThr: { value: 0.55 } }, depthTest: false, depthWrite: false, vertexShader: VS,
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float uThr; varying vec2 vUv; void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; float l=dot(c,vec3(0.2126,0.7152,0.0722)); float f=smoothstep(uThr,uThr+0.5,l); gl_FragColor=vec4(c*f,1.0); }'
  });
  var blurMat = new T.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uDir: { value: new T.Vector2(1, 0) }, uTexel: { value: new T.Vector2(1 / W, 1 / H) } }, depthTest: false, depthWrite: false, vertexShader: VS,
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform vec2 uDir,uTexel; varying vec2 vUv;',
      'void main(){ vec2 o=uDir*uTexel; vec3 c=texture2D(tDiffuse,vUv).rgb*0.2270270;',
      '  c+=texture2D(tDiffuse,vUv+o*1.3846154).rgb*0.3162162; c+=texture2D(tDiffuse,vUv-o*1.3846154).rgb*0.3162162;',
      '  c+=texture2D(tDiffuse,vUv+o*3.2307692).rgb*0.0702703; c+=texture2D(tDiffuse,vUv-o*3.2307692).rgb*0.0702703;',
      '  gl_FragColor=vec4(c,1.0); }'].join('\n')
  });
  var finalU = {
    tScene: { value: null }, tBloom1: { value: null }, tBloom2: { value: null },
    uBloom: { value: 1.15 }, uCA: { value: 0.012 }, uVig: { value: 0.55 }, uGrain: { value: 0.035 },
    uFlash: { value: 0 }, uFade: { value: 1 }, uTime: { value: 0 }, uExposure: { value: 1.0 }
  };
  var finalMat = new T.ShaderMaterial({
    uniforms: finalU, depthTest: false, depthWrite: false, vertexShader: VS,
    fragmentShader: [
      'uniform sampler2D tScene,tBloom1,tBloom2; uniform float uBloom,uCA,uVig,uGrain,uFlash,uFade,uTime,uExposure; varying vec2 vUv;',
      'void main(){',
      '  vec2 d=vUv-0.5; float r2=dot(d,d); float ca=uCA*r2;',
      '  vec3 col; col.r=texture2D(tScene,vUv+d*ca).r; col.g=texture2D(tScene,vUv).g; col.b=texture2D(tScene,vUv-d*ca).b;',
      '  vec3 bl=texture2D(tBloom1,vUv).rgb*0.65+texture2D(tBloom2,vUv).rgb*1.0;',
      '  col=col*uExposure+bl*uBloom+vec3(uFlash);',
      '  col=(col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);',
      '  col*=1.0-uVig*smoothstep(0.12,1.0,r2*2.3);',
      '  float g=fract(sin(dot(vUv+fract(uTime),vec2(12.9898,78.233)))*43758.5453);',
      '  col+=(g-0.5)*uGrain;',
      '  gl_FragColor=vec4(col*uFade,1.0);',
      '}'].join('\n')
  });
  var quad = new T.Mesh(quadGeo, brightMat); var postScene = new T.Scene(); postScene.add(quad);
  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(postScene, ortho); }

  function composite() {
    renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
    brightMat.uniforms.tDiffuse.value = rtScene.texture; pass(brightMat, rtA);
    blurMat.uniforms.uTexel.value.set(1 / rtA.width, 1 / rtA.height);
    blurMat.uniforms.tDiffuse.value = rtA.texture; blurMat.uniforms.uDir.value.set(1, 0); pass(blurMat, rtB);
    blurMat.uniforms.tDiffuse.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, 1); pass(blurMat, rtA);
    blurMat.uniforms.uTexel.value.set(1 / rtC.width, 1 / rtC.height);
    blurMat.uniforms.tDiffuse.value = rtA.texture; blurMat.uniforms.uDir.value.set(1, 0); pass(blurMat, rtC);
    blurMat.uniforms.tDiffuse.value = rtC.texture; blurMat.uniforms.uDir.value.set(0, 1); pass(blurMat, rtD);
    blurMat.uniforms.tDiffuse.value = rtD.texture; blurMat.uniforms.uDir.value.set(1.5, 0); pass(blurMat, rtC);
    blurMat.uniforms.tDiffuse.value = rtC.texture; blurMat.uniforms.uDir.value.set(0, 1.5); pass(blurMat, rtD);
    finalU.tScene.value = rtScene.texture; finalU.tBloom1.value = rtA.texture; finalU.tBloom2.value = rtD.texture;
    pass(finalMat, null);
  }

  function resize() {
    var w = innerWidth, h = innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    W = Math.floor(w * DPR); H = Math.floor(h * DPR);
    rtScene.setSize(W, H); rtA.setSize(W >> 1, H >> 1); rtB.setSize(W >> 1, H >> 1); rtC.setSize(W >> 2, H >> 2); rtD.setSize(W >> 2, H >> 2);
    runway.material.uniforms.uScale.value = h;
  }
  addEventListener('resize', resize);

  /* =====================================================================
     מסלול המצלמה — עקומה חלקה + גלגול + טורבולנציה
     ===================================================================== */
  var P = new T.CatmullRomCurve3([
    new T.Vector3(0, 1150, 3000), new T.Vector3(-160, 1000, 2250), new T.Vector3(140, 760, 1550),
    new T.Vector3(70, 470, 1050), new T.Vector3(-90, 330, 700), new T.Vector3(150, 190, 430),
    new T.Vector3(-60, 95, 220), new T.Vector3(10, 26, 80), new T.Vector3(0, 4.2, 8)
  ], false, 'centripetal', 0.5);
  var L = new T.CatmullRomCurve3([
    new T.Vector3(0, 560, 0), new T.Vector3(0, 480, -200), new T.Vector3(0, 380, -320),
    new T.Vector3(0, 250, -380), new T.Vector3(40, 130, -420), new T.Vector3(-20, 70, -480),
    new T.Vector3(10, 30, -560), new T.Vector3(0, 8, -640), new T.Vector3(0, 3.6, -760)
  ], false, 'centripetal', 0.5);
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  // עקומת מהירות: מהר בסטרטוספירה, מאט בעננים, מהיר בעיר, מאט מאוד בנחיתה
  function pathT(t) { return Math.pow(t, 1.18) * (1 - 0.06 * Math.sin(t * Math.PI)); }

  var CAPS = [
    [0.00, 'סטרטוספירה · 38,000 רגל'], [0.24, 'נכנסים לשכבת העננים'],
    [0.47, 'פורצים אל עולם הבינה המלאכותית'], [0.70, 'מנמיכים בין המגדלים'], [0.88, 'נוחתים']
  ];

  /* ---------- HUD ---------- */
  var hud = document.getElementById('hud'), capEl = document.getElementById('caption'), altEl = document.getElementById('alt'),
      spdEl = document.getElementById('spd'), barEl = document.getElementById('barfill'), horizonEl = document.getElementById('horizon'),
      flares = Array.prototype.slice.call(document.querySelectorAll('.flare'));
  var capIdx = -1;
  function setCaption(i) { if (i === capIdx) return; capIdx = i; capEl.classList.add('swap'); setTimeout(function () { capEl.textContent = CAPS[i][1]; capEl.classList.remove('swap'); }, 240); }

  /* ---------- מצב ---------- */
  var landed = false, startT = 0, raf = 0, lastNow = 0, shake = 0, flash = 0, idleT = 0, prevPos = new T.Vector3(), roll = 0, rollV = 0;
  var _p = new T.Vector3(), _l = new T.Vector3(), _sunW = new T.Vector3(), _ndc = new T.Vector3(), _up = new T.Vector3(0, 1, 0);
  var body = document.body;
  var landedAt = 0, nextBolt = 0, touched = false;

  function lerpC(out, a, b, k) { out.r = a.r + (b.r - a.r) * k; out.g = a.g + (b.g - a.g) * k; out.b = a.b + (b.b - a.b) * k; }
  var C = {
    topA: new T.Color(0x04021a), topB: new T.Color(0x1a0e4e), topC: new T.Color(0x150a3c),
    midA: new T.Color(0x1b0f55), midB: new T.Color(0x6a4ab0), midC: new T.Color(0x3c2384),
    horA: new T.Color(0xf29a3a), horB: new T.Color(0xffc266), horC: new T.Color(0xff9440),
    fogA: new T.Color(0xf29a3a), fogB: new T.Color(0x8c78d8), fogC: new T.Color(0x2c1a62),
    litAbove: new T.Color(0xfff1dc), shadeAbove: new T.Color(0x8b7fd6),
    litBelow: new T.Color(0xffb46a), shadeBelow: new T.Color(0x2a1c66)
  };
  var tmp = new T.Color();

  function land() {
    if (landed) return;
    landed = true; landedAt = performance.now();
    hud.classList.add('gone');
    body.classList.remove('flying'); body.classList.add('landed');
    window.scrollTo(0, 0);
    setTimeout(function () { hud.style.display = 'none'; }, 1500);
  }

  var frozen = false;
  function frame(now) {
    if (!frozen) raf = requestAnimationFrame(frame);
    if (!startT) { startT = now; lastNow = now; }
    var dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
    var elapsed = now - startT, t = Math.min(1, elapsed / DUR), time = elapsed / 1000;
    var s = pathT(t);

    /* --- מצלמה --- */
    P.getPointAt(s, _p); L.getPointAt(s, _l);
    if (landed) {
      idleT = (now - landedAt) / 1000;
      var drift = 10 * (1 - Math.exp(-idleT / 40));
      _p.z -= drift; _l.z -= drift;
      _p.y += Math.sin(idleT * 0.35) * 0.25; _p.x += Math.sin(idleT * 0.22) * 0.9;
    }
    // גלגול מהפנייה האופקית
    var vx = _p.x - prevPos.x; prevPos.copy(_p);
    var targetRoll = landed ? 0 : Math.max(-0.2, Math.min(0.2, -vx * 0.035));
    rollV += (targetRoll - roll) * 0.05; rollV *= 0.86; roll += rollV;
    // טורבולנציה בעננים + רעד נחיתה
    var turb = 0; shake = 0;
    var sx = Math.sin(time * 37.1) * 0.6 + Math.sin(time * 61.3) * 0.4, sy = Math.sin(time * 43.7) * 0.6 + Math.cos(time * 71.9) * 0.4;
    camera.position.copy(_p).addScaledVector(camera.up, sy * shake).add(new T.Vector3(sx * shake, 0, 0));
    camera.lookAt(_l);
    camera.rotateZ(roll + sx * shake * 0.01);

    /* --- שלבי אווירה: 0 סטרטוספירה · 1 עננים · 2 עיר --- */
    var kCloud = Math.min(1, Math.max(0, (t - 0.20) / 0.18));   // מ-0.20 עד 0.38
    var kCity = Math.min(1, Math.max(0, (t - 0.44) / 0.16));    // מ-0.44 עד 0.60
    lerpC(skyU.uTop.value, C.topA, C.topB, kCloud); lerpC(skyU.uTop.value, skyU.uTop.value, C.topC, kCity);
    lerpC(skyU.uMid.value, C.midA, C.midB, kCloud); lerpC(skyU.uMid.value, skyU.uMid.value, C.midC, kCity);
    lerpC(skyU.uHorizon.value, C.horA, C.horB, kCloud); lerpC(skyU.uHorizon.value, skyU.uHorizon.value, C.horC, kCity);
    lerpC(tmp, C.fogA, C.fogB, kCloud); lerpC(tmp, tmp, C.fogC, kCity);
    cloudU.uFog.value.copy(tmp); groundU.uFog.value.copy(tmp); towerU.uFog.value.copy(tmp);
    var fogD = 0.00035 + kCloud * 0.0004 + kCity * 0.0003;
    cloudU.uFogDensity.value = fogD; groundU.uFogDensity.value = 0.0032 - kCloud * 0.0018 - kCity * 0.0004; towerU.uFogDensity.value = 0.0006 + kCity * 0.0006;
    skyU.uSunI.value = 1.0 - kCity * 0.35;

    /* --- כיפת השמיים והקרקע נעות עם המצלמה — האופק לעולם לא נגמר --- */
    sky.position.copy(camera.position);
    ground.position.x = camera.position.x; ground.position.z = camera.position.z;
    sheet.position.x = camera.position.x; sheet.position.z = camera.position.z;

    /* --- שמש --- */
    _sunW.copy(camera.position).addScaledVector(SUN, 5000); sun.position.copy(_sunW);
    sun.material.opacity = 0.9 - kCity * 0.45;

    /* --- כוכבים --- */
    stars.material.opacity = Math.max(0, 1 - kCloud * 1.4);
    stars.rotation.y = time * 0.004;

    /* --- עננים: צבע לפי גובה המצלמה ביחס לשכבה --- */
    var below = 1 - Math.min(1, Math.max(0, (camera.position.y - CLOUD_Y0 + 40) / 120));
    lerpC(cloudU.uLit.value, C.litAbove, C.litBelow, below); lerpC(cloudU.uShade.value, C.shadeAbove, C.shadeBelow, below);
    cloudU.uOpacity.value = landed ? 0.35 : 1;
    cloudU.uTime.value = time;

    /* --- העיר עולה --- */
    towers.visible = kCity > 0.02 || camera.position.y < CLOUD_Y1;
    towerU.uGlow.value = (0.3 + 0.75 * kCity) * (landed ? 0.55 : 1);
    towerU.uTime.value = time; groundU.uTime.value = time; groundU.uSheen.value = 1 - kCity * 0.5;
    streams.material.opacity = kCity * (landed ? 0.45 : 0.95);
    nodes.material.opacity = kCity * 0.9; links.material.uniforms.uOpacity.value = kCity * (landed ? 0.5 : 1); links.material.uniforms.uTime.value = time;
    coreGlow.material.opacity = kCity * 0.9; coreWire.material.opacity = kCity * 0.55; coreWire.rotation.y = time * 0.3; coreWire.rotation.x = time * 0.17;
    coreGlow.scale.setScalar(260 + Math.sin(time * 1.7) * 18);
    for (var r = 0; r < rings.length; r++) { rings[r].material.opacity = kCity * 0.75; rings[r].rotation.z += rings[r].userData.v * dt; }
    runway.material.uniforms.uOpacity.value = Math.min(1, Math.max(0, (t - 0.62) / 0.2)) * (landed ? 0.45 : 1);
    runway.material.uniforms.uTime.value = time;
    if (kCity > 0) updateStreams(dt);

    /* --- ברקים בתוך העננים --- */
    /* טיסה חלקה — בלי ברקים */
    // הבזק פריצה מהעננים
    if (!landed && t > 0.455 && t < 0.49) { flash = Math.max(flash, 0.18); }   // הבזק רך אחד בפריצה מהעננים
    flash *= Math.pow(0.02, dt); finalU.uFlash.value = flash * 0.7;

    /* --- נחיתה: מגע --- */
    /* נחיתה רכה — בלי רעד מגע */

    /* --- פוסט --- */
    finalU.uTime.value = time;
    finalU.uBloom.value = landed ? 1.15 - 0.45 * settle : 1.15 + kCloud * 0.35 - kCity * 0.25;
    finalU.uCA.value = 0.006;
    finalU.uVig.value = landed ? 0.7 : 0.5;
    finalU.uGrain.value = LOW ? 0 : 0.035;
    var settle = landed ? Math.min(1, idleT / 2.6) : 0; settle = settle * settle * (3 - 2 * settle);
    finalU.uFade.value = landed ? 1 - 0.55 * settle : Math.min(1, elapsed / 700);
    finalU.uExposure.value = landed ? 1 - 0.15 * settle : 1;

    /* --- HUD --- */
    if (!landed) {
      var ft = Math.round(38000 * Math.pow(1 - t, 1.55) + 8 * (1 - t));
      altEl.textContent = ft.toLocaleString('en-US');
      spdEl.textContent = Math.round(920 - 700 * Math.pow(t, 1.4)).toLocaleString('en-US');
      barEl.style.width = (t * 100).toFixed(1) + '%';
      for (var i = CAPS.length - 1; i >= 0; i--) { if (t >= CAPS[i][0]) { setCaption(i); break; } }
      horizonEl.style.transform = 'rotate(' + (-roll * 57.3).toFixed(2) + 'deg) translateY(' + ((_l.y - camera.position.y) * 0.04).toFixed(1) + 'px)';
      // lens flare — הקרנת השמש למסך
      _ndc.copy(_sunW).project(camera);
      var inFront = _ndc.z < 1 && Math.abs(_ndc.x) < 1.4 && Math.abs(_ndc.y) < 1.4;
      var vis = inFront ? (1 - kCloud * 0.9) * (1 - kCity * 0.6) * Math.max(0, 1 - Math.max(Math.abs(_ndc.x), Math.abs(_ndc.y)) * 0.6) : 0;
      var sxp = (_ndc.x + 1) / 2 * innerWidth, syp = (1 - _ndc.y) / 2 * innerHeight, cx = innerWidth / 2, cy = innerHeight / 2;
      for (var f = 0; f < flares.length; f++) {
        var k = parseFloat(flares[f].dataset.k);
        flares[f].style.transform = 'translate(' + (sxp + (cx - sxp) * k) + 'px,' + (syp + (cy - syp) * k) + 'px) translate(-50%,-50%)';
        flares[f].style.opacity = (vis * parseFloat(flares[f].dataset.o)).toFixed(3);
      }
      if (t >= 1) land();
    }

    composite();
  }

  /* ---------- הפעלה / דילוג / חזרה ---------- */
  function start() {
    startT = 0; landed = false; capIdx = -1; shake = 0; flash = 0; roll = 0; rollV = 0; nextBolt = 0; touched = false;
    P.getPointAt(0, prevPos);
    body.classList.add('flying'); body.classList.remove('landed');
    hud.style.display = ''; hud.classList.remove('gone');
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  document.getElementById('skip').addEventListener('click', land);
  addEventListener('keydown', function (e) { if (!landed && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) land(); });
  document.getElementById('replay').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'instant' }); start(); });

  /* ---------- חיסכון: לא מרנדרים כשלא רואים ---------- */
  var heroSeen = true;
  function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function resume() { if (!raf && !document.hidden && (heroSeen || !landed)) { lastNow = performance.now(); raf = requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else resume(); });
  new IntersectionObserver(function (es) { heroSeen = es[0].isIntersecting; if (heroSeen) resume(); else if (landed) pause(); }, { threshold: 0 }).observe(document.getElementById('hero'));

  window.__flight = { start: start, land: land,
    /* לבדיקות: קפיצה לנקודת זמן והקפאה של פריים אחד */
    seek: function (ms) { frozen = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } startT = performance.now() - ms; lastNow = performance.now() - 16; frame(performance.now()); },
    play: function () { frozen = false; if (!raf) raf = requestAnimationFrame(frame); } };
  start();
})();
