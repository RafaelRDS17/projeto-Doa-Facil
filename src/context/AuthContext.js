import { createContext, useEffect, useMemo, useState } from 'react';

import {
  getValidatedSession,
  onAuthStateChange,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function validateAndSetSession() {
    const validatedSession = await getValidatedSession();

    setSession(validatedSession.session);
    setProfile(validatedSession.profile);

    return validatedSession;
  }

  useEffect(() => {
    let isMounted = true;

    validateAndSetSession()
      .then(() => {
        if (isMounted) {
          setError(null);
        }
      })
      .catch((sessionError) => {
        if (isMounted) {
          setError(sessionError);
          setSession(null);
          setProfile(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    const unsubscribe = onAuthStateChange(() => {
      validateAndSetSession()
        .catch((sessionError) => {
          setError(sessionError);
          setSession(null);
          setProfile(null);
        })
        .finally(() => {
          setLoading(false);
        });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      hasProfile: Boolean(profile),
      loading,
      error,
      refreshProfile: validateAndSetSession,
      signIn: signInWithEmail,
      signUp: signUpWithEmail,
      signOut,
    }),
    [error, loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
