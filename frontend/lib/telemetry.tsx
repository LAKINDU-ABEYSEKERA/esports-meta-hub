// frontend/lib/telemetry.tsx
"use client";

import { motion } from "framer-motion";
import type { Attachment } from "@/components/LoadoutCard";

export const SLOT_ORDER: Attachment["slot"][] = [
  "Muzzle",
  "Barrel",
  "Optic",
  "Underbarrel",
  "Magazine",
  "Stock",
];

// Visual scale ceilings for the telemetry meters, shared across every
// surface that previews stat deltas so a "+15" reads the same everywhere.
export const METER_SCALE = {
  damage: 30,
  ads: 150,
  recoil: 50,
};

export function formatSigned(value: number, suffix: string) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${suffix}`;
}

// Sums an attachment set's stat modifiers into net telemetry deltas.
export function aggregateModifiers(attachments: Attachment[]) {
  return attachments.reduce(
    (acc, a) => ({
      damage: acc.damage + a.damage_modifier,
      ads: acc.ads + a.ads_modifier,
      recoil: acc.recoil + a.recoil_modifier,
    }),
    { damage: 0, ads: 0, recoil: 0 }
  );
}

export function DeltaMeter({
  label,
  value,
  suffix,
  maxScale,
  invert = false,
}: {
  label: string;
  value: number;
  suffix: string;
  maxScale: number;
  invert?: boolean;
}) {
  const clamped = Math.max(-maxScale, Math.min(maxScale, value));
  const percent = (clamped / maxScale) * 50; // -50 .. +50
  const isGood = value === 0 ? null : invert ? value < 0 : value > 0;
  const barColor = isGood === null ? "bg-slate-600" : isGood ? "bg-emerald-400" : "bg-rose-400";
  const textColor =
    isGood === null ? "text-slate-400" : isGood ? "text-emerald-400" : "text-rose-400";

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className={`font-bold ${textColor}`}>{formatSigned(value, suffix)}</span>
      </div>
      <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600 z-10" />
        <motion.div
          className={`absolute top-0 bottom-0 ${barColor} rounded-full`}
          initial={false}
          animate={
            percent >= 0
              ? { left: "50%", width: `${percent}%` }
              : { left: `${50 + percent}%`, width: `${-percent}%` }
          }
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}