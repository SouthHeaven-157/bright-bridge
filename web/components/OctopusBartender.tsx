"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { VISUAL_ASSETS } from "../lib/visualAssets";

type OctopusBartenderProps = {
  isNearGlass: boolean;
  isPouring: boolean;
};

const idleTransition = {
  duration: 3.8,
  repeat: Number.POSITIVE_INFINITY,
  repeatType: "mirror" as const,
  ease: "easeInOut" as const,
};

export function OctopusBartender({
  isNearGlass,
  isPouring,
}: OctopusBartenderProps) {
  const [artFailed, setArtFailed] = useState(false);

  return (
    <motion.div
      className={`octopus ${artFailed ? "has-fallback-art" : "has-generated-art"} ${isNearGlass ? "is-alert" : ""} ${isPouring ? "is-pouring" : ""}`}
      animate={{ y: isPouring ? -3 : [0, -4, 0] }}
      transition={isPouring ? { duration: 0.25 } : idleTransition}
      aria-label="机械章鱼酒保"
    >
      <motion.img
        className="octopus-generated-art"
        src={VISUAL_ASSETS.octopusBartender}
        alt=""
        aria-hidden="true"
        animate={{ rotate: isPouring ? -1.5 : [-0.6, 0.6, -0.6], scale: isNearGlass ? 1.025 : 1 }}
        transition={isPouring ? { duration: 0.25 } : idleTransition}
        onError={(event) => {
          event.currentTarget.hidden = true;
          setArtFailed(true);
        }}
      />
      <div className="octopus-placeholder" aria-hidden="true">
        <motion.div
          className="octopus-head"
          animate={{ rotate: isPouring ? -2 : [-1.5, 1.5, -1.5] }}
          transition={isPouring ? { duration: 0.25 } : idleTransition}
        >
          <span className="head-panel" />
          <motion.span
            className="octopus-eye eye-left"
            animate={{ opacity: [0.58, 1, 0.58] }}
            transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY }}
          />
          <motion.span
            className="octopus-eye eye-right"
            animate={{ opacity: [0.58, 1, 0.58] }}
            transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, delay: 0.1 }}
          />
        </motion.div>
        <div className="octopus-body"><span /></div>
        <motion.span className="octo-arm arm-l2" animate={{ rotate: [-5, 2, -5] }} transition={idleTransition} />
        <motion.span className="octo-arm arm-l1" animate={{ rotate: isNearGlass ? 9 : [2, -3, 2] }} transition={idleTransition} />
        <motion.span className="octo-arm arm-r1" animate={{ rotate: isNearGlass ? -9 : [-2, 3, -2] }} transition={idleTransition} />
        <motion.span className="octo-arm arm-r2" animate={{ rotate: [5, -2, 5] }} transition={idleTransition} />
        <motion.span
          className="octo-arm arm-front"
          animate={{ rotate: isPouring ? 6 : [-2, 2, -2], y: isPouring ? 5 : 0 }}
          transition={idleTransition}
        />
      </div>
    </motion.div>
  );
}
