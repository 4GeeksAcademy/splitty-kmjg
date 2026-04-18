import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
    useRouteError
} from "react-router-dom";

import { PayPalScriptProvider } from "@paypal/react-paypal-js"; // MODIFICACIÓN 1: Importar PayPal
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import CreateGroupForm from "./components/CreateGroupForm";
import GroupDashboard from "./components/GroupDashboard";
import { AcceptInvite } from "./components/AcceptInvite";
import { PrivateRoute } from "./components/PrivateRoute";
import FriendsPage from "./pages/FriendsPage";
import DebtsPage from "./pages/DebtsPage";
import AcceptFriendInvite from "./pages/AcceptFriendInvite";
import ResetPassword from "./pages/ResetPassword";

const RootErrorBoundary = () => {
    const error = useRouteError();
    console.error("¡La aplicación crasheó!", error);
    
    return (
        <div style={{ padding: "2rem", textAlign: "center", color: "white" }}>
            <h2>¡Oops! Algo falló en el código.</h2>
            <p style={{ color: "#ff4d4d" }}>{error.message || error.statusText}</p>
        </div>
    );
};

export const router = createBrowserRouter(
    createRoutesFromElements(
        // MODIFICACIÓN 2: Envolver el Layout con el Provider
        <Route 
            path="/" 
            element={
                <PayPalScriptProvider options={{ "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID }}>
                    <Layout />
                </PayPalScriptProvider>
            } 
            errorElement={<RootErrorBoundary />}
        >

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

            {/* Friends & Debts */}
            <Route path="/friends" element={
                <PrivateRoute>
                    <FriendsPage />
                </PrivateRoute>
            } />
            <Route path="/debts" element={
                <PrivateRoute>
                    <DebtsPage />
                </PrivateRoute>
            } />

            {/* Invitation Support */}
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/accept-friend" element={<AcceptFriendInvite />} />
            <Route path="/reset-password" element={<ResetPassword />} />

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