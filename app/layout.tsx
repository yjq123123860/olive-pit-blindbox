import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "华夏奇雕 · 榄雕盲盒 | 开一颗，见天地",
  description:
    "潮州非遗榄雕盲盒：四大系列共 12 款，藏在一颗橄榄核里。交互基于 buuing/lucky-canvas（Apache-2.0）。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="antialiased">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}