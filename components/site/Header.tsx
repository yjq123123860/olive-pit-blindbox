"use client";
import { useEffect, useState } from "react";

/* 顶栏：首屏通透，滚动后转深色（TOP TOY 行为） */
export default function Header() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const link =
    "text-white/80 hover:text-white text-sm tracking-widest transition-colors cursor-pointer";

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        solid ? "bg-ink/95 backdrop-blur-md border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="toy-wrap flex items-center justify-between h-[76px]">
        {/* Wordmark */}
        <a href="#draw" className="flex items-baseline gap-3">
          <span className="text-white font-black text-2xl tracking-tight">华夏奇雕</span>
          <span className="hidden sm:inline text-white/40 text-[10px] tracking-[0.3em] font-display">
            OLIVE&nbsp;CARVING
          </span>
        </a>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-10">
          <a className={link} href="#about">关于非遗</a>
          <a className={link} href="#collection">藏品册</a>
          <a className={link} href="#draw">开箱</a>
          <a className={link} href="#footer">联系我们</a>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-6">
          <button className="text-white/70 hover:text-white text-sm tracking-widest">中文 ▾</button>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white/70">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </header>
  );
}