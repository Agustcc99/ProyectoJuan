import { Navigate } from "react-router-dom";

// FIX HT4 (AUD-05): el estado de sesión llega del contexto, no de localStorage.
import useAuth from "../hooks/useAuth";

function RutaPrivada({ children }) {
  const { estaAutenticado } = useAuth();

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RutaPrivada;

