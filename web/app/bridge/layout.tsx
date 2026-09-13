import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "智触心桥 · BrightBridge",
  description: "面向老人和培智学生的生活技能仿真训练平台。",
};

export default function BridgeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
