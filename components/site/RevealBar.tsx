"use client";
import { useEffect, useState } from "react";
import type { Figure } from "@/lib/figures";
import { RARITY_META } from "@/lib/figures";

/* 乱码还原名字（轻量解密动效，致敬 react-bits DecryptedText 技法） */
function useScramble(text: string, run: number) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    const chars = "榄雕核刻0123456789ABCDEF#@%&*";
    const total = 16;
    let frame = 0;
    setOut(
      text
        .split("")
        .map((c) => (c === " " ? " " : chars[Math.floor(Math.random() * chars.length)]))
        .join("")
    );
    const id = setInterval(() => {
      frame++;
      const n = Math.floor((text.length * frame) / total);
      setOut(
        text.slice(0, n) +
          text
            .slice(n)
            .split("")
            .map(() => chars[Math.floor(Math.random() * chars.length)])
            .join("")
      );
      if (frame >= total) {
        clearInterval(id);
        setOut(text);
      }
    }, 40);
    return () => clearInterval(id);
  }, [text, run]);
  return out;
}

/**
 * 出款信息条 —— 不再是全屏遮罩。
 * 3D 藏品在首屏场景里升起，这个浮层只占底部一条，
 * 保证建模成果始终可见（TOP TOY 的商品条逻辑）。
 */
export default function RevealBar({
  fig,
  isNew,
  run,
  onClose,
  onAgain,
}: {
  fig: Figure;
  isNew: boolean;
  run: number;
  onClose: () => void;
  onAgain: () => void;
}) {
  const name = useScramble(fig.name, run);
  const hidden = fig.rarity === "h";
  const rc = RARITY_META[fig.rarity];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none px-6 pb-6">
      <div
        className="reveal-card pointer-events-auto mx-auto w-full max-w-[1180px] rounded-2xl px-8 py-6 flex items-center gap-8"
        style={{
          background: hidden
            ? "linear-gradient(120deg,rgba(46,36,16,.95),rgba(12,10,8,.95))"
            : "linear-gradient(120deg,rgba(24,24,24,.94),rgba(10,10,10,.94))",
          border: hidden ? "1px solid rgba(232,194,122,.55)" : "1px solid rgba(255,255,255,.14)",
          boxShadow: "0 30px 80px rgba(0,0,0,.65)",
          backdropFilter: "blur(14px)",
        }}
      >
        {/* 左：3D 缩略（静态参考图，暗示真实模型） */}
        <div
          className="w-[104px] h-[104px] shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.45)", border: `1px solid ${rc.color}33` }}
        >
          <img src={fig.img} alt={fig.name} className="w-full h-full object-contain" />
        </div>

        {/* 中：信息 */}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] tracking-[0.3em] text-white/40 mb-1.5">
            {hidden ? "隐藏款 · 解锁" : isNew ? "NEW · 新藏入库" : "重复 · 已有"}
          </div>
          <h3
            className="display text-[40px] leading-none mb-2.5"
            style={{ color: rc.color === "#C9C2B4" ? "#efe9dd" : rc.color }}
          >
            {name}
          </h3>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-3 py-1 rounded-full text-[11px] border border-white/20 text-white/70">
              系列 {fig.series}
            </span>
            <span
              className="px-3 py-1 rounded-full text-[11px] border"
              style={{ borderColor: rc.color + "66", color: rc.color }}
            >
              {rc.label}
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] border border-white/20 text-white/70">
              {fig.proto}
            </span>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">{fig.line}</p>
        </div>

        {/* 右：操作 */}
        <div className="flex flex-col gap-3 shrink-0">
          <button
            onClick={onAgain}
            className="btn-red px-8 py-3.5 rounded-full font-bold tracking-widest whitespace-nowrap"
          >
            再开一颗
          </button>
          <button
            onClick={onClose}
            className="btn-ghost px-8 py-3.5 rounded-full text-white/90 tracking-widest whitespace-nowrap"
          >
            <span>收入藏品册</span>
          </button>
        </div>
      </div>
    </div>
  );
}
