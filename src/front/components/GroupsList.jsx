import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const GroupList = () => {
    const { store, actions } = useGlobalReducer();
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);

    // Fetch groups once on mount
    useEffect(() => {
        const fetchGroups = async () => {
            await actions.loadUserGroups();
            setLoading(false);
        };
        fetchGroups();
    }, []);

    // Animation for cards when groups are loaded
    useEffect(() => {
        if (!loading && store.groups?.length > 0 && containerRef.current) {
            const cards = containerRef.current.querySelectorAll(".group-card");
            gsap.fromTo(cards,
                { opacity: 0, y: 30 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: "power2.out",
                    onComplete: () => {
                        // Limpiar estilos en línea de GSAP después de la animación
                        // para evitar conflictos con otros estilos (p. ej., hover)
                        gsap.set(cards, { clearProps: "opacity,transform" });
                    }
                }
            );
        }
    }, [loading, store.groups.length]);

    if (loading) {
        return (
            <div className="text-center p-5">
                <p style={{ color: "var(--color-base-light)", opacity: 0.6 }}>Loading groups...</p>
            </div>
        );
    }

    if (!store.groups || store.groups.length === 0) {
        return (
            <div className="text-center p-5" style={{ background: "rgba(255,255,255,0.03)", borderRadius: "20px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p style={{ color: "var(--color-base-light)", opacity: 0.6 }}>You don't have any active groups yet.</p>
                <Link to="/create-group" className="btn btn-sm px-4 py-3" style={{
                    background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)",
                    color: "var(--color-base-light)",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "600",
                    textDecoration: "none"
                }}>
                    Create my first group
                </Link>
            </div>
        );
    }

    return (
        <div className="row g-4" ref={containerRef}>
            {store.groups.map((group) => (
                <div key={group.id} className="col-12 col-md-6 col-lg-4">
                    <Link to={`/group/${group.id}`} style={{ textDecoration: 'none' }}>
                        <div className="group-card p-4 h-100 shadow-sm"
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: "22px",
                                border: "1px solid rgba(255,255,255,0.08)",
                                transition: "transform 0.3s ease, background 0.3s ease",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        >
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <span className="badge" style={{ background: "rgba(199, 106, 42, 0.2)", color: "var(--color-base-dark-orange)", borderRadius: "8px", padding: "5px 10px" }}>
                                    {group.category}
                                </span>
                                <small style={{ color: "var(--color-base-light)", opacity: 0.5 }}>
                                    {new Date(group.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </small>
                            </div>
                            <h4 className="fw-bold mb-2" style={{ color: "var(--color-base-light)" }}>{group.name}</h4>
                            <div className="mt-auto d-flex align-items-center" style={{ color: "var(--color-base-light)", fontSize: "0.85rem", opacity: 0.8 }}>
                                <i className="fas fa-users me-2"></i> View group details
                            </div>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
};