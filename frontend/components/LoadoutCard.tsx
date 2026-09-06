// frontend/components/LoadoutCard.tsx
"use client";

import { motion } from "framer-motion";
import { User, Crosshair, Trash2, Cpu } from "lucide-react";

export interface Attachment {
  id: number;
  name: string;
  slot: "Muzzle" | "Barrel" | "Optic" | "Underbarrel" | "Magazine" | "Stock";
  damage_modifier: number; // e.g. +5.0 or -2.5
  ads_modifier: number;    // e.g. +15.0 ms (slower) or -20.0 ms (faster)
  recoil_modifier: number; // e.g. -8.0% (better control) or +5.0%
}

export interface Loadout {
  id: number;
  weapon_name: string;
  category: string;
  creator_username: string;
  description: string;
  similarity?: number | null;
  attachments?: Attachment[];
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

// Aggregate a loadout's attachments into net stat deltas
function aggregateModifiers(attachments: Attachment[]) {
  return attachments.reduce(
    (acc, a) => ({
      damage: acc.damage + a.damage_modifier,
      ads: acc.ads + a.ads_modifier,
      recoil: acc.recoil + a.recoil_modifier,
    }),
    { damage: 0, ads: 0, recoil: 0 }
  );
}

function formatSigned(value: number, suffix: string) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${suffix}`;
}

// "Good" direction differs per stat: more damage is good, but faster ADS
// (negative ms) and lower recoil (negative %) are what you want too.
function statSentiment(value: number, invert: boolean): "positive" | "negative" | "neutral" {
  if (value === 0) return "neutral";
  const isGood = invert ? value < 0 : value > 0;
  return isGood ? "positive" : "negative";
}

const sentimentText: Record<string, string> = {
  positive: "text-emerald-400",
  negative: "text-rose-400",
  neutral: "text-slate-400",
};

const sentimentBg: Record<string, string> = {
  positive: "bg-emerald-500/10 border-emerald-500/20",
  negative: "bg-rose-500/10 border-rose-500/20",
  neutral: "bg-slate-800/60 border-slate-700/50",
};

interface LoadoutCardProps {
  loadout: Loadout;
  onDelete?: (id: number) => void;
  onEdit?: (loadout: Loadout) => void;
}

export default function LoadoutCard({ loadout, onDelete, onEdit }: LoadoutCardProps) {
  const hasSimilarity = loadout.similarity !== undefined && loadout.similarity !== null;
  const confidence = hasSimilarity ? getConfidenceLevel(loadout.similarity as number) : null;

  const attachments = loadout.attachments ?? [];
  const hasAttachments = attachments.length > 0;
  const telemetry = hasAttachments ? aggregateModifiers(attachments) : null;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative h-full flex flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/80 to-slate-950/95 border ${
        confidence ? confidence.border : "border-slate-800"
      } hover:border-cyan-500/50 p-5 backdrop-blur-xl shadow-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.12)] transition-all group overflow-hidden`}
    >
      {/* Top Ambient Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Top Section: Headers, Operative, Attachments & Telemetry */}
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
        <p className="text-slate-300/80 text-sm leading-relaxed mb-3 line-clamp-3 min-h-[3.8rem]">
          {loadout.description}
        </p>

        {/* Tactical Micro-Chips: equipped attachments */}
        {hasAttachments ? (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="inline-flex items-center gap-1 bg-slate-950/80 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded shadow-inner"
              >
                <span className="text-slate-500 uppercase tracking-wider">
                  [{attachment.slot}]
                </span>
                <span className="text-slate-200 font-semibold">{attachment.name}</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="mb-3">
            <span className="text-[10px] font-mono text-slate-600 tracking-wider">
              NO_ATTACHMENTS_CALIBRATED
            </span>
          </div>
        )}

        {/* Aggregate Telemetry Badges */}
        {telemetry && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {[
              { label: "Damage", value: telemetry.damage, suffix: "", invert: false },
              { label: "ADS Speed", value: telemetry.ads, suffix: "ms", invert: true },
              { label: "Recoil", value: telemetry.recoil, suffix: "%", invert: true },
            ].map(({ label, value, suffix, invert }) => {
              const sentiment = statSentiment(value, invert);
              return (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${sentimentBg[sentiment]}`}
                >
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-bold ${sentimentText[sentiment]}`}>
                    {formatSigned(value, suffix)}
                  </span>
                </span>
              );
            })}
          </div>
        )}
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