import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
    useRouteError
} from "react-router-dom";

import { lazy } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js"; // MODIFICACIÓN 1: Importar PayPal
import { Layout } from "./pages/Layout";

const Home = lazy(() => import("./pages/Home").then(m => ({ default: m.Home })));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.Register })));
const CreateGroupForm = lazy(() => import("./components/CreateGroupForm"));
const GroupDashboard = lazy(() => import("./components/GroupDashboard"));
const AcceptInvite = lazy(() => import("./components/AcceptInvite").then(m => ({ default: m.AcceptInvite })));
const PrivateRoute = lazy(() => import("./components/PrivateRoute").then(m => ({ default: m.PrivateRoute })));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const DebtsPage = lazy(() => import("./pages/DebtsPage"));
const AcceptFriendInvite = lazy(() => import("./pages/AcceptFriendInvite"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

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
            <Route path="/verify-email" element={<Register />} />

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