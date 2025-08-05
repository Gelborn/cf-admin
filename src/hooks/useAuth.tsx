import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isCfUser: boolean | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCfUser, setIsCfUser] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        const cached =
          session?.user?.user_metadata?.is_cf ??
          JSON.parse(localStorage.getItem('isCfUser') ?? 'null');

        if (!session) {
          setIsCfUser(false);
          return;
        }

        if (cached !== null) {
          setIsCfUser(Boolean(cached));
          return;
        }

        try {
          const { data: isCf, error } = await supabase.rpc('is_cf');
          if (error || !isCf) {
            throw error ?? new Error('Acesso restrito a usuários Connecting Food');
          }
          setIsCfUser(Boolean(isCf));
          await supabase.auth.updateUser({ data: { is_cf: isCf } });
          localStorage.setItem('isCfUser', JSON.stringify(isCf));
        } catch (error) {
          console.error('Erro ao verificar permissões:', error);
          await supabase.auth.signOut({ scope: 'local' });
          localStorage.removeItem('isCfUser');
          toast.error('Erro ao verificar permissões');
          setIsCfUser(false);
        }
      } catch (error) {
        console.error('Erro ao obter sessão:', error);
        setIsCfUser(false);
      } finally {
        setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const cached =
          session.user.user_metadata?.is_cf ??
          JSON.parse(localStorage.getItem('isCfUser') ?? 'null');
        if (cached !== null) {
          setIsCfUser(Boolean(cached));
          setLoading(false);
          return;
        }

        try {
          const { data: isCf, error } = await supabase.rpc('is_cf');
          if (error || !isCf) {
            throw error ?? new Error('Acesso restrito a usuários Connecting Food');
          }
          setIsCfUser(true);
          await supabase.auth.updateUser({ data: { is_cf: isCf } });
          localStorage.setItem('isCfUser', JSON.stringify(isCf));
        } catch (error) {
          console.error('Erro na verificação CF:', error);
          await supabase.auth.signOut({ scope: 'local' });
          localStorage.removeItem('isCfUser');
          toast.error('Erro ao verificar permissões');
          setIsCfUser(false);
        }
      } else {
        setIsCfUser(null);
        localStorage.removeItem('isCfUser');
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // A verificação CF será feita automaticamente no onAuthStateChange
    return { error };
  };

  const signOut = async () => {
    try {
      // 1) encerra a sessão localmente (remove tokens do storage)
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('Erro no signOut:', err);
    } finally {
      // 2) limpa o estado da UI
      setUser(null);
      setSession(null);
      setIsCfUser(null);
      localStorage.removeItem('isCfUser');
    }
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isCfUser,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}