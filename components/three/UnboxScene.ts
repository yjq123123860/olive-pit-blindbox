/* ==========================================================================
   UnboxScene · 榄雕盲盒 3D 开箱场景
   ---------------------------------------------------------------------------
   纯 Three.js（无 React 依赖）场景类，暴露 API 给 React 组件调用。

   时序完全对齐需求：
     点击 → 盒盖弹开 → 盒子摇晃 → 冒出星星 → 惊喜爆发（闪光 + 冲击波 + 推镜）
          → 藏品（真 GLB 建模）升起 + 自转 + 聚光

   盒子：程序化 BoxGeometry，贴图来自 /box/*.png（用户提供的三视图切图），
        盒盖 lid 是独立 Mesh，挂在一个后缘 pivot 上，可真的旋开。
   藏品：/models/{id}.glb（image-to-3D 生成，未压缩，无需 DRACOLoader）；
        该款尚无 GLB 时回退到「橄榄核坯」程序化几何（噪声位移）。
   ========================================================================== */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";

export type Phase =
  | "idle"
  | "lid"
  | "shake"
  | "stars"
  | "surprise"
  | "reveal";

export interface SceneCallbacks {
  onPhase?: (p: Phase) => void;
  onReady?: () => void;
  onModelState?: (s: "loading" | "ok" | "placeholder") => void;
}

const GOLD = 0xc5a35b;
const RED = 0xe60012;

/* ---------- 程序化生成一张五角星/四角星 sprite，避免外部资源 ---------- */
function makeStarTexture(kind: "star" | "glow"): THREE.Texture {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  if (kind === "glow") {
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, "rgba(255,244,214,1)");
    rg.addColorStop(0.35, "rgba(231,206,134,0.55)");
    rg.addColorStop(1, "rgba(231,206,134,0)");
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
  } else {
    g.translate(S / 2, S / 2);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? S * 0.46 : S * 0.16;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath();
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, S * 0.46);
    rg.addColorStop(0, "#fffdf4");
    rg.addColorStop(0.45, "#f0dca6");
    rg.addColorStop(1, "#b8902f");
    g.fillStyle = rg;
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- 盒面文字贴图（盒顶用） ---------- */
function makeLidTopTexture(): THREE.Texture {
  const W = 512;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#141414");
  bg.addColorStop(1, "#0a0a0a");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // 金色细边
  g.strokeStyle = "rgba(197,163,91,.85)";
  g.lineWidth = 6;
  g.strokeRect(22, 22, W - 44, H - 44);
  g.fillStyle = "#e7ce86";
  g.font = "900 168px 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("榄雕", W / 2, H / 2 - 34);
  g.fillStyle = "rgba(234,226,205,.72)";
  g.font = "500 44px 'Noto Sans SC', sans-serif";
  g.fillText("核雕珍玩系列", W / 2, H / 2 + 96);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- 噪声（橄榄核坯用） ---------- */
function hash3(x: number, y: number, z: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}
function vnoise(p: THREE.Vector3) {
  const xi = Math.floor(p.x),
    yi = Math.floor(p.y),
    zi = Math.floor(p.z);
  const xf = p.x - xi,
    yf = p.y - yi,
    zf = p.z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  let r = 0;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  for (let dz = 0; dz <= 1; dz++)
    for (let dy = 0; dy <= 1; dy++)
      for (let dx = 0; dx <= 1; dx++) {
        const wgt =
          (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
        r += lerp(hash3(xi + dx, yi + dy, zi + dz), hash3(xi + dx, yi + dy, zi + dz), 0.5) * wgt;
      }
  return r;
}

export class UnboxScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rig: THREE.Group;          // 相机注视中心（可推镜）
  private boxGroup: THREE.Group;     // 整盒
  private body!: THREE.Mesh;
  private lidPivot!: THREE.Group;
  private lid!: THREE.Mesh;
  private disc: THREE.Mesh;          // 展示转台
  private shaft: THREE.Mesh;         // 光柱
  private ring: THREE.Mesh;          // 冲击波
  private stars: THREE.Points;
  private starVel: Float32Array;
  private figurePivot: THREE.Group;
  private spot: THREE.SpotLight;
  private loader = new GLTFLoader();
  private tl: gsap.core.Timeline | null = null;
  private disposables: Array<{ dispose(): void }> = [];
  private cb: SceneCallbacks;
  private running = true;
  private raf = 0;
  private perfLow = false;
  private starCount = 220;
  /** 相机注视点（GSAP 可补间，让出款时视线抬到藏品身上） */
  private lookTarget = new THREE.Vector3(0, 2.4, 0);
  /** 盒盖闭合时的 pivot 位置（reset 用） */
  private lidClosedPos = new THREE.Vector3();
  private t0 = performance.now();
  private currentFigure: { id: string; modelUrl?: string } | null = null;
  private pendingModelUrl: string | undefined;
  private loadedModel: THREE.Object3D | null = null;
  private loadedIsRelief = false;

  constructor(
    private canvas: HTMLCanvasElement,
    cb: SceneCallbacks = {}
  ) {
    this.cb = cb;

    /* ---------- 渲染器 ---------- */
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    /* ---------- 场景 / 相机 ---------- */
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.028);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    this.camera.position.set(0, 3.0, 11.5);
    this.camera.lookAt(0, 2.4, 0);

    this.rig = new THREE.Group();
    this.scene.add(this.rig);

    /* ---------- 灯光 ---------- */
    this.scene.add(new THREE.HemisphereLight(0x8fa4c8, 0x120e08, 0.55));
    const key = new THREE.DirectionalLight(0xfff2d8, 2.1);
    key.position.set(4.5, 8, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fb0ff, 1.15);
    rim.position.set(-6, 3.5, -5);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffd9a0, 0.5);
    fill.position.set(-2, 1, 8);
    this.scene.add(fill);

    this.spot = new THREE.SpotLight(0xfff0cf, 0, 30, Math.PI / 7, 0.45, 1.2);
    this.spot.position.set(0, 12, 0);
    this.spot.target = this.rig;
    this.scene.add(this.spot);
    this.scene.add(this.spot.target);

    /* ---------- 地面 ----------
   大圆盘会在画面里露出硬边（软渲染下雾也救不回来），
   改成「转台 + 一张径向渐隐贴图的巨大平面」，边界自然消失。 */
    const floorTex = makeStarTexture("glow");
    floorTex.wrapS = floorTex.wrapT = THREE.ClampToEdgeWrapping;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 46),
      new THREE.MeshBasicMaterial({
        map: floorTex,
        color: 0x2a2622,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.005;
    this.scene.add(floor);
    this.disposables.push(floor.geometry, floor.material as THREE.MeshBasicMaterial);

    // 承接阴影/反射的暗底：半径收紧到刚好盖住转台，避免露出圆盘边界
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(3.6, 64),
      new THREE.MeshStandardMaterial({
        color: 0x090909,
        roughness: 0.35,
        metalness: 0.7,
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = -0.004;
    this.scene.add(pad);
    this.disposables.push(pad.geometry, pad.material as THREE.MeshStandardMaterial);

    /* ---------- 盒子 ---------- */
    this.boxGroup = new THREE.Group();
    this.rig.add(this.boxGroup);
    this.buildBox();

    /* ---------- 展示转台 ---------- */
    this.disc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.7, 0.16, 72),
      new THREE.MeshStandardMaterial({
        color: 0x161616,
        roughness: 0.22,
        metalness: 0.85,
      })
    );
    this.disc.position.y = 0.08;
    this.rig.add(this.disc);
    const discRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.52, 0.035, 12, 96),
      new THREE.MeshStandardMaterial({
        color: GOLD,
        emissive: GOLD,
        emissiveIntensity: 0.55,
        roughness: 0.3,
        metalness: 1,
      })
    );
    discRing.rotation.x = Math.PI / 2;
    discRing.position.y = 0.17;
    this.rig.add(discRing);

    /* ---------- 藏品挂点 ---------- */
    this.figurePivot = new THREE.Group();
    this.figurePivot.position.set(0, 0.2, 0);
    this.rig.add(this.figurePivot);

    /* ---------- 光柱（惊喜时亮起） ---------- */
    this.shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2.3, 9, 48, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffe9b0,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.shaft.position.y = 4.5;
    this.rig.add(this.shaft);

    /* ---------- 冲击波环 ---------- */
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.0, 96),
      new THREE.MeshBasicMaterial({
        color: 0xfff3cf,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.22;
    this.rig.add(this.ring);

    /* ---------- 星星粒子 ---------- */
    const N = 220;
    const pos = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      sizes[i] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    this.starVel = new Float32Array(N * 4); // vx, vy, vz, spin
    const starTex = makeStarTexture("star");
    const starMat = new THREE.PointsMaterial({
      map: starTex,
      size: 0.42,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
    });
    this.stars = new THREE.Points(geo, starMat);
    this.stars.frustumCulled = false;
    this.rig.add(this.stars);
    this.disposables.push(geo, starMat, starTex);

    this.resize();
    this.applyPerfTier();
    this.loop();
    this.cb.onReady?.();
  }

  /**
   * 性能降级：软件渲染（SwiftShader / llvmpipe）或小核心数设备上，
   * 30 万面 + 220 粒子的场景会掉到个位数帧率。
   * 检测到就跑精简版（关阴影级细节、降粒子、限像素比）。
   */
  private applyPerfTier() {
    const gl = this.renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const r = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    const soft = /swiftshader|llvmpipe|software|basic render/i.test(r);
    const cores = navigator.hardwareConcurrency || 4;
    const low = soft || cores <= 2;
    this.perfLow = low;
    this.renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio, 2));
    this.starCount = low ? 70 : 220;
    if (low) {
      (this.shaft.material as THREE.MeshBasicMaterial).visible = false;
    }
    console.log(`[UnboxScene] renderer="${r}" cores=${cores} → ${low ? "精简档" : "完整档"}`);
  }

  /* ======================================================================
     盒子构建：body 六面贴图 + lid 独立网格（后缘 pivot）
     ====================================================================== */
  private buildBox() {
    const W = 2.0,
      H = 2.8,
      D = 2.0;
    const BW = 2.02,
      BH = 2.2,
      BD = 2.02;
    const LH = 0.82; // 盒盖高

    const tex = (url: string, rx: boolean) => {
      const t = new THREE.TextureLoader().load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      if (rx) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      this.disposables.push(t);
      return t;
    };

    const front = tex("/box/front.png", false);
    const side = tex("/box/side.png", false);
    const back = tex("/box/back.png", false);
    const sideB = side.clone();
    sideB.repeat.x = -1;
    sideB.offset.x = 1;
    sideB.needsUpdate = true;
    this.disposables.push(sideB);

    const plain = (c: number) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, metalness: 0.06 });

    // BoxGeometry 材质顺序：+X, -X, +Y, -Y, +Z, -Z
    const bodyMats = [
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.6, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: sideB, roughness: 0.6, metalness: 0.05 }),
      // +Y 面 = 盒口内腔，开盖后俯视能看到，不能是灰白
      new THREE.MeshStandardMaterial({ color: 0x241c14, roughness: 0.95, metalness: 0.0 }),
      plain(0x0d0d0d),
      new THREE.MeshStandardMaterial({ map: front, roughness: 0.55, metalness: 0.08 }),
      new THREE.MeshStandardMaterial({ map: back, roughness: 0.6, metalness: 0.05 }),
    ];
    bodyMats.forEach((m) => this.disposables.push(m));

    this.body = new THREE.Mesh(new THREE.BoxGeometry(W, BH, D), bodyMats);
    this.body.position.y = 0.16 + BH / 2;
    this.disposables.push(this.body.geometry);

    /* 盒盖：pivot 在后缘 z = -D/2，绕 X 轴旋开 */
    this.lidPivot = new THREE.Group();
    this.lidPivot.position.set(0, this.body.position.y + BH / 2, -D / 2);
    this.lidClosedPos.copy(this.lidPivot.position);
    this.boxGroup.add(this.lidPivot);

    const lidTop = makeLidTopTexture();
    this.disposables.push(lidTop);
    // 盒盖内衬（金色绒面，翻开时正对镜头）
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x2a2118,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.disposables.push(innerMat);
    const lidMats = [
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.6, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: sideB, roughness: 0.6, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: lidTop, roughness: 0.5, metalness: 0.12 }),
      // -Y 面 = 盒盖内衬：翻开时正对镜头，必须是深色内衬而不是灰白
      innerMat,
      new THREE.MeshStandardMaterial({ map: front, roughness: 0.55, metalness: 0.08 }),
      new THREE.MeshStandardMaterial({ map: back, roughness: 0.6, metalness: 0.05 }),
    ];
    lidMats.forEach((m) => this.disposables.push(m));
    this.lid = new THREE.Mesh(new THREE.BoxGeometry(BW, LH, BD), lidMats);
    this.lid.position.set(0, LH / 2, D / 2); // 相对 pivot
    this.disposables.push(this.lid.geometry);
    this.lidPivot.add(this.lid);

    // 金色描边（TOP TOY 金属感）
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(BW * 1.002, LH * 1.002, BD * 1.002)),
      new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55 })
    );
    edges.position.copy(this.lid.position);
    this.disposables.push(edges.geometry, edges.material as THREE.LineBasicMaterial);
    this.lid.add(edges);

    const bodyEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(W * 1.002, BH * 1.002, D * 1.002)),
      new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.4 })
    );
    bodyEdges.position.copy(this.body.position);
    this.disposables.push(bodyEdges.geometry, bodyEdges.material as THREE.LineBasicMaterial);
    this.body.add(bodyEdges);

    this.boxGroup.add(this.body);
  }

  /* ======================================================================
     藏品：优先真 GLB；无模型则回退「橄榄核坯」
     ====================================================================== */
  /** 移除并释放当前展示的模型（占位核坯 / 真 GLB 都走这里） */
  private disposeFigure(obj: THREE.Object3D | null) {
    if (!obj) return;
    this.figurePivot.remove(obj);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose?.();
        const mm = m.material;
        if (Array.isArray(mm)) mm.forEach((x) => x.dispose?.());
        else mm?.dispose?.();
      }
    });
  }

  private clearFigure() {
    this.disposeFigure(this.loadedModel);
    this.loadedModel = null;
    this.loadedIsRelief = false;
    while (this.figurePivot.children.length) {
      this.figurePivot.remove(this.figurePivot.children[0]);
    }
  }

  private makePlaceholder() {
    /* 橄榄核坯：细长球 + 噪声位移，模拟未开雕的核 */
    const geo = new THREE.SphereGeometry(0.52, 72, 72);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = vnoise(v.clone().multiplyScalar(2.4)) - 0.5;
      const n2 = vnoise(v.clone().multiplyScalar(6.5)) - 0.5;
      v.multiplyScalar(1 + n * 0.16 + n2 * 0.05);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6b4a2c,
      roughness: 0.42,
      metalness: 0.12,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(1, 1.5, 1);
    this.disposables.push(geo, mat);
    return mesh;
  }

  /* --------------------------------------------------------------------------
     未建模款式的兜底：用款式参考图做「3D 浮雕」
     —— 不是往平面上贴图：按像素亮度把网格顶点顶起来，得到真几何浮雕，
        有厚度、吃灯光、有高光。深色背景亮度≈0 所以保持平坦，
        只有核体本身被顶起来，边缘再做径向衰减避免出现方形硬边。
        真 GLB 一旦登记，这条路径自动不再走。
     -------------------------------------------------------------------------- */
  private makePhotoRelief(figId: string) {
    const group = new THREE.Group();
    const SEG = 190;
    const SIZE = 2.3;
    const DEPTH = 0.5;
    const PX = 512;

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PX;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    /* 先铺一层底色再建贴图，否则 three 会警告 "no image data found" */
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, PX, PX);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    /* 边缘径向渐隐（做 alphaMap），让薄板化开在暗场里 */
    const fade = document.createElement("canvas");
    fade.width = fade.height = PX;
    const fctx = fade.getContext("2d")!;
    const rg = fctx.createRadialGradient(PX / 2, PX / 2, PX * 0.2, PX / 2, PX / 2, PX / 2);
    rg.addColorStop(0, "#ffffff");
    rg.addColorStop(0.7, "#b4b4b4");
    rg.addColorStop(1, "#000000");
    fctx.fillStyle = rg;
    fctx.fillRect(0, 0, PX, PX);
    const alphaTex = new THREE.CanvasTexture(fade);

    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      alphaMap: alphaTex,
      transparent: true,
      roughness: 0.46,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const plate = new THREE.Mesh(geo, mat);
    plate.position.y = SIZE / 2;
    group.add(plate);

    /* 背板：从背面看不露出镜像正图 */
    const backGeo = new THREE.PlaneGeometry(SIZE * 0.96, SIZE * 0.96);
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x120e0a,
      roughness: 0.72,
      metalness: 0.28,
    });
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(0, SIZE / 2, -0.03);
    back.rotation.y = Math.PI;
    group.add(back);

    this.disposables.push(geo, mat, tex, alphaTex, backGeo, backMat);

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(0, 0, PX, PX);
      const s = Math.max(PX / img.width, PX / img.height);
      const w = img.width * s;
      const h = img.height * s;
      ctx.drawImage(img, (PX - w) / 2, (PX - h) / 2, w, h);
      tex.needsUpdate = true;

      const data = ctx.getImageData(0, 0, PX, PX).data;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) / SIZE + 0.5;
        const v = 0.5 - pos.getY(i) / SIZE;
        const px = Math.min(PX - 1, Math.max(0, Math.round(u * (PX - 1))));
        const py = Math.min(PX - 1, Math.max(0, Math.round(v * (PX - 1))));
        const o = (py * PX + px) * 4;
        const lum =
          (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) / 255;
        /* 深色背景 → 0，核体（有木色亮度）→ 顶起来 */
        let d = Math.max(0, (lum - 0.1) / 0.9);
        d = Math.pow(d, 1.05);
        const rr = Math.min(1, Math.hypot(u - 0.5, v - 0.5) / 0.5);
        d *= Math.max(0, 1 - Math.pow(rr, 2.8));
        pos.setZ(i, d * DEPTH);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
    };
    img.src = `/figures/${figId}.jpg`;

    return group;
  }

  private async loadFigure(figId: string, modelUrl?: string, useProxy = false) {
    this.clearFigure();
    this.currentFigure = { id: figId, modelUrl };
    this.pendingModelUrl = modelUrl;

    if (!modelUrl) {
      /* 没有真模型时给「参考图 3D 浮雕」，比一颗光核胚更像成品 */
      this.loadedIsRelief = true;
      this.loadedModel = this.makePhotoRelief(figId);
      this.figurePivot.add(this.loadedModel);
      this.cb.onModelState?.("placeholder");
      return;
    }
    this.loadedIsRelief = false;

    /* 慢设备：先摆核坯顶位，保证时间轴节奏不被 GLB 加载拖慢 */
    if (useProxy) {
      this.loadedModel = this.makePlaceholder();
      this.figurePivot.add(this.loadedModel);
    }

    this.cb.onModelState?.("loading");
    try {
      const gltf: any = await this.loader.loadAsync(modelUrl);
      const root: THREE.Object3D = gltf.scene;
      // 归一化尺寸与落地
      const bbox = new THREE.Box3().setFromObject(root);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = 2.75 / maxDim;
      root.scale.setScalar(s);
      const b2 = new THREE.Box3().setFromObject(root);
      const c2 = b2.getCenter(new THREE.Vector3());
      root.position.set(-c2.x, -b2.min.y, -c2.z);
      // 贴图色彩空间修正
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mm = m.material as THREE.MeshStandardMaterial;
          const fix = (x: THREE.MeshStandardMaterial) => {
            const t = x.map;
            if (t && (t as any).isTexture) {
              if ((t as THREE.Texture).colorSpace !== THREE.SRGBColorSpace)
                (t as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
            }
          };
          if (Array.isArray(mm)) mm.forEach(fix);
          else fix(mm);
        }
      });
      // 换掉占位核坯（会同步 dispose）
      this.disposeFigure(this.loadedModel);
      this.loadedModel = root;
      this.figurePivot.add(root);
      this.cb.onModelState?.("ok");
    } catch (e) {
      console.warn("[UnboxScene] GLB 加载失败，回退核坯：", e);
      if (!this.loadedModel) {
        this.loadedModel = this.makePlaceholder();
        this.figurePivot.add(this.loadedModel);
      }
      this.cb.onModelState?.("placeholder");
    }
  }

  /* ======================================================================
     星星粒子爆发
     ====================================================================== */
  private burstStars(count = 150) {
    const cap = this.starCount;
    const n = Math.min(count, cap);
    const pos = this.stars.geometry.attributes.position as THREE.BufferAttribute;
    const size = this.stars.geometry.attributes.size as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const sarr = size.array as Float32Array;
    let used = 0;
    for (let i = 0; i < arr.length / 3 && used < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.5;
      arr[i * 3 + 1] = 0.2 + Math.random() * 0.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      const a = Math.random() * Math.PI * 2;
      const up = 3.4 + Math.random() * 4.2;
      const sp = 1.2 + Math.random() * 2.6;
      this.starVel[i * 4] = Math.cos(a) * sp;
      this.starVel[i * 4 + 1] = up;
      this.starVel[i * 4 + 2] = Math.sin(a) * sp;
      this.starVel[i * 4 + 3] = (Math.random() - 0.5) * 6;
      sarr[i] = 1;
      used++;
    }
    for (let i = used; i < arr.length / 3; i++) sarr[i] = 0;
    pos.needsUpdate = true;
    size.needsUpdate = true;
  }

  private updateStars(dt: number) {
    const pos = this.stars.geometry.attributes.position as THREE.BufferAttribute;
    const size = this.stars.geometry.attributes.size as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const sarr = size.array as Float32Array;
    let alive = false;
    for (let i = 0; i < arr.length / 3; i++) {
      if (sarr[i] <= 0) continue;
      alive = true;
      this.starVel[i * 4 + 1] -= 5.2 * dt;
      arr[i * 3] += this.starVel[i * 4] * dt;
      arr[i * 3 + 1] += this.starVel[i * 4 + 1] * dt;
      arr[i * 3 + 2] += this.starVel[i * 4 + 2] * dt;
      sarr[i] = Math.max(0, sarr[i] - dt * 0.75);
    }
    if (alive) {
      pos.needsUpdate = true;
      size.needsUpdate = true;
    }
  }

  /* ======================================================================
     播放：完整开箱时间轴
     ====================================================================== */
  play(figId: string, modelUrl?: string) {
    this.tl?.kill();
    const tl = gsap.timeline({
      onComplete: () => this.cb.onPhase?.("reveal"),
    });
    this.tl = tl;

    const mat = this.stars.material as THREE.PointsMaterial;
    const shaftMat = this.shaft.material as THREE.MeshBasicMaterial;
    const ringMat = this.ring.material as THREE.MeshBasicMaterial;

    /* 复位 */
    this.lidPivot.rotation.x = 0;
    this.boxGroup.position.set(0, 0, 0);
    this.boxGroup.rotation.set(0, 0, 0);
    this.figurePivot.scale.setScalar(1);
    this.figurePivot.position.set(0, 0.2, 0);
    mat.opacity = 0;
    shaftMat.opacity = 0;
    ringMat.opacity = 0;
    this.spot.intensity = 0;
    if (this.loadedModel) this.loadedModel.position.y = this.loadedModel.position.y;

    /* --- 载入藏品（异步，不阻塞时间轴） ---
       注意：开盒前/开盒过程中藏品要藏在盒子里（scale 0），
       否则会看见它"本来就浮在盒上方"，惊喜感就废了。
       slow 模式下 GLB 加载要好几秒，用占位核坯顶位，
       真模型到位后无缝替换，动画节奏不受影响。 */
    this.figurePivot.scale.setScalar(0);
    this.figurePivot.visible = true;
    const slow = this.perfLow;
    this.loadFigure(figId, modelUrl, slow);

    /* 0 → 悬停期待：盒子微微上浮 + 顶盖缝隙漏光 */
    tl.to(this.boxGroup.position, { y: 0.25, duration: 0.35, ease: "power2.out" })
      .add(() => this.cb.onPhase?.("lid"), 0);

    /* 1 → 盒盖弹开（带过冲） */
    tl.to(this.lidPivot.rotation, { x: -2.15, duration: 0.85, ease: "back.out(2.2)" }, 0.3)
      .to(this.lidPivot.position, { z: -1.35, y: "+=0.12", duration: 0.85, ease: "power2.out" }, 0.3)
      .to(this.boxGroup.position, { y: 0.0, duration: 0.6, ease: "power2.inOut" }, 0.55)
      .add(() => this.cb.onPhase?.("shake"), 1.05);

    /* 2 → 摇晃：GSAP keyframes 抖 z 轴 + 位移 */
    tl.to(this.boxGroup.rotation, { z: 0.06, duration: 0.11, repeat: 5, yoyo: true, ease: "sine.inOut" }, 1.1)
      .to(this.boxGroup.position, { x: 0.12, duration: 0.11, repeat: 5, yoyo: true, ease: "sine.inOut" }, 1.1)
      .to(this.boxGroup.rotation, { y: 0.14, duration: 0.12, repeat: 3, yoyo: true, ease: "sine.inOut" }, 1.55)
      .to(this.boxGroup.rotation, { z: 0, y: 0, duration: 0.2, ease: "power2.out" }, 2.05)
      .add(() => this.cb.onPhase?.("stars"), 2.0);

    /* 3 → 冒出星星（两波） */
    tl.add(() => this.burstStars(90), 2.0)
      .to(mat, { opacity: 1, duration: 0.2, ease: "power2.out" }, 2.0)
      .add(() => this.burstStars(140), 2.35)
      .add(() => this.cb.onPhase?.("surprise"), 2.7);

    /* 4 → 惊喜感：冲击波 + 光柱 + 推镜 */
    tl.fromTo(
      this.ring.scale,
      { x: 0.4, y: 0.4, z: 0.4 },
      { x: 5.2, y: 5.2, z: 5.2, duration: 1.05, ease: "power2.out" },
      2.72
    )
      .fromTo(ringMat, { opacity: 0.95 }, { opacity: 0, duration: 1.05, ease: "power2.out" }, 2.72)
      .fromTo(shaftMat, { opacity: 0 }, { opacity: 0.5, duration: 0.4 }, 2.78)
      .to(shaftMat, { opacity: 0.16, duration: 1.2 }, 3.2)
      /* 聚光灯强度（GSAP 不能直接 tween number，用代理对象） */
    const spotProxy = { i: 0 };
    tl.fromTo(
      spotProxy,
      { i: 0 },
      {
        i: 260,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => (this.spot.intensity = spotProxy.i),
      },
      2.8
    )
      .to(this.camera.position, { z: 8.2, y: 3.6, duration: 1.5, ease: "power2.inOut" }, 2.8)
      .to(this.lookTarget, { y: 3.4, duration: 1.5, ease: "power2.inOut" }, 2.8)
      .to(this.rig.rotation, { y: -0.32, duration: 1.6, ease: "power1.inOut" }, 2.8)
      /* 盒子退场 */
      .to(this.boxGroup.position, { y: -5.5, duration: 0.85, ease: "power2.in" }, 3.05)
      .to(this.boxGroup.scale, { x: 0.7, y: 0.7, z: 0.7, duration: 0.85 }, 3.05);

    /* 5 → 出款：藏品升起 + 落地弹跳 + 自转
       —— 从 scale 0 长出来，抬到视线中心偏上，给底部信息条留出空间 */
    tl.addLabel("reveal", 4.5);
    tl.to(this.figurePivot.position, { y: 2.35, duration: 0.9, ease: "power3.out" }, 3.05)
      .to(this.figurePivot.scale, { x: 0.86, y: 0.72, z: 0.86, duration: 0.42, ease: "back.out(2)" }, 3.05)
      .to(this.figurePivot.scale, { x: 0.8, y: 0.8, z: 0.8, duration: 0.42, ease: "elastic.out(1, 0.42)" }, 4.11)
      .add(() => this.cb.onPhase?.("reveal"), 4.5);

    return tl;
  }

/* 关闭/重置到待开状态 */
reset() {
    this.tl?.kill();
    this.lidPivot.rotation.x = 0;
    this.lidPivot.position.copy(this.lidClosedPos);
    this.boxGroup.position.set(0, 0.25, 0);
    this.boxGroup.scale.setScalar(1);
    this.boxGroup.rotation.set(0, 0, 0);
    this.figurePivot.position.set(0, 0.2, 0);
    this.figurePivot.scale.setScalar(0);
    this.rig.rotation.set(0, 0, 0);
    this.camera.position.set(0, 3.0, 11.5);
    this.lookTarget.set(0, 2.4, 0);
    (this.stars.material as THREE.PointsMaterial).opacity = 0;
    (this.shaft.material as THREE.MeshBasicMaterial).opacity = 0;
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0;
    this.spot.intensity = 0;
  }

  setFigureHidden(hidden: boolean) {
    this.figurePivot.visible = !hidden;
  }

  /* ---- 验收辅助：把内部状态挂到 window，供 CDP 轮询 ---- */
  debugState() {
    const m = this.loadedModel;
    return {
      phase: this.tl ? this.tl.labels : null,
      figureScale: +this.figurePivot.scale.x.toFixed(3),
      figureY: +this.figurePivot.position.y.toFixed(2),
      hasModel: !!m,
      modelChildren: m ? m.children.length : 0,
      boxY: +this.boxGroup.position.y.toFixed(2),
      lidAngle: +this.lidPivot.rotation.x.toFixed(2),
      starsOpacity: +((this.stars.material as THREE.PointsMaterial).opacity).toFixed(2),
      renderer: this.perfLow ? "low" : "full",
    };
  }

  resize() {
    const el = this.canvas.parentElement;
    if (!el) return;
    const w = el.clientWidth || 800;
    const h = el.clientHeight || 600;
    this.renderer.setPixelRatio(this.perfLow ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min((performance.now() - this.t0) / 1000, 0.05);
    this.t0 = performance.now();
    this.updateStars(dt);
    if (this.loadedModel) {
      /* 浮雕板是单面薄片，来回摆比整圈转好看（背面是暗板） */
      if (this.loadedIsRelief) {
        this.loadedModel.rotation.y = Math.sin(performance.now() * 0.00045) * 0.5;
      } else {
        this.loadedModel.rotation.y += dt * 0.55;
      }
    }
    this.disc.rotation.y += dt * 0.22;
    this.rig.position.y = Math.sin(performance.now() * 0.0006) * 0.045;
    this.camera.lookAt(this.lookTarget);
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.tl?.kill();
    this.clearFigure();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
  }
}
