import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  QrCode,
  History,
  BarChart3,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { Profile } from '../types';

interface SidebarProps {
  profile: Profile;
  onLogout: () => void;
  onNavigate?: () => void;
}

const userLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/videos', label: 'Videos', icon: Video },
  { to: '/my-qr-generations', label: 'My QR Generations', icon: QrCode },
];

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/videos', label: 'Videos', icon: Video },
  { to: '/admin/qr-history', label: 'QR Generation History', icon: History },
  { to: '/admin/statistics', label: 'Statistics', icon: BarChart3 },
];

export function Sidebar({ profile, onLogout, onNavigate }: SidebarProps) {
  const links = profile.role === 'admin' ? adminLinks : userLinks;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <QrCode size={18} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-slate-900">VR360 QR Platform</p>
          <p className="text-xs text-slate-400">Video &amp; QR Manager</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          {profile.role === 'admin' ? (
            <ShieldCheck size={16} className="text-brand-600" aria-hidden="true" />
          ) : (
            <UserRound size={16} className="text-slate-400" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{profile.username}</p>
            <p className="text-xs capitalize text-slate-400">{profile.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-danger-50 hover:text-danger-600"
        >
          <LogOut size={18} aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );
}
