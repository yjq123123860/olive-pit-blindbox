"use client";
import { FIGURES, SERIES_META, type SeriesKey } from "@/lib/figures";

/* 藏品册：奶油底「精品陈列架」——12 款透明底榄雕排在木架线上，款名 + 系列在下方。
   参考用户给的陈列图改版，替换原 lucky-canvas 深色格子。 */
export default function CollectionSection({
  owned,
  collected,
  total,
}: {
  owned: Set<string>;
  collected: number;
  total: number;
  onPick?: (id: string) => void;
}) {
  const pct = total ? Math.round((collected / total) * 100) : 0;
  const dots: Record<SeriesKey, string> = { J: "#c5a35b", X: "#7cff9b", M: "#e60012", W: "#6aa6ff" };

  return (
    <section id="collection" className="relative bg-cream overflow-hidden py-24">
      {/* 顶部暖光，营造展厅感 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#efe6d4] to-transparent" />

      <div className="toy-wrap relative z-10">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
          <div>
            <div className="chapter-no text-gold-2 text-sm mb-3">03 / 03</div>
            <h2 className="display text-ink text-[64px] md:text-[88px]">藏品册</h2>
            <div className="display text-gold-2 text-2xl mt-1">THE COLLECTION</div>
          </div>

          <div className="min-w-[240px]">
            <div className="flex items-end justify-between mb-2">
              <span className="text-ink/60 text-sm tracking-widest">已收集</span>
              <span className="display text-ink text-3xl">
                {collected}
                <span className="text-gold-2 text-lg">/{total}</span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-ink/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gold transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* 关闭网页按钮（收藏册区块）。浏览器策略：脚本开的窗口才能无条件 close */}
            <button
              type="button"
              title="关闭网页"
              onClick={() => {
                try {
                  window.open("", "_self");
                } catch (_e) {
                  /* ignore */
                }
                window.close();
              }}
              className="mt-4 ml-auto block px-5 py-2 rounded-full border border-gold-2/60 text-gold-2 hover:bg-gold-2 hover:text-ink text-xs tracking-[0.25em] transition-colors"
            >
              关闭网页 ✕
            </button>
          </div>
        </div>

        {/* 4 列陈列架 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-16">
          {FIGURES.map((f) => {
            const has = owned.has(f.id);
            return (
              <div key={f.id} className="group flex flex-col items-center text-center">
                {/* 榄雕卡片：正视原图裁成的 4:5 深色卡（完整、不抠掩膜） */}
                <img
                  src={f.img}
                  alt={f.name}
                  loading="lazy"
                  style={{ opacity: has ? 1 : 0.4 }}
                  className="w-full aspect-[4/5] object-cover rounded-2xl ring-1 ring-ink/10 shadow-[0_14px_26px_rgba(70,50,25,0.28)] transition-transform duration-500 group-hover:-translate-y-1.5"
                />
                {/* 木架线 */}
                <div className="mt-3 h-[7px] w-full rounded-full bg-gradient-to-r from-[#e0d2b4] via-[#cbb489] to-[#e0d2b4] shadow-[0_3px_8px_rgba(90,70,40,0.22)]" />
                {/* 款名 + 系列 */}
                <div className="mt-4 text-ink font-bold text-base tracking-wide">{f.name}</div>
                <div className="text-ink/45 text-[11px] tracking-[0.25em] mt-1">
                  {SERIES_META[f.series].title}
                </div>
              </div>
            );
          })}
        </div>

        {/* 系列图例 */}
        <div className="mt-20 grid md:grid-cols-4 gap-4">
          {(["J", "X", "M", "W"] as const).map((k) => (
            <div key={k} className="rounded-xl bg-paper/70 border border-ink/10 p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full" style={{ background: dots[k] }} />
                <span className="font-bold text-ink">{SERIES_META[k].title}</span>
              </div>
              <div className="text-ink/50 text-xs">{SERIES_META[k].sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
