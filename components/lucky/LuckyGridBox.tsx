"use client";

/* ==========================================================================
   藏品册 6×2 —— 复用 lucky-canvas 官方 <LuckyGrid>（@lucky-canvas/react）。
   已收集 = 显示实物参考图 + 稀有度底色；未收集 = 深底 + 锁符。
   owned 变化时用 key 强制重挂载，确保新图片进入 ImageCache 并重绘。
   12 款 → 6 列 × 2 行（改款数时同步改 COLS/ROWS）。
   ========================================================================== */
import { useMemo } from "react";
import dynamic from "next/dynamic";
import { FIGURES } from "@/lib/figures";

const LuckyGrid: any = dynamic(
  () => import("@lucky-canvas/react").then((m) => m.LuckyGrid),
  { ssr: false }
);

const COLS = 6;
const ROWS = 2;
const W = 1500;
const H = 460;

function cellBg(_rarity: string, owned: boolean) {
  // 统一深色底，去掉稀有度的绿/金底（用户：花花绿绿）。已收集=稍亮，未收集=更暗。
  return owned ? "#1c1a16" : "#15130f";
}

export default function LuckyGridBox({
  owned,
  onPick,
}: {
  owned: Set<string>;
  onPick?: (id: string) => void;
}) {
  const ownedKey = useMemo(() => Array.from(owned).sort().join(","), [owned]);

  const prizes = useMemo(
    () =>
      FIGURES.map((f, i) => {
        const has = owned.has(f.id);
        return {
          id: f.id,
          x: i % COLS,
          y: Math.floor(i / COLS),
          background: cellBg(f.rarity, has),
          borderRadius: "10px",
          imgs: has ? [{ src: f.img, width: "60%", top: "5%" }] : [],
          fonts: [
            {
              text: has ? f.name : "?",
              top: has ? "82%" : "40%",
              fontSize: has ? "12px" : "20px",
              // 统一素色，去掉按稀有度的彩虹字（用户：花花绿绿的小字）
              fontColor: has ? "#d8d2c6" : "#4a443a",
              lineHeight: "14px",
              wordWrap: true,
              lengthLimit: "8",
            },
          ],
        };
      }),
    [owned]
  );

  return (
    <div className="album-cell mx-auto" style={{ width: W, height: H }}>
      <LuckyGrid
        key={ownedKey}
        width={W}
        height={H}
        cols={COLS}
        rows={ROWS}
        prizes={prizes}
        defaultStyle={{ fontColor: "#d8d2c6", fontSize: "11px", textAlign: "center" }}
        defaultConfig={{ gutter: 12 }}
        end={(prize: any) => onPick && prize?.id && onPick(prize.id)}
      />
    </div>
  );
}