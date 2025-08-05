import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isCfUser } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* ① Se não há usuário, manda para /login imediatamente */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /* ② Usuário existe, mas ainda não sabemos se é CF → spinner */
  if (isCfUser === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* ③ Sabemos que NÃO é CF → bloqueia */
  if (isCfUser === false) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
