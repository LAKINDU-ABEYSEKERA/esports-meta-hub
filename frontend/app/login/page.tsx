// File: frontend/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:8000/api/v1/token/', {
        username,
        password,
      });

      Cookies.set('access_token', res.data.access, { expires: 1 });
      Cookies.set('refresh_token', res.data.refresh, { expires: 7 });

      router.push('/loadouts/new');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid operative credentials. Please check your username and passcode.');
      } else {
        setError('Cannot reach authentication server. Ensure backend container is active.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute w-96 h-96 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4 shadow-[0_0_20px_rgba(8,145,178,0.15)]">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Secure Uplink</h1>
          <p className="text-slate-400 mt-2 text-sm">Authenticate to access the forge.</p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="bg-red-950/60 border border-red-800/60 text-red-300 p-3.5 rounded-xl flex items-center gap-3 text-sm font-medium">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Operative ID (Username)
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 rounded-xl h-12 px-4 text-slate-200 outline-none transition-all autofill:shadow-[inset_0_0_0px_1000px_#020617] autofill:[-webkit-text-fill-color:#e2e8f0]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Passcode
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 rounded-xl h-12 px-4 text-slate-200 outline-none transition-all autofill:shadow-[inset_0_0_0px_1000px_#020617] autofill:[-webkit-text-fill-color:#e2e8f0]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl mt-4 transition-all shadow-[0_0_15px_rgba(8,145,178,0.3)] hover:shadow-[0_0_25px_rgba(8,145,178,0.5)] cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Establish Connection'}
          </Button>
        </form>
      </motion.div>
    </main>
  );
}