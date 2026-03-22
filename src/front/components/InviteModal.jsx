import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import gsap from "gsap";

export const InviteModal = ({ groupId, groupName, onClose }) => {
    const { actions } = useGlobalReducer();
    const [inviteLink, setInviteLink] = useState("");
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    
    const [email, setEmail] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        const getLink = async () => {
            setLoading(true);
            const resp = await actions.generateInviteLink(groupId);
            if (resp.success) {
                setInviteLink(resp.link);
            }
            setLoading(false);
        };
        getLink();

        gsap.fromTo(".invite-modal-overlay", { opacity: 0 }, { opacity: 1, duration: 0.3 });
        gsap.fromTo(".invite-modal-content", 
            { opacity: 0, scale: 0.9, y: 30 }, 
            { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power4.out" }
        );
    }, [groupId]);

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendEmail = async () => {
        if (!email) return alert("Please enter an email");
        
        setSendingEmail(true);
        // Obtenemos el token de acceso para evitar el error 401
        const token = localStorage.getItem("token"); 

        try {
            const response = await fetch(`https://silver-memory-pj57p55w575xc76g7-5000.app.github.dev//api/groups/${groupId}/invite-link`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', // Esto soluciona el error 415
                    "Authorization": "Bearer " + token // Esto soluciona el error 401
                },
                body: JSON.stringify({
                    email: email,
                    group_name: groupName,
                    group_id: groupId
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`¡Invitación enviada con éxito a ${email}!`);
                setEmail("");
            } else {
                console.error("Error del servidor:", data);
                alert(data.msg || "Hubo un error al enviar la invitación.");
            }
        } catch (error) {
            console.error("Error en la petición:", error);
            alert("Error de conexión con el servidor.");
        } finally {
            setSendingEmail(false);
        }
    };

    const handleClose = () => {
        gsap.to(".invite-modal-content", { opacity: 0, scale: 0.9, y: 30, duration: 0.3, ease: "power4.in" });
        gsap.to(".invite-modal-overlay", { opacity: 0, duration: 0.3, onComplete: onClose });
    };

    const modalContent = (
        <div className="invite-modal-overlay" style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.15)", backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
        }} onClick={handleClose}>
            <div className="invite-modal-content splitty-card" style={{
                maxWidth: "450px", width: "100%", padding: "2.5rem 2rem",
                position: "relative", border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }} onClick={e => e.stopPropagation()}>
                
                <button onClick={handleClose} className="border-0 bg-transparent" style={{
                    position: "absolute", top: "1.5rem", right: "1.5rem",
                    color: "var(--color-base-cream)", opacity: 0.4, fontSize: "1.4rem", cursor: "pointer"
                }}>
                    <i className="fa-solid fa-xmark"></i>
                </button>

                <h2 className="splitty-gradient-text fw-bold mb-2" style={{ fontSize: "2rem" }}>Invite Group</h2>
                <p className="mb-4" style={{ color: "#a19b95", fontSize: "1rem" }}>
                    Add friends to <span style={{ color: "var(--color-base-cream)" }}>{groupName}</span>.
                </p>

                <div className="mt-2">
                    <label className="splitty-label splitty-gradient-text" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Unique Invitation Link
                    </label>
                    <div className="d-flex gap-2">
                        <input type="text" readOnly className="splitty-input mb-0 flex-grow-1" 
                            style={{ fontSize: "0.8rem", background: "rgba(0,0,0,0.3)", height: "45px" }}
                            value={loading ? "Generating link..." : inviteLink}
                        />
                        <button className="splitty-btn mt-0" onClick={handleCopy} disabled={loading}
                            style={{ width: "auto", padding: "0 1rem", height: "45px", background: copied ? "#4ade80" : "var(--splitty-gradient)" }}>
                            {copied ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-copy"></i>}
                        </button>
                    </div>
                </div>

                <div className="my-4 d-flex align-items-center gap-2">
                    <hr className="flex-grow-1" style={{ opacity: 0.1 }} />
                    <span style={{ fontSize: "0.7rem", color: "#a19b95", textTransform: "uppercase" }}>OR</span>
                    <hr className="flex-grow-1" style={{ opacity: 0.1 }} />
                </div>

                <div>
                    <label className="splitty-label splitty-gradient-text" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Send via Email
                    </label>
                    <div className="d-flex flex-column gap-2">
                        <input 
                            type="email" 
                            className="splitty-input mb-0" 
                            placeholder="friend@email.com"
                            style={{ height: "45px", fontSize: "0.9rem" }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <button 
                            className="splitty-btn w-100 mt-1" 
                            style={{ height: "45px" }}
                            onClick={handleSendEmail}
                            disabled={sendingEmail || loading}
                        >
                            {sendingEmail ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                </div>

                <div className="mt-4 pt-2 text-center">
                    <div className="d-flex align-items-center justify-content-center gap-2" style={{ color: "#a19b95", fontSize: "0.8rem" }}>
                        <i className="fa-solid fa-shield-halved text-warning"></i>
                        <span>Private invitation link.</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default InviteModal;