/* ==========================================================================
   数据层 · 12 款 · 四大系列
   来源：用户提供的《十二榄雕艺术三视图：四大系列》（每款含正/侧/背三视图）
     旧派·经典 J / 新派·创新 X / 中国现代话 M / 西方 W
   稀有度：每系列第 3 款为稀有（4 稀有 + 8 普通），可按需改。
   ========================================================================== */

export type Rarity = "n" | "r" | "h";
export type SeriesKey = "J" | "X" | "M" | "W";

export interface Figure {
  id: string;
  name: string;
  series: SeriesKey;
  rarity: Rarity;
  proto: string; // 造型原型
  line: string; // 一句文案
  tone: string; // 气质标签
  img: string; // 参考图路径（切自三视图正面）
}

const img = (id: string) => `/figures/${id}.jpg`;

export const FIGURES: Figure[] = [
  /* ---- 旧派 · 经典 ---- */
  { id: "J1", name: "弥勒佛", series: "J", rarity: "n", proto: "弥勒坐像", line: "笑起来的时候，核本身的圆正好当肚子", tone: "用上核本身的圆", img: img("J1") },
  { id: "J2", name: "龙舟船", series: "J", rarity: "n", proto: "核舟", line: "船头的龙首，是从核的脐眼上起的刀", tone: "龙首从脐眼起刀", img: img("J2") },
  { id: "J3", name: "山水", series: "J", rarity: "r", proto: "山水楼台", line: "一棵松、一间亭、一道水，全在一颗核里", tone: "一核之内有山水", img: img("J3") },

  /* ---- 新派 · 创新 ---- */
  { id: "X1", name: "吉祥象", series: "X", rarity: "n", proto: "吉象", line: "象鼻卷起的那一下，把核纹也卷了进去", tone: "鼻子卷着核纹", img: img("X1") },
  { id: "X2", name: "蒸汽朋克机械甲虫", series: "X", rarity: "n", proto: "甲壳 + 齿轮", line: "每一道甲壳缝里都塞着一枚小齿轮", tone: "缝里都是齿轮", img: img("X2") },
  { id: "X3", name: "宇航员", series: "X", rarity: "r", proto: "宇航服", line: "面罩上倒映着的，是一颗橄榄核", tone: "面罩里的倒影是核", img: img("X3") },

  /* ---- 中国现代话 ---- */
  { id: "M1", name: "黑神话·悟空", series: "M", rarity: "n", proto: "战甲 + 长棍", line: "棍子横过来，正好卡住核的两端", tone: "棍子卡住核", img: img("M1") },
  { id: "M2", name: "福舫", series: "M", rarity: "n", proto: "楼船", line: "船帆一层压一层，压的是核的天然纹路", tone: "帆是核的纹路", img: img("M2") },
  { id: "M3", name: "赛博朋克城市", series: "M", rarity: "r", proto: "霓虹街区", line: "把一座城塞进一颗核，灯还亮着", tone: "一核装一座城", img: img("M3") },

  /* ---- 西方 ---- */
  { id: "W1", name: "亚瑟王", series: "W", rarity: "n", proto: "骑士 + 狮盾", line: "盾牌上的那头狮子，比核纹还细", tone: "狮子比核纹细", img: img("W1") },
  { id: "W2", name: "耶稣", series: "W", rarity: "n", proto: "牧者立像", line: "衣褶垂下来，顺着核的弧度走", tone: "衣褶顺着核走", img: img("W2") },
  { id: "W3", name: "Roblox 方块角色", series: "W", rarity: "r", proto: "方块人", line: "方头方脑，却是用刀一刀一刀削出来的", tone: "方块也是削出来的", img: img("W3") },
];

export const SERIES_META: Record<SeriesKey, { title: string; sub: string; hint: string }> = {
  J: { title: "旧派 · 经典", sub: "刀口里长出来的中国", hint: "核舟、弥勒、山水——几百年前就刻在核上的东西。" },
  X: { title: "新派 · 创新", sub: "老手艺碰新题材", hint: "象、机械甲虫、宇航员，用刻刀去追新东西。" },
  M: { title: "中国现代话", sub: "一核装一座城", hint: "悟空、福舫、赛博朋克城市，把今天的中国刻进去。" },
  W: { title: "西方", sub: "一核万里", hint: "亚瑟王、耶稣、方块人——中国刀，雕别人的故事。" },
};

export const RARITY_META: Record<Rarity, { label: string; color: string }> = {
  n: { label: "普通", color: "#C9C2B4" },
  r: { label: "稀有", color: "#7CFF9B" },
  h: { label: "隐藏", color: "#E8C27A" },
};

/* 抽取池 */
export const POOL: Record<Rarity, string[]> = {
  n: FIGURES.filter((f) => f.rarity === "n").map((f) => f.id),
  r: FIGURES.filter((f) => f.rarity === "r").map((f) => f.id),
  h: FIGURES.filter((f) => f.rarity === "h").map((f) => f.id),
};

export const byId = (id: string) => FIGURES.find((f) => f.id === id)!;
