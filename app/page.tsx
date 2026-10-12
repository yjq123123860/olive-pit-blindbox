"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import AboutSection from "@/components/site/AboutSection";
import CollectionSection from "@/components/site/CollectionSection";
import Footer from "@/components/site/Footer";
import RevealBar from "@/components/site/RevealBar";
import Unbox3D, { type Unbox3DHandle } from "@/components/Unbox3D";
import type { Phase } from "@/components/three/UnboxScene";
import { createBoxState, draw, total as totalFigures, type DrawResult } from "@/lib/draw";

/* 阶段 → 按钮文案（跟着 3D 时间轴走） */
const PHASE_BTN: Record<Phase, string> = {
  idle: "",
  lid: "开盒中…",
  shake: "摇一摇…",
  stars: "要出来了…",
  surprise: "惊喜！",
  reveal: "",
};

export default function Home() {
  const boxRef = useRef(createBoxState());
  const stageRef = useRef<Unbox3DHandle | null>(null);
  const pendingRef = useRef<DrawResult | null>(null);
  const busyRef = useRef(false);
  const runRef = useRef(0);
  const finishTimer = useRef<any>(null);

  const [ver, setVer] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reveal, setReveal] = useState<(DrawResult & { run: number }) | null>(null);

  const busy = phase !== "idle" && phase !== "reveal";
  const owned = useMemo(() => new Set(Object.keys(boxRef.current.owned)), [ver]);
  const collected = owned.size;
  const total = totalFigures();

  /* 时间轴走到「出款」阶段 → 落定信息条 */
  const handlePhase = useCallback((p: Phase) => {
    setPhase(p);
    if (p === "reveal") {
      const pend = pendingRef.current;
      if (pend) {
        runRef.current += 1;
        setReveal({ ...pend, run: runRef.current });
      }
    }
  }, []);

  /* 点「开一颗」：抽卡 → 交给 3D 场景演完整套动作 */
  const handleDraw = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (finishTimer.current) clearTimeout(finishTimer.current);

    const result = draw(boxRef.current);
    pendingRef.current = result;    setVer((v) => v + 1); // 收藏册/计数立即点亮

    stageRef.current?.play(result.fig.id);

    /* 兜底：headless / rAF 被节流时 GSAP 时间轴可能不推进 */
    finishTimer.current = setTimeout(() => {
      if (!busyRef.current) return;
      busyRef.current = false;
      setPhase("reveal");
      runRef.current += 1;
      const pend = pendingRef.current;
      if (pend) setReveal({ ...pend, run: runRef.current });
    }, 6200);
  }, []);

  /* 再开一颗：清场重播 */
  const onAgain = useCallback(() => {
    setReveal(null);
    stageRef.current?.reset();
    // 让 reset 落地后再触发，保证 GSAP 从初始态开始
    setTimeout(handleDraw, 60);
  }, [handleDraw]);

  const onClose = useCallback(() => {
    setReveal(null);
    setPhase("idle");
    stageRef.current?.reset();
  }, []);

  return (
    <>
      <Header />

      <Hero
        stage={<Unbox3D ref={stageRef} onPhase={handlePhase} />}
        onDraw={handleDraw}
        busy={busy}
        collected={collected}
        total={total}
        phaseLabel={PHASE_BTN[phase]}
      />

      <AboutSection />

      <CollectionSection owned={owned} collected={collected} total={total} />

      <Footer />

      {reveal && (
        <RevealBar
          fig={reveal.fig}
          isNew={reveal.isNew}
          run={reveal.run}
          onClose={onClose}
          onAgain={onAgain}
        />
      )}
    </>
  );
}
