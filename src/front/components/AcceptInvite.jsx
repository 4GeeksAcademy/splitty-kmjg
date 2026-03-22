import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
// Verifica que esta ruta sea exacta en tu explorador de archivos
import splittyLogo from "../assets/img/Splitty.ico"; 

export const AcceptInvite = () => {
    const { store } = useGlobalReducer();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("Procesando tu invitación...");
    const navigate = useNavigate();
    const token = searchParams.get("token");

    useEffect(() => {
        const processInvite = async () => {
            if (!token) {
                setStatus("Código de invitación no válido.");
                return;
            }

            if (!store.jwt) {
                localStorage.setItem("pending_invite_token", token);
                setStatus("Inicia sesión para unirte al grupo...");
                setTimeout(() => navigate("/login"), 1500);
                return;
            }

            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/groups/accept-invite`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${store.jwt}`
                    },
                    body: JSON.stringify({ token })
                });

                const data = await response.json();

                if (response.ok) {
                    setStatus("¡Te has unido con éxito!");
                    localStorage.removeItem("pending_invite_token");
                    setTimeout(() => navigate("/"), 2000);
                } else {
                    setStatus(data.error || "No pudiste unirte.");
                }
            } catch (error) {
                setStatus("Error de conexión con el servidor.");
            }
        };

        processInvite();
    }, [token, store.jwt, navigate]);

    return (
        <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
            <style>
                {`
                .drawing-logo {
                    width: 120px;
                    height: 120px;
                    /* Animación de dibujado */
                    stroke: #FF914D; 
                    stroke-width: 1.5;
                    stroke-dasharray: 1000;
                    stroke-dashoffset: 1000;
                    animation: draw-animation 4s ease-in-out infinite;
                }

                @keyframes draw-animation {
                    0% { stroke-dashoffset: 1000; fill: transparent; }
                    50% { stroke-dashoffset: 0; fill: transparent; }
                    80% { stroke-dashoffset: 0; fill: rgba(255, 145, 77, 0.2); }
                    100% { stroke-dashoffset: 0; fill: rgba(255, 145, 77, 0.2); }
                }
                `}
            </style>
            
            <div className="mb-4">
                {/* Usar el SVG como máscara o imagen con filtro si no es inline */}
                <img src={splittyLogo} className="drawing-logo" alt="Cargando..." />
            </div>
            
            <h3 className="text-secondary" style={{ fontWeight: '300' }}>
                {status}
            </h3>
        </div>
    );
};