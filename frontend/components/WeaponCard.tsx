// File: frontend/components/WeaponCard.tsx
interface Weapon {
  id: number;
  name: string;
  category: string;
  base_damage: number;
  base_fire_rate: number;
}

export default function WeaponCard({ weapon }: { weapon: Weapon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg hover:border-cyan-500 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold text-white">{weapon.name}</h3>
        <span className="bg-cyan-950 text-cyan-400 text-xs px-2.5 py-1 rounded-full font-medium border border-cyan-800">
          {weapon.category}
        </span>
      </div>
      <div className="text-sm text-slate-400 space-y-1">
        <p>Base Damage: <span className="text-slate-200 font-semibold">{weapon.base_damage}</span></p>
        <p>Fire Rate: <span className="text-slate-200 font-semibold">{weapon.base_fire_rate} RPM</span></p>
      </div>
    </div>
  );
}