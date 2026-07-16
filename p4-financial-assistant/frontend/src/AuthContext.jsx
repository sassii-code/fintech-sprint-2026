import { createContext, useContext } from "react";

// Public demo mode: there's no login, so every visitor shares the same fixed
// identity. The backend ignores the token entirely (app/services/auth_service.py)
// — it's kept here only because api.js still attaches it as a Bearer header.
const DEMO_CLIENT_ID = "demo";
const DEMO_TOKEN = "demo";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={{ token: DEMO_TOKEN, clientId: DEMO_CLIENT_ID }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
