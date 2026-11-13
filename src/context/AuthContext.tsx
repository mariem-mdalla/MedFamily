import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, family_id, role, display_name, language, large_text, high_contrast, voice_enabled')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    await supabase.auth.signOut();
    return null;
  }

  return data;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshProfile() {
    const userId = (await supabase.auth.getSession()).data.session?.user.id;

    if (!userId) {
      setProfile(null);
      return;
    }

    const nextProfile = await loadProfile(userId);
    setProfile(nextProfile);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setProfile(null);
  }

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);

      if (data.session?.user.id) {
        try {
          const nextProfile = await loadProfile(data.session.user.id);
          if (isMounted) {
            setProfile(nextProfile);
          }
        } catch {
          if (isMounted) {
            setProfile(null);
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user.id) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      loadProfile(nextSession.user.id)
        .then((nextProfile) => {
          setProfile(nextProfile);
        })
        .catch(() => {
          setProfile(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return value;
}
