"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Phase } from "./three/UnboxScene";
import { MODEL_URLS } from "@/lib/models";

export interface Unbox3DHandle {
  play: (figId: string) => void;
  reset: () => void;
}

interface Props {
  onPhase?: (p: Phase) => void;
  onReady?: () => void;
  onModelState?: (s: "loading" | "ok" | "placeholder") => void;
}

const PHASE_TEXT: Record<Phase, string> = {
  idle: "",
  lid: "开盒",
  shake: "摇一摇",
  stars: "有东西要出来了…",
  surprise: "惊喜！",
  reveal: "",
};

/**
 * 3D 开箱舞台：盒子打开 → 摇晃 → 冒星星 → 惊喜 → 藏品升起
 * 藏品是真 3D 建模（image-to-3D 生成的 GLB）。
 */
const Unbox3D = forwardRef<Unbox3DHandle, Props>(function Unbox3D(
  { onPhase, onReady, onModelState },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<any>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ready, setReady] = useState(false);
  const [modelState, setModelState] = useState<"loading" | "ok" | "placeholder">("ok");

  /* ---- 场景回调：把内部阶段同步给外部 ---- */
  const handlePhase = useCallback(
    (p: Phase) => {
      setPhase(p);
      onPhase?.(p);
    },
    [onPhase]
  );

  useEffect(() => {
    if (!canvasRef.current || sceneRef.current) return;
    let inst: any = null;
    let dead = false;
    // 验收诊断：记录每一步，定位 ready 门不开的根因（动态 import 失败/构造函数抛错常被吞）
    const W = window as any;
    W.__diag = W.__diag || [];
    const mark = (m: string) => W.__diag.push(m + "@" + Date.now());

    (async () => {
      try {
        mark("before-import");
        const mod = await import("./three/UnboxScene");
        mark("after-import:typeof=" + typeof mod.UnboxScene);
        if (dead || !canvasRef.current) {
          mark("dead-or-nocanvas");
          return;
        }
        if (typeof mod.UnboxScene !== "function") {
          mark("no-ctor-export");
          return;
        }
        mark("before-construct");
        inst = new mod.UnboxScene(canvasRef.current, {
          onPhase: handlePhase,
          onReady: () => {
            mark("onReady-cb");
            setReady(true);
            onReady?.();
          },
          onModelState: (s) => {
            setModelState(s);
            onModelState?.(s);
          },
        });
        sceneRef.current = inst;
        // 验收用：暴露场景实例，让 CDP 脚本轮询真实状态（软渲染下动画会被拖慢，不能按时间猜）
        W.__unbox = inst;
        mark("after-construct");
      } catch (e: any) {
        W.__errs = W.__errs || [];
        W.__errs.push("import-construct: " + (e?.stack || e?.message || String(e)));
        mark("ERROR:" + (e?.message || String(e)));
      }
    })();

    const onWin = () => sceneRef.current?.resize();
    window.addEventListener("resize", onWin);

    return () => {
      dead = true;
      window.removeEventListener("resize", onWin);
      inst?.dispose?.();
      sceneRef.current = null;
    };
  }, [handlePhase, onReady, onModelState]);

  useImperativeHandle(
    ref,
    () => ({
      play(figId: string) {
        return sceneRef.current?.play(figId, MODEL_URLS[figId]);
      },
      reset() {
        return sceneRef.current?.reset();
      },
    }),
    []
  );

  return (
    <div className="relative w-full h-full" style={{ minHeight: 560 }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ opacity: ready ? 1 : 0, transition: "opacity .6s ease" }}
      />

      {/* 载入遮罩 */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-gold/70 text-xs tracking-[0.3em]">
          载入 3D 场景…
        </div>
      )}

      {/* 阶段字幕（盖在 canvas 上，跟随节奏） */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <div
          className="px-5 py-2 rounded-full border border-gold/40 bg-black/45 backdrop-blur-sm text-gold text-[13px] tracking-[0.28em] transition-all duration-300"
          style={{
            opacity: phase === "idle" || phase === "reveal" ? 0 : 1,
            transform: `translateY(${phase === "idle" || phase === "reveal" ? 8 : 0}px)`,
          }}
        >
          {PHASE_TEXT[phase]}
        </div>
      </div>

      {/* 模型状态角标 */}
      {phase !== "idle" && modelState === "placeholder" && (
        <div className="absolute right-3 top-3 text-[10px] text-white/35 tracking-widest">
          该款真 3D 建模制作中 · 暂以参考图浮雕呈现
        </div>
      )}
    </div>
  );
});

export default Unbox3D;
