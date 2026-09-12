import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BAR // 17 · 赛博外星调酒",
  description: "在机械章鱼酒保的注视下，调制一杯来自星际边境的饮品。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
