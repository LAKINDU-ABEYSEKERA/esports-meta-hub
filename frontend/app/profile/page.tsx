"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Trash2, ShieldAlert, User } from "lucide-react";
import Cookies from "js-cookie";
import api from "@/lib/api";
import LoadoutCard, { type Loadout } from "@/components/LoadoutCard";

export default function ProfilePage() {
  const router = useRouter();
  
  // FIX: Explicitly type the array so TypeScript knows it contains Loadout objects
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950" />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Personal Command Center
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Manage your deployed tactical loadouts. Review, deploy, or revoke
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
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="relative group"
                >
                  <LoadoutCard loadout={loadout} />
                  <button
                    onClick={() => handleDelete(loadout.id)}
                    className="absolute top-3 right-3 p-2 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors opacity-0 group-hover:opacity-100"
                    title="Revoke Deployment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
    </div>
  );
}