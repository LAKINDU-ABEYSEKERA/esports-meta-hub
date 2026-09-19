// frontend/app/compare/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert, Swords } from "lucide-react";
import Cookies from "js-cookie";
import api from "@/lib/api";
import type { Attachment, Loadout } from "@/components/LoadoutCard";
import { SLOT_ORDER, METER_SCALE, aggregateModifiers } from "@/lib/telemetry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Weapon {
  id: number;
  name: string;
}

type Accent = "cyan" | "rose";

// Narrow an unknown axios-style error down to a displayable message without
// resorting to `any` — keeps this file strict-mode clean.
function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { detail?: unknown } } })
      .response;
    if (typeof response?.data?.detail === "string") {
      return response.data.detail;
    }
  }
  return fallback;
}

const ACCENT_STYLES: Record<
  Accent,
  {
    heading: string;
    border: string;
    hoverBorder: string;
    ring: string;
    activePill: string;
    strokeClass: string;
    fillClass: string;
    dotClass: string;
  }
> = {
  cyan: {
    heading: "text-cyan-300",
    border: "border-cyan-500/30",
    hoverBorder: "hover:border-cyan-500/50",
    ring: "focus:ring-cyan-500/30",
    activePill: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300",
    strokeClass: "stroke-cyan-400",
    fillClass: "fill-cyan-500/20",
    dotClass: "fill-cyan-400",
  },
  rose: {
    heading: "text-rose-300",
    border: "border-rose-500/30",
    hoverBorder: "hover:border-rose-500/50",
    ring: "focus:ring-rose-500/30",
    activePill: "bg-rose-500/20 border-rose-500/40 text-rose-300",
    strokeClass: "stroke-rose-400",
    fillClass: "fill-rose-500/20",
    dotClass: "fill-rose-400",
  },
};

// --- Radar math -------------------------------------------------------

const RADAR_AXES = [
  "Damage",
  "Handling",
  "Recoil Stability",
  "Firepower",
  "Tactical Utility",
] as const;

// Maps a raw stat delta onto a 0–100 radar scale where 50 represents an
// unmodified ("stock") loadout, symmetric out to +/- maxScale.
function normalizeDelta(value: number, maxScale: number): number {
  const clamped = Math.max(-maxScale, Math.min(maxScale, value));
  return 50 + (clamped / maxScale) * 50;
}

// Heuristic composite: Firepower leans on raw damage but is dragged down by
// poor recoil control (you can't land the extra damage if you can't hold
// the gun on target). Weighted 70/30 damage-to-recoil.
const FIREPOWER_SCALE = METER_SCALE.damage * 0.7 + METER_SCALE.recoil * 0.3;

// Tactical Utility is deliberately NOT another reading of the same three
// modifiers — it's a coverage heuristic (how much of the attachment matrix
// is calibrated), so it doesn't just restate Damage/Handling/Recoil in a
// different order.
function computeRadarValues(attachments: Attachment[]): number[] {
  const agg = aggregateModifiers(attachments);
  const damage = normalizeDelta(agg.damage, METER_SCALE.damage);
  const handling = normalizeDelta(-agg.ads, METER_SCALE.ads);
  const recoilStability = normalizeDelta(-agg.recoil, METER_SCALE.recoil);
  const firepower = normalizeDelta(
    agg.damage * 0.7 + -agg.recoil * 0.3,
    FIREPOWER_SCALE
  );
  const utility = (attachments.length / SLOT_ORDER.length) * 100;
  return [damage, handling, recoilStability, firepower, utility];
}

function polarPoint(cx: number, cy: number, radius: number, index: number, total: number) {
  const angleDeg = (360 / total) * index - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function buildPolygonPath(values: number[], cx: number, cy: number, maxRadius: number): string {
  const points = values.map((value, i) => {
    const radius = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
    const { x, y } = polarPoint(cx, cy, radius, i, values.length);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M ${points.join(" L ")} Z`;
}

function RadarChart({
  alphaValues,
  bravoValues,
  alphaLabel,
  bravoLabel,
}: {
  alphaValues: number[];
  bravoValues: number[];
  alphaLabel: string;
  bravoLabel: string;
}) {
  const width = 380;
  const height = 320;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = 100;
  const rings = [0.25, 0.5, 0.75, 1];

  const alphaPath = buildPolygonPath(alphaValues, cx, cy, maxRadius);
  const bravoPath = buildPolygonPath(bravoValues, cx, cy, maxRadius);

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-md overflow-visible"
      >
        {/* Background grid rings */}
        {rings.map((ringScale) => {
          const ringPoints = RADAR_AXES.map((_, i) =>
            polarPoint(cx, cy, maxRadius * ringScale, i, RADAR_AXES.length)
          );
          const ringPath = `M ${ringPoints
            .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
            .join(" L ")} Z`;
          return (
            <path
              key={ringScale}
              d={ringPath}
              className="fill-none stroke-slate-800"
              strokeWidth={1}
            />
          );
        })}

        {/* Spokes + axis labels */}
        {RADAR_AXES.map((axisLabel, i) => {
          const outer = polarPoint(cx, cy, maxRadius, i, RADAR_AXES.length);
          const labelPoint = polarPoint(cx, cy, maxRadius + 22, i, RADAR_AXES.length);
          return (
            <g key={axisLabel}>
              <line
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                className="stroke-slate-800"
                strokeWidth={1}
              />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-500 text-[9px] font-mono uppercase tracking-wider"
              >
                {axisLabel}
              </text>
            </g>
          );
        })}

        {/* Bravo drawn first so Alpha's stroke sits visually on top where they overlap */}
        <path
          d={bravoPath}
          className={`${ACCENT_STYLES.rose.fillClass} ${ACCENT_STYLES.rose.strokeClass}`}
          strokeWidth={2}
        />
        <path
          d={alphaPath}
          className={`${ACCENT_STYLES.cyan.fillClass} ${ACCENT_STYLES.cyan.strokeClass}`}
          strokeWidth={2}
        />
      </svg>

      <div className="flex items-center gap-6 mt-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          {alphaLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-rose-300">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          {bravoLabel}
        </span>
      </div>
    </div>
  );
}

// --- Archetype & verdict heuristics ------------------------------------

function determineArchetype(values: number[]): { label: string; description: string } {
  const [, handling, recoilStability] = values;
  const diff = handling - recoilStability;

  if (Math.abs(diff) < 6) {
    return {
      label: "Balanced Operator",
      description: "Mobility and recoil control are evenly matched.",
    };
  }

  return diff > 0
    ? {
        label: "Vanguard — Run & Gun Dominance",
        description: "Faster handling outweighs recoil control — built for aggressive pushes.",
      }
    : {
        label: "Sentinel — Sustained Stability",
        description: "Recoil control outweighs handling — built for holding lanes at range.",
      };
}

function determineVerdict(alphaValues: number[], bravoValues: number[]): string {
  let alphaWins = 0;
  let bravoWins = 0;

  alphaValues.forEach((value, i) => {
    if (value > bravoValues[i]) alphaWins += 1;
    else if (bravoValues[i] > value) bravoWins += 1;
  });

  if (alphaWins === bravoWins) {
    return "Even Matchup — Both Builds Statistically Comparable";
  }
  return alphaWins > bravoWins
    ? "Tactical Superiority: Alpha Operative"
    : "Tactical Superiority: Bravo Operative";
}

// --- Loadout column -----------------------------------------------------

interface ResolvedBuild {
  weaponName: string | null;
  attachments: Attachment[];
}

function LoadoutColumn({
  label,
  accent,
  loadouts,
  weapons,
  attachmentsBySlot,
  allAttachments,
  onResolvedChange,
}: {
  label: string;
  accent: Accent;
  loadouts: Loadout[];
  weapons: Weapon[];
  attachmentsBySlot: Record<string, Attachment[]>;
  allAttachments: Attachment[];
  onResolvedChange: (resolved: ResolvedBuild) => void;
}) {
  const styles = ACCENT_STYLES[accent];

  const [mode, setMode] = useState<"existing" | "manual">("existing");
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string>("");
  const [weaponId, setWeaponId] = useState<string>("");
  const [equipped, setEquipped] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(SLOT_ORDER.map((slot) => [slot, null]))
  );

  const selectedLoadout = useMemo(
    () => loadouts.find((l) => String(l.id) === selectedLoadoutId) ?? null,
    [loadouts, selectedLoadoutId]
  );

  const manualEquippedAttachments = useMemo(() => {
    return Object.values(equipped)
      .filter((id): id is number => id !== null)
      .map((id) => allAttachments.find((a) => a.id === id))
      .filter((a): a is Attachment => Boolean(a));
  }, [equipped, allAttachments]);

  const resolvedAttachments =
    mode === "existing" ? selectedLoadout?.attachments ?? [] : manualEquippedAttachments;
  const resolvedWeaponName =
    mode === "existing"
      ? selectedLoadout?.weapon_name ?? null
      : weapons.find((w) => String(w.id) === weaponId)?.name ?? null;

  useEffect(() => {
    onResolvedChange({ weaponName: resolvedWeaponName, attachments: resolvedAttachments });
    // Deliberately keyed on the resolved outputs, not the raw setters, so the
    // parent only re-renders when what it actually needs has changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedWeaponName, resolvedAttachments]);

  const handleSlotChange = (slot: string, value: string | null) => {
    setEquipped((prev) => ({
      ...prev,
      [slot]: !value || value === "none" ? null : Number(value),
    }));
  };

  return (
    <div className={`rounded-2xl border ${styles.border} bg-slate-900/40 backdrop-blur-xl p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-bold ${styles.heading}`}>{label}</h2>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950/60 border border-slate-800">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
              mode === "existing" ? styles.activePill : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Existing
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
              mode === "manual" ? styles.activePill : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      {mode === "existing" ? (
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
            Select Deployment
          </label>
          <Select
            value={selectedLoadoutId}
            onValueChange={(val) => setSelectedLoadoutId(val ?? "")}
          >
            <SelectTrigger
              className={`w-full px-3 py-2 rounded-lg bg-slate-900/50 border-slate-700/50 text-slate-200 ${styles.hoverBorder} ${styles.ring} transition-colors`}
            >
              <SelectValue placeholder="Choose a loadout...">
                {selectedLoadout
                  ? `${selectedLoadout.weapon_name} · #${selectedLoadout.id
                      .toString()
                      .padStart(4, "0")}`
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
              {loadouts.map((loadout) => (
                <SelectItem
                  key={loadout.id}
                  value={String(loadout.id)}
                  className="focus:bg-slate-800 focus:text-slate-100"
                >
                  {loadout.weapon_name} · #{loadout.id.toString().padStart(4, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loadouts.length === 0 && (
            <p className="mt-2 text-[11px] font-mono text-slate-600">
              No saved deployments yet — switch to Manual to build one.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
              Weapon
            </label>
            <Select value={weaponId} onValueChange={(val) => setWeaponId(val ?? "")}>
              <SelectTrigger
                className={`w-full px-3 py-2 rounded-lg bg-slate-900/50 border-slate-700/50 text-slate-200 ${styles.hoverBorder} ${styles.ring} transition-colors`}
              >
                <SelectValue placeholder="Select a weapon...">
                  {weapons.find((w) => String(w.id) === weaponId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                {weapons.map((weapon) => (
                  <SelectItem
                    key={weapon.id}
                    value={String(weapon.id)}
                    className="focus:bg-slate-800 focus:text-slate-100"
                  >
                    {weapon.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
              Attachments
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SLOT_ORDER.map((slot) => (
                <div key={slot}>
                  <label className="block text-[10px] font-mono text-slate-600 mb-1 uppercase tracking-wider">
                    {slot}
                  </label>
                  <Select
                    value={equipped[slot] === null ? "none" : String(equipped[slot])}
                    onValueChange={(value) => handleSlotChange(slot, value)}
                  >
                    <SelectTrigger className="w-full px-2 py-1.5 rounded-md bg-slate-900/50 border-slate-700/50 text-slate-200 text-xs hover:border-slate-600 focus:ring-slate-500/30 transition-colors">
                      <SelectValue placeholder="None / Stock">
                        {equipped[slot]
                          ? allAttachments.find((a) => a.id === equipped[slot])?.name
                          : "None / Stock"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                      <SelectItem value="none" className="focus:bg-slate-800 focus:text-slate-100">
                        None / Stock
                      </SelectItem>
                      {(attachmentsBySlot[slot] ?? []).map((attachment) => (
                        <SelectItem
                          key={attachment.id}
                          value={String(attachment.id)}
                          className="focus:bg-slate-800 focus:text-slate-100"
                        >
                          {attachment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-800/70">
        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-1.5">
          {resolvedWeaponName ?? "No weapon selected"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {resolvedAttachments.length > 0 ? (
            resolvedAttachments.map((attachment) => (
              <span
                key={attachment.id}
                className="inline-flex items-center gap-1 bg-slate-950/80 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded"
              >
                <span className="text-slate-500 uppercase">[{attachment.slot}]</span>
                <span className="text-slate-200">{attachment.name}</span>
              </span>
            ))
          ) : (
            <span className="text-[10px] font-mono text-slate-600">
              NO_ATTACHMENTS_CALIBRATED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Page ---------------------------------------------------------------

export default function ComparePage() {
  const router = useRouter();

  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [alphaBuild, setAlphaBuild] = useState<ResolvedBuild>({
    weaponName: null,
    attachments: [],
  });
  const [bravoBuild, setBravoBuild] = useState<ResolvedBuild>({
    weaponName: null,
    attachments: [],
  });

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [loadoutsRes, weaponsRes, attachmentsRes] = await Promise.all([
          api.get("/loadouts/me/"),
          api.get("/weapons/"),
          api.get("/attachments/"),
        ]);
        setLoadouts(loadoutsRes.data.results);
        setWeapons(weaponsRes.data);
        setAttachments(attachmentsRes.data);
      } catch (err: unknown) {
        console.error("Failed to fetch comparison data:", err);
        setError(
          getErrorMessage(err, "Failed to load the tactical matrix. Please try again.")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const attachmentsBySlot = useMemo(() => {
    const grouped: Record<string, Attachment[]> = Object.fromEntries(
      SLOT_ORDER.map((slot) => [slot, [] as Attachment[]])
    );
    for (const attachment of attachments) {
      if (!grouped[attachment.slot]) grouped[attachment.slot] = [];
      grouped[attachment.slot].push(attachment);
    }
    return grouped;
  }, [attachments]);

  const alphaValues = useMemo(
    () => computeRadarValues(alphaBuild.attachments),
    [alphaBuild.attachments]
  );
  const bravoValues = useMemo(
    () => computeRadarValues(bravoBuild.attachments),
    [bravoBuild.attachments]
  );

  const alphaArchetype = useMemo(() => determineArchetype(alphaValues), [alphaValues]);
  const bravoArchetype = useMemo(() => determineArchetype(bravoValues), [bravoValues]);
  const verdict = useMemo(
    () => determineVerdict(alphaValues, bravoValues),
    [alphaValues, bravoValues]
  );

  const hasAnyBuild =
    alphaBuild.attachments.length > 0 || bravoBuild.attachments.length > 0;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950" />

      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-slate-200 to-rose-400 bg-clip-text text-transparent mb-2">
            Tactical Matrix
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Head-to-head comparison hub — pit two loadouts against each other on a
            live radar HUD.
          </p>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <LoadoutColumn
                label="Alpha Operative"
                accent="cyan"
                loadouts={loadouts}
                weapons={weapons}
                attachmentsBySlot={attachmentsBySlot}
                allAttachments={attachments}
                onResolvedChange={setAlphaBuild}
              />
              <LoadoutColumn
                label="Bravo Operative"
                accent="rose"
                loadouts={loadouts}
                weapons={weapons}
                attachmentsBySlot={attachmentsBySlot}
                allAttachments={attachments}
                onResolvedChange={setBravoBuild}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Swords className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-bold text-slate-200">Tactical Radar HUD</h2>
              </div>

              {hasAnyBuild ? (
                <RadarChart
                  alphaValues={alphaValues}
                  bravoValues={bravoValues}
                  alphaLabel={alphaBuild.weaponName ?? "Alpha Operative"}
                  bravoLabel={bravoBuild.weaponName ?? "Bravo Operative"}
                />
              ) : (
                <p className="text-center text-sm text-slate-500 py-12">
                  Select or build a loadout on both sides to populate the radar.
                </p>
              )}
            </motion.div>

            {hasAnyBuild && (
              <>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                    <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
                      Alpha Archetype
                    </p>
                    <p className="text-sm font-bold text-cyan-200">{alphaArchetype.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{alphaArchetype.description}</p>
                  </div>
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                    <p className="text-xs font-mono text-rose-400 uppercase tracking-wider mb-1">
                      Bravo Archetype
                    </p>
                    <p className="text-sm font-bold text-rose-200">{bravoArchetype.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{bravoArchetype.description}</p>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-sm font-mono text-slate-200">
                    {verdict}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}