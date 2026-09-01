// frontend/app/loadouts/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Crosshair, Loader2, ShieldAlert } from "lucide-react";
import Cookies from "js-cookie";
import api from "@/lib/api";

interface Weapon {
  id: number;
  name: string;
}

export default function DeployLoadoutPage() {
  const router = useRouter();
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>("");
  const [tacticalDescription, setTacticalDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingWeapons, setFetchingWeapons] = useState(true);

  // Authentication check & weapon fetch
  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const fetchWeapons = async () => {
      try {
        const response = await api.get("/weapons/");
        setWeapons(response.data);
      } catch (err: any) {
        console.error("Failed to fetch weapons:", err);
        setError("Failed to load weapon list. Please try again.");
      } finally {
        setFetchingWeapons(false);
      }
    };

    fetchWeapons();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeaponId || !tacticalDescription.trim()) {
      setError("Please select a weapon and provide a tactical description.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post("/loadouts/", {
        weapon: Number(selectedWeaponId),
        tactical_description: tacticalDescription.trim(),
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
          {fetchingWeapons ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Weapon Selection */}
              <div>
                <label
                  htmlFor="weapon"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Primary Weapon
                </label>
                <select
                  id="weapon"
                  value={selectedWeaponId}
                  onChange={(e) => setSelectedWeaponId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-100 outline-none transition"
                >
                  <option value="" disabled>
                    Select a weapon...
                  </option>
                  {weapons.map((weapon) => (
                    <option key={weapon.id} value={weapon.id}>
                      {weapon.name}
                    </option>
                  ))}
                </select>
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