import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import { RequireAuth, RequireAdmin } from './components/RouteGuards';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { VideosPage } from './pages/user/VideosPage';
import { MyQrGenerationsPage } from './pages/user/MyQrGenerationsPage';
import { AdminVideosPage } from './pages/admin/AdminVideosPage';
import { AdminQrHistoryPage } from './pages/admin/AdminQrHistoryPage';
import { AdminStatisticsPage } from './pages/admin/AdminStatisticsPage';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/my-qr-generations" element={<MyQrGenerationsPage />} />

              <Route path="/admin/videos" element={<RequireAdmin><AdminVideosPage /></RequireAdmin>} />
              <Route path="/admin/qr-history" element={<RequireAdmin><AdminQrHistoryPage /></RequireAdmin>} />
              <Route path="/admin/statistics" element={<RequireAdmin><AdminStatisticsPage /></RequireAdmin>} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
