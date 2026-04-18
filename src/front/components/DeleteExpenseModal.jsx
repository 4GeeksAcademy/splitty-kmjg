import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import gsap from "gsap";

export const DeleteExpenseModal = ({ expenseId, onClose, onConfirm }) => {
    const { actions } = useGlobalReducer();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        gsap.fromTo(".delete-expense-modal-overlay", { opacity: 0 }, { opacity: 1, duration: 0.3 });
        gsap.fromTo(".delete-expense-modal-content", 
            { opacity: 0, scale: 0.9, y: 30 }, 
            { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power4.out" }
        );
    }, []);

    const handleClose = () => {
        gsap.to(".delete-expense-modal-content", { opacity: 0, scale: 0.9, y: 30, duration: 0.3, ease: "power4.in" });
        gsap.to(".delete-expense-modal-overlay", { opacity: 0, duration: 0.3, onComplete: onClose });
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        setError("");

        const result = await actions.deleteExpense(expenseId);

        if (result.success) {
            handleClose();
            // Need a slight delay to allow animation to complete before calling onConfirm
            setTimeout(() => {
                if(onConfirm) onConfirm();
            }, 300);
        } else {
            setError(result.error || "Failed to delete expense.");
            setIsDeleting(false);
        }
    };

    const modalContent = (
        <div className="delete-expense-modal-overlay d-flex align-items-center justify-content-center p-3" style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.15)", backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)", zIndex: 9999
        }} onClick={handleClose}>
            <div className="delete-expense-modal-content splitty-card p-4 p-md-5 w-100" style={{
                maxWidth: "450px", position: "relative",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }} onClick={e => e.stopPropagation()}>
                
                <button onClick={handleClose} className="border-0 bg-transparent" style={{
                    position: "absolute", top: "1.5rem", right: "1.5rem",
                    color: "var(--color-base-cream)", opacity: 0.4, fontSize: "1.4rem", cursor: "pointer"
                }}>
                    <i className="fa-solid fa-xmark"></i>
                </button>

                <h2 className="fw-bold mb-2" style={{ fontSize: "2rem", color: "var(--color-base-dark-orange)" }}>Delete Expense</h2>
                <p className="mb-4" style={{ color: "var(--color-base-cream)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                    Are you sure you want to delete this expense? This action <strong style={{ color: "var(--color-base-dark-orange)" }}>cannot be undone</strong> and will affect the group balances.
                </p>

                {error && <div className="text-danger small mb-3 px-1" style={{ color: "var(--color-base-dark-orange)" }}>{error}</div>}

                <div className="d-flex gap-3 mt-2">
                    <button 
                        className="btn flex-grow-1"
                        style={{
                            height: "48px",
                            borderRadius: "14px",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "var(--color-base-cream)",
                            fontWeight: "600",
                            transition: "all 0.3s ease"
                        }}
                        onClick={handleClose}
                        disabled={isDeleting}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                    >
                        Cancel
                    </button>

                    <button 
                        className="btn flex-grow-1 d-flex align-items-center justify-content-center fw-bold" 
                        style={{ 
                            height: "48px", 
                            borderRadius: "14px",
                            border: "none",
                            background: "linear-gradient(135deg, #93000a, #690005)",
                            color: "var(--color-base-cream)",
                            transition: "all 0.3s ease"
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.filter = "brightness(1.15)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow = "0 8px 16px rgba(147, 0, 10, 0.4)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.filter = "brightness(1)";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default DeleteExpenseModal;
