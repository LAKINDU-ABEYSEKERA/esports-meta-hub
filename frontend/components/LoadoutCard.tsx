// frontend/components/LoadoutCard.tsx
"use client";

import { motion } from "framer-motion";
import { User, Crosshair, Trash2, Cpu } from "lucide-react";

export interface Loadout {
  id: number;
  weapon_name: string;
  category: string;
  creator_username: string;
  description: string;
  similarity?: number | null;
}

const confidenceColors = {
  high: {
    label: "Optimal",
    text: "text-cyan-400",
    bar: "bg-cyan-400",
    shadow: "rgba(34,211,238,0.7)",
    border: "border-cyan-500/40",
  },
  medium: {
    label: "Moderate",
    text: "text-amber-400",
    bar: "bg-amber-400",
    shadow: "rgba(251,191,36,0.7)",
    border: "border-amber-500/40",
  },
  low: {
    label: "Low Affinity",
    text: "text-rose-400",
    bar: "bg-rose-400",
    shadow: "rgba(244,63,94,0.7)",
    border: "border-rose-500/40",
  },
};

function getConfidenceLevel(similarity: number) {
  const percent = Math.round(similarity * 100);
  if (percent >= 70) return confidenceColors.high;
  if (percent >= 40) return confidenceColors.medium;
  return confidenceColors.low;
}

interface LoadoutCardProps {
  loadout: Loadout;
  onDelete?: (id: number) => void;
  onEdit?: (loadout: Loadout) => void;
}

export default function LoadoutCard({ loadout, onDelete, onEdit }: LoadoutCardProps) {
  const hasSimilarity = loadout.similarity !== undefined && loadout.similarity !== null;
  const confidence = hasSimilarity ? getConfidenceLevel(loadout.similarity as number) : null;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative h-full flex flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/80 to-slate-950/95 border ${
        confidence ? confidence.border : "border-slate-800"
      } hover:border-cyan-500/50 p-5 backdrop-blur-xl shadow-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.12)] transition-all group overflow-hidden`}
    >
      {/* Top Ambient Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Top Section: Headers & Operative */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black tracking-wide text-slate-100 group-hover:text-cyan-300 transition-colors">
                {loadout.weapon_name}
              </h3>
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-400">
                {loadout.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono">
            <User className="h-3 w-3 text-cyan-400" />
            <span className="truncate max-w-[90px]">{loadout.creator_username}</span>
          </div>
        </div>

        {/* Tactical Description */}
        <p className="text-slate-300/80 text-sm leading-relaxed mb-4 line-clamp-3 min-h-[3.8rem]">
          {loadout.description}
        </p>
      </div>

      {/* Bottom Section: Footer Specs or Match Confidence */}
      <div className="pt-3 border-t border-slate-800/80 mt-auto">
        {hasSimilarity && confidence ? (
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" /> AI Affinity
              </span>
              <span className={`font-bold ${confidence.text}`}>
                {Math.round((loadout.similarity as number) * 100)}% · {confidence.label}
              </span>
            </div>
            <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${confidence.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((loadout.similarity as number) * 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 tracking-wider">
              <Crosshair className="h-3.5 w-3.5 text-cyan-500/60" />
              <span>SPEC_ID: #{loadout.id.toString().padStart(4, "0")}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {onEdit && (
                <button
                  onClick={() => onEdit(loadout)}
                  className="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-cyan-400/90 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all flex items-center gap-1.5 active:scale-95"
                  title="Calibrate Loadout"
                >
                  <span>Edit</span>
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => onDelete(loadout.id)}
                  className="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-red-400/90 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-all flex items-center gap-1.5 active:scale-95"
                  title="Revoke Deployment"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Revoke</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
