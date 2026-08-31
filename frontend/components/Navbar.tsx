"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { LogOut, ShieldCheck, Swords, User, Search, Crosshair } from "lucide-react";

function decodeJwtPayload(token: string | undefined): Record<string, any> | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const jsonPayload = decodeURIComponent(
      atob(paddedBase64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const navLinks = [
  { href: "/", label: "Search Graph", icon: Search },
  { href: "/loadouts/new", label: "Deploy Loadout", icon: Crosshair },
];

// MUST be defined outside the component to prevent React re-render glitches
const MotionLink = motion(Link);

export default function Navbar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const accessToken = Cookies.get("access_token");
    if (accessToken) {
      setIsLoggedIn(true);
      const payload = decodeJwtPayload(accessToken);
      const extractedId = payload?.sub || payload?.user_id || payload?.id;
      if (extractedId) {
        setUserId(String(extractedId));
      } else {
        setUserId(null);
      }
    } else {
      setIsLoggedIn(false);
      setUserId(null);
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    window.location.href = "/";
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-900/70 border-b border-cyan-500/20 shadow-lg shadow-cyan-500/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <Swords className="h-6 w-6 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-lg font-bold tracking-wide text-white group-hover:text-cyan-100 transition-colors group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
              Esports Meta Hub
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "text-cyan-300"
                      : "text-slate-300 hover:text-cyan-200"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-bg"
                      className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/30 rounded-md -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-9 w-24 bg-slate-800/50 rounded-md animate-pulse" />
            ) : !isLoggedIn ? (
              <MotionLink
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium transition-colors"
                animate={{ boxShadow: [
                  "0 0 0px rgba(34,211,238,0.1)",
                  "0 0 15px rgba(34,211,238,0.4)",
                  "0 0 0px rgba(34,211,238,0.1)"
                ] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ShieldCheck className="h-4 w-4" />
                Connect
              </MotionLink>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/50">
                  {userId ? (
                    <>
                      <User className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-slate-200 font-mono">{userId}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-cyan-300">Secure Session</span>
                    </>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}