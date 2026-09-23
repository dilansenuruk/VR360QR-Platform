import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  emphasize?: boolean;
}

export function StatCard({ label, value, icon: Icon, emphasize = false }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
        emphasize
          ? 'border-brand-200 bg-gradient-to-br from-brand-600 to-brand-700 text-white'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${emphasize ? 'text-brand-100' : 'text-slate-500'}`}>{label}</p>
        <Icon size={18} className={emphasize ? 'text-brand-100' : 'text-slate-400'} aria-hidden="true" />
      </div>
      <p className={`mt-2 text-3xl font-bold ${emphasize ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
