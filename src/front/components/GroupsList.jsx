import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const GroupList = () => {
    const { store, actions } = useGlobalReducer();
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);

    // Fetch groups only if not already loaded (dashboard handles initial fetch)
    useEffect(() => {
        let isMounted = true;
        const fetchGroups = async () => {
            if (!store.groups || store.groups.length === 0) {
                // If it's a direct entry here without dashboard (e.g. standalone route in future)
                // we fetch, but typically Dashboard handles it. Wait a tick to merge.
                await new Promise(resolve => setTimeout(resolve, 100)); // longer delay than dashboard so dashboard claims it first
                if (isMounted) {
                    await actions.loadUserGroups();
                }
            }
            if (isMounted) setLoading(false);
        };
        fetchGroups();

        return () => { isMounted = false; };
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
                        // Clear GSAP inline styles after animation
                        // to avoid conflicts with other styles (e.g., hover)
                        gsap.set(cards, { clearProps: "opacity,transform" });
                    }
                }
            );
        }
    }, [loading, store.groups.length]);

    if (loading) {
        return (
            <div className="row g-4">
                {[1, 2, 3].map((n) => (
                    <div key={n} className="col-12 col-md-6 col-lg-4">
                        <div className="skeleton-box px-3 py-4 px-md-4 py-md-4 h-100 shadow-sm"
                            style={{
                                borderRadius: "22px",
                                height: "160px"
                            }}
                        >
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div className="skeleton-box rounded" style={{ width: "60px", height: "24px", background: "rgba(255,255,255,0.1)" }}></div>
                                <div className="skeleton-box rounded" style={{ width: "80px", height: "20px", background: "rgba(255,255,255,0.1)" }}></div>
                            </div>
                            <div className="skeleton-box rounded mb-3 mt-4" style={{ width: "120px", height: "30px", background: "rgba(255,255,255,0.1)" }}></div>
                            <div className="skeleton-box rounded mt-2" style={{ width: "100px", height: "20px", background: "rgba(255,255,255,0.1)" }}></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!store.groups || store.groups.length === 0) {
        return (
            <div className="text-center p-5 empty-state-container" style={{ 
                background: "rgba(255,255,255,0.03)", 
                borderRadius: "20px", 
                border: "1px dashed rgba(255,255,255,0.1)",
                opacity: 0,
                transform: "translateY(20px)"
            }}
            ref={(el) => {
                if (el) {
                    gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: "power3.out" });
                }
            }}>
                <i className="fas fa-layer-group mb-3 d-block" style={{ fontSize: "2.5rem", color: "var(--color-base-dark-orange)", opacity: 0.4 }}></i>
                <p style={{ color: "var(--color-base-light)", opacity: 0.6 }}>You don't have any active groups yet.</p>
                <Link to="/create-group" className="btn btn-sm px-4 py-3 splitty-pulse-glow" style={{
                    background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)",
                    color: "var(--color-base-light)",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "600",
                    textDecoration: "none",
                    display: "inline-block"
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
                        <div className="group-card px-3 py-4 px-md-4 py-md-4 h-100 shadow-sm"
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