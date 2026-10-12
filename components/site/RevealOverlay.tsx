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
      setOut(text.slice(0, n) + text.slice(n).split("").map(() => chars[Math.floor(Math.random() * chars.length)]).join(""));
      if (frame >= total) {
        clearInterval(id);
        setOut(text);
      }
    }, 40);
    return () => clearInterval(id);
  }, [text, run]);
  return out;
}

export default function RevealOverlay({
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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: hidden ? "rgba(4,3,2,.94)" : "rgba(8,8,8,.86)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      {hidden && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 40%, transparent 0deg, rgba(232,194,122,.16) 20deg, transparent 40deg, transparent 320deg, rgba(232,194,122,.16) 340deg, transparent 360deg)",
          }}
        />
      )}

      <div
        className="reveal-card relative w-full max-w-[440px] rounded-2xl overflow-hidden text-center"
        style={{
          background: "linear-gradient(160deg,#1b1814,#100e0b)",
          border: hidden ? "1px solid rgba(232,194,122,.5)" : "1px solid rgba(255,255,255,.12)",
          boxShadow: "0 40px 90px rgba(0,0,0,.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-6 pb-2">
          <div className="text-[11px] tracking-[0.3em] text-white/40">
            {hidden ? "隐藏款 · 解锁" : isNew ? "NEW · 新藏入库" : "重复 · 已有"}
          </div>
        </div>

        <div className="px-8">
          <img
            src={fig.img}
            alt={fig.name}
            className="w-full aspect-square object-contain rounded-xl mb-4"
            style={{ border: `1px solid ${rc.color}33`, background: "rgba(0,0,0,.35)" }}
          />
        </div>

        <div className="px-8 pb-8">
          <h3
            className="display text-4xl mb-2"
            style={{ color: rc.color === "#C9C2B4" ? "#efe9dd" : rc.color }}
          >
            {name}
          </h3>

          <div className="flex items-center justify-center gap-2 mb-4">
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

          <p className="text-white/60 text-sm leading-relaxed mb-6">{fig.line}</p>

          <div className="flex items-center gap-3">
            <button onClick={onAgain} className="btn-red flex-1 py-3.5 rounded-full font-bold tracking-widest">
              再开一颗
            </button>
            <button
              onClick={onClose}
              className="btn-ghost flex-1 py-3.5 rounded-full text-white/90 tracking-widest"
            >
              <span>收入藏品册</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}