"use client";

import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";

type ParallaxLayerProps = PropsWithChildren<{
  className?: string;
  depth: number;
  point: { x: number; y: number };
}>;

export function ParallaxLayer({
  children,
  className,
  depth,
  point,
}: ParallaxLayerProps) {
  return (
    <motion.div
      className={className}
      animate={{ x: point.x * depth, y: point.y * depth }}
      transition={{ type: "spring", stiffness: 90, damping: 22, mass: 0.6 }}
    >
      {children}
    </motion.div>
  );
}
