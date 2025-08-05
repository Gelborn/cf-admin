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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          // Verificar se o usuário é CF
          try {
            const { data: isCf, error } = await supabase.rpc('is_cf');
            if (error) {
              console.error('Erro ao verificar permissões:', error);
              await supabase.auth.signOut();
              toast.error('Erro ao verificar permissões');
              setIsCfUser(null);
              return;
            }

            if (!isCf) {
              await supabase.auth.signOut();
              toast.error('Acesso restrito a usuários Connecting Food');
              setIsCfUser(null);
              return;
            }

            setIsCfUser(true);
          } catch (error) {
            console.error('Erro na verificação CF:', error);
            await supabase.auth.signOut();
            toast.error('Erro ao verificar permissões');
            setIsCfUser(null);
          }
        } else {
          setIsCfUser(null);
        }
      }
    );

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
    setIsCfUser(null);
    await supabase.auth.signOut();
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