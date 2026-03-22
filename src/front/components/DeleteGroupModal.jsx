import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";

export const DeleteGroupModal = ({ groupId, groupName, groupCreatorId, onClose }) => {
    const { store, actions } = useGlobalReducer();
    const [confirmName, setConfirmName] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Verify if user is creator
    const isCreator = store.user?.id === groupCreatorId;

    useEffect(() => {
        gsap.fromTo(".delete-modal-overlay", { opacity: 0 }, { opacity: 1, duration: 0.3 });
        gsap.fromTo(".delete-modal-content", 
            { opacity: 0, scale: 0.9, y: 30 }, 
            { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power4.out" }
        );
    }, []);

    const handleClose = () => {
        gsap.to(".delete-modal-content", { opacity: 0, scale: 0.9, y: 30, duration: 0.3, ease: "power4.in" });
        gsap.to(".delete-modal-overlay", { opacity: 0, duration: 0.3, onComplete: onClose });
    };

    const handleDelete = async () => {
        if (confirmName !== groupName) {
            setError("Names do not match.");
            return;
        }

        setIsDeleting(true);
        setError("");

        const result = await actions.deleteGroup(groupId);

        if (result.success) {
            handleClose();
            // Need a slight delay to allow animation to complete before navigating
            setTimeout(() => {
                navigate("/");
            }, 300);
        } else {
            setError(result.error || "Failed to delete group.");
            setIsDeleting(false);
        }
    };

    const modalContent = (
        <div className="delete-modal-overlay" style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.15)", backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
        }} onClick={handleClose}>
            <div className="delete-modal-content splitty-card" style={{
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

                <h2 className="fw-bold mb-2" style={{ fontSize: "2rem", color: "var(--color-base-dark-orange)" }}>Delete Group</h2>
                <p className="mb-4" style={{ color: "var(--color-base-cream)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                    This action <strong style={{ color: "var(--color-base-dark-orange)" }}>cannot be undone</strong>. 
                    This will permanently delete the <strong>{groupName}</strong> group, its members, and all expenses.
                </p>

                {!isCreator ? (
                    <div className="alert mt-3" style={{ background: "rgba(255, 180, 171, 0.1)", border: "1px solid rgba(255, 180, 171, 0.3)", color: "#ffb4ab", borderRadius: "12px", fontSize: "0.9rem" }}>
                        <i className="fa-solid fa-triangle-exclamation me-2"></i> Only the group creator can delete this group.
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            <label className="splitty-label d-block mb-2 fw-semibold" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--color-base-cream)" }}>
                                Please type <strong style={{ color: "var(--color-base-dark-orange)" }}>{groupName}</strong> to confirm.
                            </label>
                            <input 
                                type="text" 
                                className="splitty-input mb-0 w-100" 
                                placeholder={groupName}
                                style={{ height: "48px", fontSize: "0.95rem" }}
                                value={confirmName}
                                onChange={(e) => setConfirmName(e.target.value)}
                            />
                            {error && <div className="text-danger small mt-2 px-1" style={{ color: "var(--color-base-dark-orange)" }}>{error}</div>}
                        </div>

                        <button 
                            className="splitty-btn w-100 m-0 d-flex align-items-center justify-content-center fw-bold" 
                            style={{ 
                                height: "48px", 
                                border: "none",
                                background: confirmName === groupName ? "linear-gradient(135deg, #93000a, #690005)" : "rgba(255, 255, 255, 0.05)",
                                color: confirmName === groupName ? "var(--color-base-cream)" : "rgba(255, 255, 255, 0.3)",
                                cursor: confirmName === groupName ? "pointer" : "not-allowed",
                                transition: "all 0.3s ease",
                                boxShadow: confirmName === groupName ? "0 8px 24px rgba(147, 0, 10, 0.4)" : "none"
                            }}
                            onClick={handleDelete}
                            disabled={isDeleting || confirmName !== groupName}
                        >
                            {isDeleting ? 'Deleting...' : 'I understand, delete this group'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default DeleteGroupModal;
