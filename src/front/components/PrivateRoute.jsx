import React from "react";
import { Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export const PrivateRoute = ({ children }) => {
    const { store } = useGlobalReducer();
    
    if (!store.jwt) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
};
