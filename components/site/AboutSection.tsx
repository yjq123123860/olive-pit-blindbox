/* 关于非遗（黑底纹理 + 巨字描边，TOP TOY「关于我们」版式） */
export default function AboutSection() {
  const stats = [
    { n: "200", s: "年", t: "潮州核雕工艺" },
    { n: "12", s: "款", t: "榄雕盲盒臻藏" },
    { n: "4", s: "系列", t: "经典 / 创新 / 现代 / 西方" },
  ];
  return (
    <section id="about" className="relative bg-ink-2 overflow-hidden grid-45 py-28">
      <div className="toy-wrap relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <span className="chapter-no text-gold text-sm">02 / 03</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex items-end gap-6 flex-wrap">
          <h2 className="display text-white text-[64px] md:text-[96px]">关于非遗</h2>
          <span className="display stroke-text text-gold text-[120px] md:text-[170px] leading-[0.8]">
            榄雕
          </span>
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-10 items-start">
          <p className="text-white/60 leading-loose">
            榄雕，是潮州人把一颗橄榄核当作一座宇宙的手艺。选核、剖壳、起线、凿面，
            三十六道工序，全凭一把刀在方寸之间起落。
            <br />
            <br />
            我们把这门手艺装进盲盒：一颗核，藏着从弥勒、龙舟到宇航员、
            赛博朋克城市的十二种想象，分成四大系列。集齐一个系列，
            这一系列就算真正到手。
          </p>

          <div className="grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.t} className="rounded-xl border border-white/10 bg-ink/60 p-5">
                <div className="display text-gold text-5xl">
                  {s.n}
                  <span className="text-xl ml-1">{s.s}</span>
                </div>
                <div className="mt-2 text-white/50 text-xs tracking-wider">{s.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}