import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import gsap from "gsap";

export const InviteModal = ({ groupId, groupName, onClose }) => {
    const { actions } = useGlobalReducer();
    const [inviteLink, setInviteLink] = useState("");
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Generate link on mount
        const getLink = async () => {
            setLoading(true);
            const resp = await actions.generateInviteLink(groupId);
            if (resp.success) {
                setInviteLink(resp.link);
            }
            setLoading(false);
        };
        getLink();

        // Animation for entry
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

    const handleClose = () => {
        gsap.to(".invite-modal-content", { opacity: 0, scale: 0.9, y: 30, duration: 0.3, ease: "power4.in" });
        gsap.to(".invite-modal-overlay", { opacity: 0, duration: 0.3, onComplete: onClose });
    };

    const modalContent = (
        <div className="invite-modal-overlay" style={{
            position: "fixed",
            top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.15)", // Very slight tint to help contrast
            backdropFilter: "blur(25px)", // Extreme blur for premium feel
            WebkitBackdropFilter: "blur(25px)", // Safari support
            zIndex: 9999, // Ensure it's above EVERYTHING
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
        }} onClick={handleClose}>
            <div className="invite-modal-content splitty-card" style={{
                maxWidth: "450px",
                width: "100%",
                padding: "2.5rem 2rem",
                position: "relative",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }} onClick={e => e.stopPropagation()}>
                
                <button 
                    onClick={handleClose}
                    className="border-0 bg-transparent"
                    style={{
                        position: "absolute",
                        top: "1.5rem",
                        right: "1.5rem",
                        color: "var(--color-base-cream)",
                        opacity: 0.4,
                        fontSize: "1.4rem",
                        cursor: "pointer",
                        transition: "opacity 0.2s"
                    }}
                    onMouseEnter={e => e.target.style.opacity = 0.8}
                    onMouseLeave={e => e.target.style.opacity = 0.4}
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>

                <h2 className="splitty-gradient-text fw-bold mb-2" style={{ fontSize: "2rem" }}>Invite Group</h2>
                <p className="mb-4" style={{ color: "#a19b95", fontSize: "1rem" }}>
                    Share this link to add friends to <span style={{ color: "var(--color-base-cream)" }}>{groupName}</span>.
                </p>

                <div className="mt-2">
                    <label className="splitty-label splitty-gradient-text" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Unique Invitation Link
                    </label>
                    <div className="d-flex gap-2">
                        <input 
                            type="text" 
                            readOnly 
                            className="splitty-input mb-0 flex-grow-1" 
                            style={{ 
                                fontSize: "0.9rem", 
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.05)",
                                opacity: loading ? 0.5 : 1,
                                height: "56px"
                            }}
                            value={loading ? "Generating link..." : inviteLink}
                        />
                        <button 
                            className="splitty-btn mt-0" 
                            style={{ 
                                width: "auto", 
                                padding: "0 1.5rem", 
                                height: "56px",
                                background: copied ? "#4ade80" : "var(--splitty-gradient)",
                                boxShadow: copied ? "0 4px 15px rgba(74, 222, 128, 0.2)" : "0 4px 15px rgba(187, 77, 0, 0.2)",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                            onClick={handleCopy}
                            disabled={loading}
                        >
                            {copied ? (
                                <i className="fa-solid fa-check fs-5"></i>
                            ) : (
                                <i className="fa-solid fa-copy fs-5"></i>
                            )}
                        </button>
                    </div>
                </div>

                <div className="mt-4 pt-3 text-center">
                    <div className="d-flex align-items-center justify-content-center gap-2" style={{ color: "#a19b95", fontSize: "0.8rem" }}>
                        <i className="fa-solid fa-shield-halved text-warning"></i>
                        <span>This link is private to your group.</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default InviteModal;