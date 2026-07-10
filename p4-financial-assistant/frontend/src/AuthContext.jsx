import { createContext, useContext, useState } from "react";

const TOKEN_KEY = "finsight_token";
const CLIENT_KEY = "finsight_client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [clientId, setClientId] = useState(() => localStorage.getItem(CLIENT_KEY));

  function login(newToken, newClientId) {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(CLIENT_KEY, newClientId);
    setToken(newToken);
    setClientId(newClientId);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CLIENT_KEY);
    setToken(null);
    setClientId(null);
  }

  return (
    <AuthContext.Provider value={{ token, clientId, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
