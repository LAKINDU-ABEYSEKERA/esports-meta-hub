"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, User, X, Loader2, Save } from "lucide-react";
import Cookies from "js-cookie";
import api from "@/lib/api";
import LoadoutCard, { type Loadout, type Attachment } from "@/components/LoadoutCard";
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

const SLOT_TRIGGER_CLASS =
  "w-full px-2.5 py-1.5 rounded-md bg-slate-900/50 border-slate-700/50 text-slate-200 text-xs hover:border-cyan-500/50 focus:ring-cyan-500/30 transition-colors";

const SELECT_CONTENT_CLASS = "bg-slate-950 border-slate-800 text-slate-200";
const SELECT_ITEM_CLASS = "focus:bg-cyan-500/20 focus:text-cyan-300";

export default function ProfilePage() {
  const router = useRouter();

  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tactical Calibration Modal state
  const [editingLoadout, setEditingLoadout] = useState<Loadout | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editEquipped, setEditEquipped] = useState<Record<string, number | null>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [loadoutsRes, attachmentsRes] = await Promise.all([
          api.get("/loadouts/me/"),
          api.get("/attachments/"),
        ]);
        setLoadouts(loadoutsRes.data.results);
        setAttachments(attachmentsRes.data);
      } catch (err: any) {
        console.error("Failed to fetch profile data:", err);
        setError(
          err?.response?.data?.detail ||
            "Failed to load your deployments. Please try again."
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

  const editEquippedAttachments = useMemo(() => {
    return Object.values(editEquipped)
      .filter((id): id is number => id !== null)
      .map((id) => attachments.find((a) => a.id === id))
      .filter((a): a is Attachment => Boolean(a));
  }, [editEquipped, attachments]);

  const editTelemetry = useMemo(
    () => aggregateModifiers(editEquippedAttachments),
    [editEquippedAttachments]
  );

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/loadouts/${id}/`);
      setLoadouts((prev) => prev.filter((loadout) => loadout.id !== id));
    } catch (err: any) {
      console.error("Delete failed:", err);
      setError("Failed to revoke deployment. Please try again.");
    }
  };

  const handleOpenEdit = (loadout: Loadout) => {
    setEditingLoadout(loadout);
    setEditDescription(loadout.description);

    const seeded: Record<string, number | null> = Object.fromEntries(
      SLOT_ORDER.map((slot) => [slot, null])
    );
    for (const attachment of loadout.attachments ?? []) {
      seeded[attachment.slot] = attachment.id;
    }
    setEditEquipped(seeded);
  };

  const handleCloseEdit = () => {
    if (isUpdating) return;
    setEditingLoadout(null);
    setEditDescription("");
    setEditEquipped({});
  };

  // Shadcn's Select works off string values, so "none" is our sentinel for
  // an empty slot — Select/Radix-style primitives reject an empty string.
  // Base UI's onValueChange can also pass null directly; we treat that the
  // same as our "none" sentinel.
  const handleEditSlotChange = (slot: string, value: string | null) => {
    setEditEquipped((prev) => ({
      ...prev,
      [slot]: !value || value === "none" ? null : Number(value),
    }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoadout || !editDescription.trim()) return;

    setIsUpdating(true);
    try {
      const attachment_ids = Object.values(editEquipped).filter(
        (id): id is number => id !== null
      );

      await api.patch(`/loadouts/${editingLoadout.id}/`, {
        tactical_description: editDescription.trim(),
        attachment_ids,
      });

      // Resolve the full attachment objects from the pre-fetched pool so the
      // card's micro-chips and stat badges update immediately, no re-fetch.
      const updatedAttachments = attachment_ids
        .map((id) => attachments.find((a) => a.id === id))
        .filter((a): a is Attachment => Boolean(a));

      setLoadouts((prev) =>
        prev.map((item) =>
          item.id === editingLoadout.id
            ? {
                ...item,
                description: editDescription.trim(),
                attachments: updatedAttachments,
              }
            : item
        )
      );
      setEditingLoadout(null);
      setEditDescription("");
      setEditEquipped({});
    } catch (err: any) {
      console.error("Update failed:", err);
      setError(
        err?.response?.data?.detail ||
          "Failed to update configuration. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950" />

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Personal Command Center
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Manage your deployed tactical loadouts. Review, calibrate, or revoke
            configurations from the front lines.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <User className="h-5 w-5 text-cyan-400" />
            <span className="text-cyan-300 font-medium">
              Active Deployments: {loadouts.length}
            </span>
          </div>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && !error && loadouts.length > 0 && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 },
              },
            }}
          >
            <AnimatePresence>
              {loadouts.map((loadout) => (
                <motion.div
                  key={loadout.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 220, damping: 22 }}
                  className="h-full"
                >
                  <LoadoutCard
                    loadout={loadout}
                    onDelete={handleDelete}
                    onEdit={handleOpenEdit}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {!loading && !error && loadouts.length === 0 && (
          <div className="text-center py-16">
            <User className="h-12 w-12 mx-auto text-slate-700 mb-4" />
            <p className="text-slate-400 text-lg">
              No active deployments found.
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Deploy a new loadout to see it here.
            </p>
          </div>
        )}
      </div>

      {/* Tactical Calibration Modal */}
      <AnimatePresence>
        {editingLoadout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calibration-modal-title"
            onClick={handleCloseEdit}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div>
                  <h3
                    id="calibration-modal-title"
                    className="text-lg font-bold text-white flex items-center gap-2"
                  >
                    Calibrating {editingLoadout.weapon_name}
                  </h3>
                  <span className="text-xs font-mono text-cyan-400">
                    {editingLoadout.category} · SPEC_ID: #
                    {editingLoadout.id.toString().padStart(4, "0")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={isUpdating}
                  aria-label="Close calibration modal"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-5">
                {/* Attachment Re-Slotting Matrix */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                    Attachment Matrix
                  </label>
                  <div className="group grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800 transition-colors hover:border-slate-700/70">
                    {SLOT_ORDER.map((slot) => (
                      <div
                        key={slot}
                        className="rounded-lg border border-slate-800/70 bg-slate-900/30 p-2 transition-colors group-hover:border-slate-700/70"
                      >
                        <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">
                          {slot}
                        </label>
                        <Select
                          value={
                            editEquipped[slot] === null || editEquipped[slot] === undefined
                              ? "none"
                              : String(editEquipped[slot])
                          }
                          onValueChange={(value) => handleEditSlotChange(slot, value)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className={SLOT_TRIGGER_CLASS}>
                            <SelectValue placeholder="None / Stock">
                              {editEquipped[slot]
                                ? attachments.find((a) => a.id === editEquipped[slot])?.name
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

                {/* Live Delta Recalibration Preview */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                    Live Telemetry Preview
                  </label>
                  <div className="space-y-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                    <DeltaMeter
                      label="Damage"
                      value={editTelemetry.damage}
                      suffix=""
                      maxScale={METER_SCALE.damage}
                    />
                    <DeltaMeter
                      label="ADS Handling"
                      value={editTelemetry.ads}
                      suffix="ms"
                      maxScale={METER_SCALE.ads}
                      invert
                    />
                    <DeltaMeter
                      label="Recoil Stability"
                      value={editTelemetry.recoil}
                      suffix="%"
                      maxScale={METER_SCALE.recoil}
                      invert
                    />
                    {editEquippedAttachments.length === 0 && (
                      <p className="text-[11px] font-mono text-slate-600 tracking-wider pt-1">
                        NO_ATTACHMENTS_EQUIPPED — baseline stats shown
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="tactical-description"
                    className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider"
                  >
                    Tactical Description
                  </label>
                  <textarea
                    id="tactical-description"
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-700/60 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 outline-none transition resize-none disabled:opacity-50"
                    placeholder="Update loadout strategy..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating || !editDescription.trim()}
                    className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Apply Calibration
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}