"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, User, X, Loader2, Save } from "lucide-react";
import Cookies from "js-cookie";
import api from "@/lib/api";
import LoadoutCard, { type Loadout } from "@/components/LoadoutCard";

export default function ProfilePage() {
  const router = useRouter();

  // FIX: Explicitly type the array so TypeScript knows it contains Loadout objects
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tactical Calibration Modal state
  const [editingLoadout, setEditingLoadout] = useState<Loadout | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const fetchLoadouts = async () => {
      try {
        const response = await api.get("/loadouts/me/");
        setLoadouts(response.data.results);
      } catch (err: any) {
        console.error("Failed to fetch profile loadouts:", err);
        setError(
          err?.response?.data?.detail ||
            "Failed to load your deployments. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLoadouts();
  }, [router]);

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
  };

  const handleCloseEdit = () => {
    if (isUpdating) return;
    setEditingLoadout(null);
    setEditDescription("");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoadout || !editDescription.trim()) return;

    setIsUpdating(true);
    try {
      await api.patch(`/loadouts/${editingLoadout.id}/`, {
        tactical_description: editDescription.trim(),
      });

      // Mutate local state directly — no full re-fetch required
      setLoadouts((prev) =>
        prev.map((item) =>
          item.id === editingLoadout.id
            ? { ...item, description: editDescription.trim() }
            : item
        )
      );
      setEditingLoadout(null);
      setEditDescription("");
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
              className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl relative"
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

              <form onSubmit={handleUpdate} className="space-y-4">
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
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-700/60 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-slate-100 outline-none transition resize-none"
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
