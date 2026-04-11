import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);      // Supabase user + profile merged
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (supabaseUser, accessToken) => {
    if (!supabaseUser) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (profile && !profile.is_approved) {
        // Not approved – sign them out immediately
        await supabase.auth.signOut();
        setUser(null);
        setToken(null);
      } else {
        setUser({ ...supabaseUser, ...profile });
        setToken(accessToken);
      }
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadProfile(session.user, session.access_token);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          loadProfile(session.user, session.access_token);
        } else {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      logout,
      isAuthenticated: !!user,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
