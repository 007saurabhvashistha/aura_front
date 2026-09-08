import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { ProfilePage } from '../pages/ProfilePage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ConversationPage } from '../pages/ConversationPage';
import { AdminRoutes } from '../admin/routes/AdminRoutes';
import { StudioRoutes } from '../studio/routes/StudioRoutes';
import { AuraAppRoutes } from '../app/routes/AuraAppRoutes';
import { PlatformProviders } from '../providers/PlatformProviders';

/** Redirect authenticated users away from public auth pages. */
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'authenticated') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <PlatformProviders>
      <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnly>
            <SignupPage />
          </PublicOnly>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/conversation"
        element={
          <ProtectedRoute>
            <ConversationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <AuraAppRoutes />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/studio/*" element={<StudioRoutes />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </PlatformProviders>
  );
}
