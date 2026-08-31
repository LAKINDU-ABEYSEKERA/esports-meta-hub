"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Search, Loader2, Crosshair, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import LoadoutCard, { type Loadout } from "@/components/LoadoutCard";

interface SearchResponse {
  results: Loadout[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const headerFormVariants: Variants = {
  hidden: { opacity: 0, y: -40 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
};

const heroTextContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const heroTextItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 12 } },
};

export default function TacticalSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Loadout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await api.post<SearchResponse>("/loadouts/search/", {
        query: query.trim(),
      });
      setResults(response.data.results);
    } catch (err: any) {
      console.error("Search failed:", err);
      setError(
        err?.response?.data?.detail ||
          "Search failed. Please try again or check authentication."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950" />

      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={headerFormVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={heroTextContainer}
            initial="hidden"
            animate="show"
            className="mb-8 text-center"
          >
            <motion.h1
              variants={heroTextItem}
              className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2"
            >
              Tactical Database Search
            </motion.h1>
            <motion.p
              variants={heroTextItem}
              className="text-slate-400 max-w-2xl mx-auto"
            >
              Query the meta graph with natural language. Our AI will find the
              most relevant loadouts based on tactical descriptions and vector
              similarity.
            </motion.p>
          </motion.div>

          <motion.form
            onSubmit={handleSearch}
            className="max-w-3xl mx-auto mb-12 flex gap-3"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="relative flex-1 group">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-cyan-400/30 text-xl select-none pointer-events-none">[</div>
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-cyan-400/30 text-xl select-none pointer-events-none">]</div>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., aggressive mid-range AR for ranked"
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-100 placeholder-slate-500 outline-none transition group-focus-within:bg-slate-800/80 group-focus-within:ring-2 group-focus-within:ring-cyan-500/40"
              />
            </div>
            <motion.button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              Search
          </motion.button>
          </motion.form>
        </motion.div>

        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {results.map((loadout) => (
                <LoadoutCard key={loadout.id} loadout={loadout} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !error && results.length === 0 && (
          <div className="text-center py-16">
            <Crosshair className="h-12 w-12 mx-auto text-slate-700 mb-4" />
            <p className="text-slate-400 text-lg">
              Enter a tactical query to discover loadouts.
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Example: "high mobility SMG for close quarters"
            </p>
          </div>
        )}

        {loading && results.length === 0 && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}