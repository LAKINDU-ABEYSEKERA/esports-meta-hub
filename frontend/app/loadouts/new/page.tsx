// File: frontend/app/loadouts/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api'; // Your custom secure interceptor
import Cookies from 'js-cookie';
import { Crosshair, FileText, Send, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Weapon {
  id: number;
  name: string;
}

export default function CreateLoadout() {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [selectedWeapon, setSelectedWeapon] = useState('');
  const [tacticalDescription, setTacticalDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchWeapons = async () => {
      try {
        const res = await api.get('/weapons/'); 
        setWeapons(res.data);
      } catch (err) {
        console.error('Failed to fetch weapons', err);
      }
    };
    fetchWeapons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = Cookies.get('access_token');
    if (!token) {
      setError('Authentication missing. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/loadouts/', {
        weapon: selectedWeapon,
        tactical_description: tacticalDescription,
        attachments: []
      });
      
      router.push('/');
    } catch (err: any) {
      const serverError = err.response?.data?.detail;
      // Strictly enforce string typing to satisfy TypeScript
      if (typeof serverError === 'string') {
        setError(serverError);
      } else {
        setError('Failed to submit loadout. Please verify your data.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-8 flex justify-center items-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-2xl w-full relative z-10"
      >
        <header className="mb-8 border-b border-slate-800 pb-4">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 tracking-tight">
            Forge New Loadout
          </h1>
          <p className="text-slate-400 mt-2">Design and deploy your meta build to the vector database.</p>
        </header>

        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-900 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
          
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-500" />
              Base Platform
            </label>
    <Select onValueChange={(value) => setSelectedWeapon(value as string)} required>
              <SelectTrigger className="w-full bg-slate-950 border-slate-800 focus:ring-cyan-500/50 h-14 rounded-xl text-slate-200">
                <SelectValue placeholder="Select a weapon..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 rounded-xl">
                {weapons.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()} className="focus:bg-slate-800 focus:text-cyan-400 cursor-pointer">
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              Tactical Analysis
            </label>
            <Textarea
              required
              rows={5}
              value={tacticalDescription}
              onChange={(e) => setTacticalDescription(e.target.value)}
              placeholder="Detail the playstyle, strengths, and ideal engagement distances..."
              className="w-full bg-slate-950 border-slate-800 focus-visible:ring-cyan-500/50 resize-none text-slate-200 p-4 rounded-xl text-lg"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !selectedWeapon}
            className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg transition-all rounded-xl shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)]"
          >
            {loading ? 'Generating AI Vector...' : (
              <>
                <Send className="w-5 h-5 mr-2" /> Deploy Loadout
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </main>
  );
}