import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export const AcceptInvite = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("Processing your invitation...");
    const navigate = useNavigate();
    const token = searchParams.get("token");

    useEffect(() => {
        const joinGroup = async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/api/accept-invitation/${token}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });
            if (response.ok) {
                setStatus("Welcome to the Group! Redirecting...");
                setTimeout(() => navigate("/dashboard"), 3000);
            } else {
                setStatus("There was an error or the invitation is no longer valid.");
            }
        };
        if (token) joinGroup();
    }, [token]);
    return (
        <div className= "container text-center mt-5"><h2>{status}</h2></div>
    );


};