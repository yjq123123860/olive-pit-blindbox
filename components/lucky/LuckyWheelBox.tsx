"use client";

/* ==========================================================================
   大转盘开箱 —— 直接复用 buuing/lucky-canvas（8,770★ Apache-2.0）的
   官方 React 组件 <LuckyWheel>（@lucky-canvas/react → lucky-canvas 核心）。
   只做一件事：把 26 款榄雕映射成转盘的 prizes（换元素），并暴露 play/stop。
   ========================================================================== */
import { useMemo, type RefObject } from "react";
import dynamic from "next/dynamic";
import { FIGURES } from "@/lib/figures";

const LuckyWheel: any = dynamic(
  () => import("@lucky-canvas/react").then((m) => m.LuckyWheel),
  { ssr: false }
);

const SIZE = 560;

/* 深色高级感底盘 + 金环，扇区按稀有度上色（TOP TOY 近黑/金） */
function sectorBg(rarity: string) {
  if (rarity === "h") return "#241f16";
  if (rarity === "r") return "#14251a";
  return "#141210";
}

export default function LuckyWheelBox({
  wheelRef,
  onRequestDraw,
  onLanded,
}: {
  wheelRef: RefObject<any>;
  onRequestDraw: () => void;
  onLanded: (id: string) => void;
}) {
  const prizes = useMemo(
    () =>
      FIGURES.map((f) => ({
        id: f.id,
        background: sectorBg(f.rarity),
        imgs: [{ src: f.img, width: "42%", top: "13%" }],
        fonts: [
          {
            text: f.name,
            top: "52%",
            fontSize: "10px",
            lineHeight: "12px",
            fontColor:
              f.rarity === "h" ? "#E8C27A" : f.rarity === "r" ? "#9BE8AF" : "#cfc9bd",
            wordWrap: true,
            lengthLimit: "7",
          },
        ],
      })),
    []
  );

  const blocks = useMemo(
    () => [{ background: "#c5a35b" }, { background: "#0e0d0b" }, { background: "#16130f" }],
    []
  );

  const buttons = useMemo(
    () => [
      {
        radius: "17%",
        background: "#e60012",
        pointer: true,
        fonts: [{ text: "开", top: "30%", fontSize: "36px", fontColor: "#fff", fontWeight: "900" }],
      },
    ],
    []
  );

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      {/* 金色聚光底 */}
      <div className="hero-glow pointer-events-none absolute -inset-16" />
      <LuckyWheel
        ref={wheelRef}
        width={SIZE}
        height={SIZE}
        blocks={blocks}
        prizes={prizes}
        buttons={buttons}
        defaultStyle={{
          fontColor: "#cfc9bd",
          fontSize: "10px",
          lineHeight: "12px",
          textAlign: "center",
        }}
        defaultConfig={{ speed: 24, accelerationTime: 1100, decelerationTime: 2000 }}
        start={onRequestDraw}
        end={(prize: any) => onLanded(prize?.id)}
      />
    </div>
  );
}