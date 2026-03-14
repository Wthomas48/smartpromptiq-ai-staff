import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api";
import {
  getTokens,
  setTokens,
  setUser as storeUser,
  clearAll,
  type StoredUser,
} from "@/lib/auth";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const verifyToken = useCallback(async () => {
    const tokens = getTokens();
    if (!tokens) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiGet<{ user: AuthUser }>("/api/auth/me");
      const u = data.user;
      setUser(u);
      storeUser(u as StoredUser);
    } catch {
      clearAll();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const login = async (email: string, password: string) => {
    const data = await apiPost<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>("/api/auth/login", { email, password });
    setTokens(data.accessToken, data.refreshToken);
    storeUser(data.user as StoredUser);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiPost<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>("/api/auth/register", { name, email, password });
    setTokens(data.accessToken, data.refreshToken);
    storeUser(data.user as StoredUser);
    setUser(data.user);
  };

  const logout = () => {
    clearAll();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
