/* ==========================================================================
   3D 模型映射表（由 _auto3d.py 自动生成，勿手改）
   ---------------------------------------------------------------------------
   key = 款式 id，value = /models/{id}.glb。
   两款来源：① 云端 image-to-3D（混元 3D，有机纹理，受限 5 次/天）；
              ② 自建「三视图视觉外壳」（_build_hull.py，零额度，逐顶点色）。
   未登记 → UnboxScene 回退到「橄榄核坯」程序化几何。
   ========================================================================== */

export const MODEL_URLS: Record<string, string> = {
  J1: "/models/J1.glb",
  J2: "/models/J2.glb",
  J3: "/models/J3.glb",
  M1: "/models/M1.glb",
  M2: "/models/M2.glb",
  M3: "/models/M3.glb",
  W1: "/models/W1.glb",
  W2: "/models/W2.glb",
  W3: "/models/W3.glb",
  X1: "/models/X1.glb",
  X2: "/models/X2.glb",
  X3: "/models/X3.glb",
};
