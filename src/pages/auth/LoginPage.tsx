import { Navigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { LoginForm } from '../../components/LoginForm';
import { useAuth } from '../../hooks/useAuth';
import { FullPageLoader } from '../../components/FullPageLoader';

export function LoginPage() {
  const { profile, loading, login } = useAuth();

  if (loading) return <FullPageLoader label="Loading..." />;
  if (profile) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <QrCode size={24} aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">VR360 QR Platform</h1>
          <p className="mt-1 text-sm text-slate-500">Video &amp; QR code management</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm onSubmit={login} />
        </div>
      </div>
    </div>
  );
}
