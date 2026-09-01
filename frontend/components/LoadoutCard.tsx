// frontend/components/LoadoutCard.tsx
"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";

// Type definition for a Loadout returned by the backend
export interface Loadout {
  id: number;
  weapon_name: string;
  category: string;
  creator_username: string;
  description: string;
  similarity?: number | null; // optional; null when not a vector search result
}

// Map confidence levels to color schemes (hex and tailwind classes)
const confidenceColors = {
  high: {
    label: "High",
    text: "text-cyan-400",
    bar: "bg-cyan-500",
    head: "bg-cyan-300",
    hex: "#22d3ee",
    borderHover: "hover:border-cyan-500/50",
    shadow: "rgba(34,211,238,0.8)",
  },
  medium: {
    label: "Medium",
    text: "text-yellow-400",
    bar: "bg-yellow-500",
    head: "bg-yellow-300",
    hex: "#eab308",
    borderHover: "hover:border-yellow-500/50",
    shadow: "rgba(234,179,8,0.8)",
  },
  low: {
    label: "Low",
    text: "text-red-400",
    bar: "bg-red-500",
    head: "bg-red-300",
    hex: "#ef4444",
    borderHover: "hover:border-red-500/50",
    shadow: "rgba(239,68,68,0.8)",
  },
};

// Neutral fallback for when similarity is null/undefined (used for hover glow on weapon name)
const neutralConfidence = {
  label: "",
  text: "text-slate-400",
  bar: "bg-slate-500",
  head: "bg-slate-300",
  hex: "#64748b",
  borderHover: "hover:border-slate-500/50",
  shadow: "rgba(100,116,139,0.5)",
};

function getConfidenceLevel(similarity: number) {
  const percent = Math.round(similarity * 100);
  if (percent >= 70) return confidenceColors.high;
  if (percent >= 40) return confidenceColors.medium;
  return confidenceColors.low;
}

// Stagger container for text elements inside the card
const textContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const textItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

interface LoadoutCardProps {
  loadout: Loadout;
}

export default function LoadoutCard({ loadout }: LoadoutCardProps) {
  // Conditional similarity check
  const hasSimilarity = loadout.similarity !== undefined && loadout.similarity !== null;

  // Only call getConfidenceLevel if similarity exists, otherwise use neutral fallback
  const confidence = hasSimilarity
    ? getConfidenceLevel(loadout.similarity as number)
    : neutralConfidence;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
      }}
      whileHover={{
        scale: 1.05,
        y: -10,
        boxShadow: [
          `0 0 20px ${confidence.shadow}`,
          `0 0 40px ${confidence.shadow}`,
          `0 0 20px ${confidence.shadow}`,
        ],
        transition: {
          scale: { type: "spring", stiffness: 200, damping: 20 },
          y: { type: "spring", stiffness: 200, damping: 20 },
          boxShadow: { duration: 1, repeat: Infinity, ease: "easeInOut" },
        },
      }}
      whileTap={{ scale: 0.98 }}
      className={`relative p-6 rounded-xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 ${confidence.borderHover} shadow-lg shadow-slate-900/30 transition-all group`}
      style={{ boxShadow: "0 0 0 rgba(0,0,0,0)" }}
    >
      {/* Inner staggered text */}
      <motion.div
        variants={textContainerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Weapon Name and Category */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <motion.h3
              variants={textItemVariants}
              className={`text-xl font-semibold text-white transition-all group-hover:drop-shadow-[0_0_10px_${confidence.hex}] group-hover:text-cyan-100`}
              style={{ textShadow: "0 0 0 transparent" }}
            >
              {loadout.weapon_name}
            </motion.h3>
            <motion.span
              variants={textItemVariants}
              className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50 uppercase tracking-widest"
            >
              {loadout.category}
            </motion.span>
          </div>
          <motion.div
            variants={textItemVariants}
            className="flex items-center gap-1 text-slate-400"
          >
            <User className="h-4 w-4" />
            <span className="text-sm">{loadout.creator_username}</span>
          </motion.div>
        </div>

        {/* Tactical Description */}
        <motion.p
          variants={textItemVariants}
          className="text-slate-300 text-sm leading-relaxed mb-4 line-clamp-3"
        >
          {loadout.description}
        </motion.p>

        {/* Match Confidence Meter - only rendered if similarity is present */}
        {hasSimilarity && (
          <motion.div variants={textItemVariants} className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-400">
                Match Confidence
              </span>
              <span className={`text-sm font-bold ${confidence.text}`}>
                {Math.round((loadout.similarity as number) * 100)}% · {confidence.label}
              </span>
            </div>
            <div className="relative w-full h-2 bg-slate-800 rounded-full">
              {/* Filled bar */}
              <motion.div
                className={`absolute left-0 top-0 h-full rounded-full ${confidence.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((loadout.similarity as number) * 100)}%` }}
                transition={{
                  type: "spring",
                  stiffness: 50,
                  damping: 10,
                  delay: 0.2,
                }}
              />
              {/* Glowing head */}
              <motion.div
                className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full ${confidence.head}`}
                style={{ boxShadow: `0 0 12px 3px ${confidence.shadow}` }}
                initial={{ left: "0%" }}
                animate={{ left: `calc(${Math.round((loadout.similarity as number) * 100)}% - 6px)` }}
                transition={{
                  type: "spring",
                  stiffness: 50,
                  damping: 10,
                  delay: 0.2,
                }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}