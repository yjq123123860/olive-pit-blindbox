/* 黑底页脚（TOP TOY footer 节奏） */
export default function Footer() {
  const cols = [
    { t: "关于我们", a: ["品牌故事", "工艺溯源", "设计团队"] },
    { t: "藏品系列", a: ["一根核里的两百年", "像素与刀锋", "一核万里"] },
    { t: "商场渠道", a: ["全国门店", "联名合作", "企业定制"] },
    { t: "联系我们", a: ["商务合作", "媒体垂询", "加入我们"] },
  ];
  return (
    <footer id="footer" className="bg-ink text-white">
      <div className="toy-wrap py-20">
        <div className="grid md:grid-cols-5 gap-12">
          <div className="md:col-span-1">
            <div className="font-black text-2xl">华夏奇雕</div>
            <div className="display text-white/40 text-sm mt-1">OLIVE CARVING</div>
            <p className="mt-5 text-white/40 text-xs leading-relaxed">
              把潮州非遗，装进一颗可以随身携带的核里。
            </p>
          </div>

          {cols.map((c) => (
            <div key={c.t}>
              <div className="font-bold text-sm mb-4">{c.t}</div>
              <ul className="space-y-2.5">
                {c.a.map((x) => (
                  <li key={x} className="text-white/45 text-xs hover:text-white/80 cursor-pointer transition-colors">
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-white/35 text-[11px]">
          <span>© 2026 华夏奇雕 · 榄雕盲盒 · 技术克隆演示</span>
          <span>交互组件来自 buuing/lucky-canvas（8,770★ · Apache-2.0）</span>
        </div>
      </div>
    </footer>
  );
}