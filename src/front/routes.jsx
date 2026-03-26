import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
    useRouteError // Importamos este hook para ver el error real
} from "react-router-dom";

import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import CreateGroupForm from "./components/CreateGroupForm";
import GroupDashboard from "./components/GroupDashboard";
import { AcceptInvite } from "./components/AcceptInvite";
import { PrivateRoute } from "./components/PrivateRoute";

// 1. Creamos un componente para atrapar los fallos de código (crashes)
const RootErrorBoundary = () => {
    const error = useRouteError();
    console.error("¡La aplicación crasheó!", error);
    
    return (
        <div style={{ padding: "2rem", textAlign: "center", color: "white" }}>
            <h2>¡Oops! Algo falló en el código.</h2>
            {/* Esto te mostrará en pantalla exactamente qué línea de código falló */}
            <p style={{ color: "#ff4d4d" }}>{error.message || error.statusText}</p>
        </div>
    );
};

export const router = createBrowserRouter(
    createRoutesFromElements(
        // 2. Usamos el Boundary real en el errorElement
        <Route path="/" element={<Layout />} errorElement={<RootErrorBoundary />}>

            {/* Home */}
            <Route index element={<Home />} />

            {/* Auth */}
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="/create-group" element={
                <PrivateRoute>
                    <CreateGroupForm />
                </PrivateRoute>
            } />
            
            {/* Group Dashboard */}
            <Route path="/group/:id" element={
                <PrivateRoute>
                    <GroupDashboard />
                </PrivateRoute>
            } />

            {/* Invitation Support */}
            <Route path="/accept-invite" element={<AcceptInvite />} />

            {/* 3. ESTA es la forma correcta de manejar un "Page not found" (404) */}
            <Route path="*" element={<h1 style={{ color: "white", textAlign: "center" }}>404 - Page not found</h1>} />
        </Route>
    ),
    {
        future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
        },
    }
);