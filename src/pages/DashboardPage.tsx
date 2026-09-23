import { useAuth } from '../hooks/useAuth';
import { UserDashboard } from './user/UserDashboard';
import { AdminDashboard } from './admin/AdminDashboard';

export function DashboardPage() {
  const { profile } = useAuth();
  if (!profile) return null;
  return profile.role === 'admin' ? <AdminDashboard /> : <UserDashboard />;
}
