import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isCfUser } = useAuth();

  // 👉 enquanto qualquer coisa ainda está sendo resolvida
  if (loading || isCfUser === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 👉 terminou de carregar, mas não está autenticado ou não é CF
  if (!user || isCfUser === false) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
