import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/*
  FIX HT4 (AUD-05): hook para consumir el estado de sesión.

  Cualquier componente que necesite el usuario autenticado, su token o sus permisos
  llama a useAuth() en lugar de leer localStorage. El error explícito evita que un
  componente quede fuera del AuthProvider sin que nos demos cuenta.
*/
function useAuth() {
  const contextoAutenticacion = useContext(AuthContext);

  if (!contextoAutenticacion) {
    throw new Error("useAuth() debe usarse dentro de un AuthProvider.");
  }

  return contextoAutenticacion;
}

export default useAuth;
