import { div } from "motion/react-client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export const AcceptInvite = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("Procesando tu invitación...");
    const navigate = useNavigate();
    const token = searchParams.get("token");

    useEffect(() => {
        const joinGroup = async () => {
            const response = await fetch(`${process.env.BACKEND_URL}/api/accept-invitation/${token}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });
            if (response.ok) {
                setStatus("Bienvenido al Grupo! Redirigiendo...");
                setTimeout(() => navigate("/dashboard"), 3000);
            } else {
                setStatus("Hubo un error o la invitación ya no es valida.");
            }
        };
        if (token) joinGroup();
    }, [token]);
    return (
        <div className= "container text-center mt-5"><h2>{status}</h2></div>
    );


};