/* ==========================================================================
   抽取逻辑（沿用策划案 §2.2 的规则骨架，池子换成《十二榄雕艺术三视图》的 12 款）
     · 12 款 · 四大系列：普通 8 / 稀有 4，一盒一款
     · 隐藏款：集齐该系列全部普通款后解锁，不可随机获得（本套暂无隐藏款，规则保留）
     · 保底：连续 5 次内必出 1 次稀有
   用可变 state 对象实现（配合 React useRef），抽卡为命令式。
   ========================================================================== */
import { FIGURES, POOL, type Figure, type SeriesKey } from "./figures";

export interface BoxState {
  owned: Record<string, boolean>;
  dupes: number;
  pulls: number;
  sinceRare: number;
  lastId: string | null;
}

export const createBoxState = (): BoxState => ({
  // 用户要求：收藏册直接全开展示，不做逐个抽取的收集进度 → 初始即全收集
  owned: Object.fromEntries(FIGURES.map((f) => [f.id, true])),
  dupes: 0,
  pulls: 0,
  sinceRare: 0,
  lastId: null,
});

export interface DrawResult {
  fig: Figure;
  isNew: boolean;
  hidden: boolean;
}

const PITY = 5;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/* 某系列的普通款是否已集齐 → 该系列隐藏款解锁 */
export function hiddenUnlocked(state: BoxState, fig: Figure) {
  return FIGURES.filter((f) => f.series === fig.series && f.rarity === "n").every(
    (f) => state.owned[f.id]
  );
}

export function unlockedHidden(state: BoxState) {
  return FIGURES.filter((f) => f.rarity === "h" && hiddenUnlocked(state, f));
}

/* 未收集的优先，全收集了再允许出重复 */
function preferUnowned(state: BoxState, pool: string[]) {
  const un = pool.filter((id) => !state.owned[id]);
  return un.length ? un : pool;
}

function commit(state: BoxState, id: string): DrawResult {
  const isNew = !state.owned[id];
  if (isNew) state.owned[id] = true;
  else state.dupes++;
  const fig = FIGURES.find((f) => f.id === id)!;
  return { fig, isNew, hidden: fig.rarity === "h" };
}

export function draw(state: BoxState): DrawResult {
  state.pulls++;

  // 验收调试口：?fig=A4 强制指定款式（3D 模型 / 信息条 / 藏品册保持一致）
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("fig");
    if (q) {
      const id = q.toUpperCase();
      if (FIGURES.some((f) => f.id === id)) {
        state.lastId = id;
        return commit(state, id);
      }
    }
  }

  // 用户要求：每次抽盲盒只能抽到弥勒佛（J1，云端 image-to-3D 精品，唯一达标的模型）
  // （上面的 ?fig= 调试口保留，供验收强制指定款式；正常点击无 ?fig 时恒定出 J1）
  state.sinceRare = 0;
  state.lastId = "J1";
  return commit(state, state.lastId);
}

export const collected = (state: BoxState) => Object.keys(state.owned).length;
export const total = () => FIGURES.length;

export function seriesDone(state: BoxState, s: SeriesKey) {
  return FIGURES.filter((f) => f.series === s).every((f) => state.owned[f.id]);
}