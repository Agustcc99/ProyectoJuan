import { BrowserRouter } from "react-router-dom";
import AppRouter from "./routes/AppRouter";

// FIX HT4 (AUD-05): el estado de sesión se provee a toda la aplicación.
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

