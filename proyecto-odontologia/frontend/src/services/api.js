import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((configuracionPeticion) => {
  const tokenAutenticacion = localStorage.getItem("token");

  if (tokenAutenticacion) {
    configuracionPeticion.headers.Authorization = `Bearer ${tokenAutenticacion}`;
  }

  return configuracionPeticion;
});

export default api;