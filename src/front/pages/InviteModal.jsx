import React, { useState, useContext } from "react";
import { Context } from "../store/appContext";

export const InviteModal = ({ groupId, groupName }) => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleInvite = async () => {
        if (!email) return alert("Por favor, ingresa un correo");
        
        setLoading(true);
        const response = await fetch(`${process.env.BACKEND_URL}/api/invite`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ email: email, group_id: groupId })
        });

        setLoading(false);
        if (response.ok) {
            alert("¡Invitación enviada con éxito!");
            setEmail("");
            // Opcional: Cerrar el modal programáticamente aquí
        } else {
            alert("Error al enviar la invitación. Revisa la consola.");
        }
    };

    return (
        <div className="modal fade" id="inviteModal" tabIndex="-1" aria-labelledby="inviteModalLabel" aria-hidden="true">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="inviteModalLabel">Invitar a un amigo a {groupName}</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        <p>Enviaremos un correo electrónico con un enlace para que se unan a este grupo.</p>
                        <input 
                            type="email" 
                            className="form-control" 
                            placeholder="correo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button 
                            type="button" 
                            className="btn btn-primary" 
                            onClick={handleInvite}
                            disabled={loading}
                        >
                            {loading ? "Enviando..." : "Enviar Invitación"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};