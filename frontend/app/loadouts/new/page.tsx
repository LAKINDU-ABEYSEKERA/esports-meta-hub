// frontend/app/loadouts/new/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Crosshair,
  Loader2,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
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

interface VisionImportResponse {
  weapon_id: number;
  attachment_ids: number[];
}

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

const SELECT_TRIGGER_CLASS =
  "w-full px-4 py-3 rounded-lg bg-slate-900/50 border-slate-700/50 text-slate-200 hover:border-cyan-500/50 focus:ring-cyan-500/30 transition-colors";

const SLOT_TRIGGER_CLASS =
  "w-full px-3 py-2 rounded-lg bg-slate-900/50 border-slate-700/50 text-slate-200 text-sm hover:border-cyan-500/50 focus:ring-cyan-500/30 transition-colors";

const SELECT_CONTENT_CLASS = "bg-slate-950 border-slate-800 text-slate-200";
const SELECT_ITEM_CLASS = "focus:bg-cyan-500/20 focus:text-cyan-300";

export default function DeployLoadoutPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Tactical Vision (screenshot OCR) state
  const [isScanning, setIsScanning] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [visionMessage, setVisionMessage] = useState<string | null>(null);

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
      } catch (err: unknown) {
        console.error("Failed to fetch weapons/attachments:", err);
        setError("Failed to load weapon and attachment data. Please try again.");
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, [router]);

  // Auto-dismiss the vision extraction confirmation banner
  useEffect(() => {
    if (!visionMessage) return;
    const timeout = setTimeout(() => setVisionMessage(null), 6000);
    return () => clearTimeout(timeout);
  }, [visionMessage]);

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
  // Base UI's onValueChange can also pass null directly; we treat that the
  // same as our "none" sentinel.
  const handleSlotChange = (slot: string, value: string | null) => {
    setEquipped((prev) => ({
      ...prev,
      [slot]: !value || value === "none" ? null : Number(value),
    }));
  };

  const handleVisionFile = async (file: File) => {
    if (fetchingData || isScanning) return;

    setError(null);
    setVisionMessage(null);
    setIsScanning(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post<VisionImportResponse>(
        "/loadouts/vision-import/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const { weapon_id, attachment_ids } = response.data;
      setSelectedWeaponId(String(weapon_id));

      const seeded: Record<string, number | null> = Object.fromEntries(
        SLOT_ORDER.map((slot) => [slot, null])
      );
      let matchedCount = 0;
      for (const id of attachment_ids) {
        const attachment = attachments.find((a) => a.id === id);
        if (attachment) {
          seeded[attachment.slot] = attachment.id;
          matchedCount += 1;
        }
      }
      setEquipped(seeded);

      setVisionMessage(
        `Tactical Vision Extraction Complete: ${matchedCount} Attachment${
          matchedCount === 1 ? "" : "s"
        } Configured`
      );
    } catch (err: unknown) {
      console.error("Vision import failed:", err);
      setError(
        getErrorMessage(
          err,
          "Tactical Vision extraction failed. Please try manual calibration."
        )
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleVisionFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleVisionFile(file);
    e.target.value = ""; // allow re-selecting the same file
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
    } catch (err: unknown) {
      console.error("Deployment failed:", err);
      setError(
        getErrorMessage(
          err,
          "Deployment failed. Please try again or check authentication."
        )
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
            <>
              {/* Tactical Screenshot Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label="Drop or select a loadout screenshot to auto-calibrate"
                className={`relative overflow-hidden border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-6 ${
                  isDraggingOver
                    ? "border-cyan-400 bg-slate-900/40"
                    : "border-cyan-500/30 bg-slate-950/40 hover:border-cyan-400 hover:bg-slate-900/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                <div className="flex flex-col items-center gap-2 py-4">
                  <UploadCloud className="h-6 w-6 text-cyan-400/80" />
                  <p className="text-sm text-slate-300">
                    Drop Loadout Screenshot to Auto-Calibrate (OCR Engine)
                  </p>
                  <p className="text-xs text-slate-500">
                    PNG or JPG · in-game loadout screen
                  </p>
                </div>

                <AnimatePresence>
                  {isScanning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 backdrop-blur-sm"
                    >
                      <motion.div
                        className="h-8 w-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <span className="text-[11px] font-mono text-cyan-300 tracking-wider">
                        RUNNING TACTICAL VISION SCAN...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {visionMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-6 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{visionMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Weapon Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Primary Weapon
                  </label>
                                    <Select
                    value={selectedWeaponId}
                    onValueChange={(val) => setSelectedWeaponId(val ?? "")}
                  >
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
                            <SelectValue placeholder="None / Stock">
                              {equipped[slot]
                                ? attachments.find((a) => a.id === equipped[slot])?.name
                                : "None / Stock"}
                            </SelectValue>
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
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}