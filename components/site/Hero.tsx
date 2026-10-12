"use client";
import type { ReactNode } from "react";

/* 首屏：全幅暗场 + 3D 开箱舞台主视觉 + 竖排章节序号（TOP TOY 01/03） */
export default function Hero({
  stage,
  onDraw,
  busy,
  collected,
  total,
  phaseLabel,
}: {
  stage: ReactNode;
  onDraw: () => void;
  busy: boolean;
  collected: number;
  total: number;
  phaseLabel?: string;
}) {
  return (
    <section id="draw" className="relative min-h-screen bg-ink overflow-hidden grid-45">
      <div className="hero-glow absolute inset-0" />

      {/* 左侧竖排章节序号 */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-4 z-20">
        <span className="chapter-no text-white/70 text-sm">01 / 03</span>
        <div className="flex flex-col items-center gap-2">
          <span className="w-px h-12 bg-gold" />
          <span className="w-px h-6 bg-white/20" />
          <span className="w-px h-6 bg-white/20" />
        </div>
        <span className="pager text-white/30 text-[10px]">BLIND BOX</span>
      </div>

      <div className="toy-wrap relative z-10 min-h-screen flex items-center gap-6 pt-[76px]">
        {/* 左：文案 */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/50 text-gold text-[11px] tracking-[0.25em] mb-6">
            非遗盲盒 · 榄雕
          </div>

          <h1 className="text-white leading-[0.9]">
            <span className="display block text-[88px] md:text-[120px]">开一颗</span>
            <span className="display block text-[52px] md:text-[68px] gold-text mt-2">
              ONE PIT · ONE WORLD
            </span>
          </h1>

          <p className="mt-6 text-white/60 text-base leading-relaxed max-w-md">
            一颗橄榄核，两百年潮州刀工。旧派经典、新派创新、中国现代话、西方，
            四大系列共十二款，把一整座世界刻进一颗核里。
          </p>

          <div className="mt-9 flex items-center gap-4">
            <button
              onClick={onDraw}
              disabled={busy}
              className="btn-red px-9 py-4 rounded-full font-bold text-lg tracking-widest disabled:opacity-50 disabled:pointer-events-none"
            >
              {busy ? (phaseLabel || "开盒中…") : "开 一 颗"}
            </button>
            <a
              href="#collection"
              className="btn-ghost px-8 py-4 rounded-full text-white/90 tracking-widest"
            >
              <span>藏品册 {collected}/{total}</span>
            </a>
          </div>
        </div>

        {/* 右：3D 开箱舞台（真 Three.js 场景） */}
        <div className="flex-1 h-[min(78vh,760px)] min-h-[560px]">{stage}</div>
      </div>
    </section>
  );
}
