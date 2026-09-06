// frontend/app/loadouts/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Crosshair, Loader2, ShieldAlert } from "lucide-react";
import Cookies from "js-cookie";
import api from "@/lib/api";
import type { Attachment } from "@/components/LoadoutCard";
import {
  SLOT_ORDER,
  METER_SCALE,
  DeltaMeter,
  aggregateModifiers,
} from "@/lib/telemetry";
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

const SELECT_TRIGGER_CLASS =
  "w-full px-4 py-3 rounded-lg bg-slate-900/50 border-slate-700/50 text-slate-200 hover:border-cyan-500/50 focus:ring-cyan-500/30 transition-colors";

const SLOT_TRIGGER_CLASS =
  "w-full px-3 py-2 rounded-lg bg-slate-900/50 border-slate-700/50 text-slate-200 text-sm hover:border-cyan-500/50 focus:ring-cyan-500/30 transition-colors";

const SELECT_CONTENT_CLASS = "bg-slate-950 border-slate-800 text-slate-200";
const SELECT_ITEM_CLASS = "focus:bg-cyan-500/20 focus:text-cyan-300";

export default function DeployLoadoutPage() {
  const router = useRouter();
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>("");
  const [tacticalDescription, setTacticalDescription] = useState("");

  // One equipped attachment id (or null for "None / Stock") per slot
  const [equipped, setEquipped] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(SLOT_ORDER.map((slot) => [slot, null]))
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingData, setFetchingData] = useState(true);

  // Authentication check & concurrent weapon/attachment fetch
  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [weaponsRes, attachmentsRes] = await Promise.all([
          api.get("/weapons/"),
          api.get("/attachments/"),
        ]);
        setWeapons(weaponsRes.data);
        setAttachments(attachmentsRes.data);
      } catch (err: any) {
        console.error("Failed to fetch weapons/attachments:", err);
        setError("Failed to load weapon and attachment data. Please try again.");
      } finally {
        setFetchingData(false);
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

  const equippedAttachments = useMemo(() => {
    return Object.values(equipped)
      .filter((id): id is number => id !== null)
      .map((id) => attachments.find((a) => a.id === id))
      .filter((a): a is Attachment => Boolean(a));
  }, [equipped, attachments]);

  const telemetry = useMemo(
    () => aggregateModifiers(equippedAttachments),
    [equippedAttachments]
  );

  // Shadcn's Select works off string values, so "none" is our sentinel for
  // an empty slot — Select/Radix-style primitives reject an empty string.
  // Shadcn/Base-UI's Select passes string | null. We handle both, plus our "none" sentinel.
  const handleSlotChange = (slot: string, value: string | null) => {
    setEquipped((prev) => ({
      ...prev,
      [slot]: !value || value === "none" ? null : Number(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeaponId || !tacticalDescription.trim()) {
      setError("Please select a weapon and provide a tactical description.");
      return;
    }

    setLoading(true);
    setError(null);

    const attachment_ids = Object.values(equipped).filter(
      (id): id is number => id !== null
    );

    try {
      await api.post("/loadouts/", {
        weapon: Number(selectedWeaponId),
        tactical_description: tacticalDescription.trim(),
        attachment_ids,
      });
      router.push("/profile");
    } catch (err: any) {
      console.error("Deployment failed:", err);
      setError(
        err?.response?.data?.detail ||
          "Deployment failed. Please try again or check authentication."
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Ambient background radial gradient */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950" />

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Deployment Uplink
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Configure and deploy a new tactical loadout to your command center.
          </p>
        </div>

        {/* Form container with slide-up spring */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="p-8 rounded-xl bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/5"
        >
          {fetchingData ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Weapon Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Primary Weapon
                </label>
                              <Select value={selectedWeaponId} onValueChange={(val) => setSelectedWeaponId(val || "")}>
                  <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder="Select a weapon...">
                      {weapons.find((w) => String(w.id) === selectedWeaponId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT_CLASS}>
                    {weapons.map((weapon) => (
                      <SelectItem
                        key={weapon.id}
                        value={String(weapon.id)}
                        className={SELECT_ITEM_CLASS}
                      >
                        {weapon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Attachment Matrix */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Attachment Matrix
                </label>
                <div className="group grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-950/50 border border-slate-800 transition-colors hover:border-slate-700/70">
                  {SLOT_ORDER.map((slot) => (
                    <div
                      key={slot}
                      className="rounded-lg border border-slate-800/70 bg-slate-900/30 p-2.5 transition-colors group-hover:border-slate-700/70"
                    >
                      <label className="block text-[11px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider">
                        {slot}
                      </label>
                      <Select
                        value={equipped[slot] === null ? "none" : String(equipped[slot])}
                        onValueChange={(value) => handleSlotChange(slot, value)}
                      >
                        <SelectTrigger className={SLOT_TRIGGER_CLASS}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={SELECT_CONTENT_CLASS}>
                          <SelectItem value="none" className={SELECT_ITEM_CLASS}>
                            None / Stock
                          </SelectItem>
                          {(attachmentsBySlot[slot] ?? []).map((attachment) => (
                            <SelectItem
                              key={attachment.id}
                              value={String(attachment.id)}
                              className={SELECT_ITEM_CLASS}
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

              {/* Live Telemetry Delta Preview HUD */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Live Telemetry Preview
                </label>
                <div className="space-y-3 p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                  <DeltaMeter
                    label="Damage"
                    value={telemetry.damage}
                    suffix=""
                    maxScale={METER_SCALE.damage}
                  />
                  <DeltaMeter
                    label="ADS Handling"
                    value={telemetry.ads}
                    suffix="ms"
                    maxScale={METER_SCALE.ads}
                    invert
                  />
                  <DeltaMeter
                    label="Recoil Stability"
                    value={telemetry.recoil}
                    suffix="%"
                    maxScale={METER_SCALE.recoil}
                    invert
                  />
                  {equippedAttachments.length === 0 && (
                    <p className="text-[11px] font-mono text-slate-600 tracking-wider pt-1">
                      NO_ATTACHMENTS_EQUIPPED — baseline stats shown
                    </p>
                  )}
                </div>
              </div>

              {/* Tactical Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Tactical Description
                </label>
                <textarea
                  id="description"
                  value={tacticalDescription}
                  onChange={(e) => setTacticalDescription(e.target.value)}
                  rows={5}
                  placeholder="Describe your loadout strategy, attachments, playstyle..."
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-100 placeholder-slate-500 outline-none transition resize-none"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading || !selectedWeaponId || !tacticalDescription.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ boxShadow: "0 0 20px rgba(34,211,238,0.8)" }}
                animate={
                  loading
                    ? {
                        boxShadow: [
                          "0px 0px 0px rgba(8,145,178,0)",
                          "0px 0px 20px rgba(8,145,178,0.8)",
                          "0px 0px 0px rgba(8,145,178,0)",
                        ],
                        transition: {
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        },
                      }
                    : { boxShadow: "0px 0px 0px rgba(8,145,178,0)" }
                }
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Crosshair className="h-5 w-5" />
                )}
                Deploy Loadout
              </motion.button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}