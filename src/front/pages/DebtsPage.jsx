import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import FadeContent from "../components/bits/FadeContent.jsx";
import CountUp from "../components/bits/CountUp.jsx";

const DebtsPage = () => {
    const { store, actions } = useGlobalReducer();
    const navigate = useNavigate();
    const [expandedFriend, setExpandedFriend] = useState(null);
    const listRef = useRef(null);

    useEffect(() => {
        actions.loadFriendDebts();
    }, []);

    // GSAP animation for debt cards
    useEffect(() => {
        if (listRef.current) {
            const cards = listRef.current.querySelectorAll(".debt-card-item");
            if (cards.length > 0) {
                gsap.fromTo(cards,
                    { opacity: 0, y: 20, scale: 0.98 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.08, ease: "power2.out" }
                );
            }
        }
    }, [store.friendDebts]);

    const debts = store.friendDebts;
    const isLoading = !debts;

    const formatAmount = (amount) => {
        return Math.abs(amount).toFixed(2);
    };

    const toggleExpand = (friendId) => {
        setExpandedFriend(expandedFriend === friendId ? null : friendId);
    };

    return (
        <div className="py-5">
            <div className="container mt-5">
                {/* Header */}
                <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0}>
                    <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4 mt-4">
                        <div>
                            <h1 className="fw-bold mb-1" style={{ color: "var(--color-base-light)", fontSize: "clamp(2rem, 5vw, 2.8rem)" }}>
                                <i className="fas fa-money-bill-transfer me-3" style={{ color: "var(--color-base-dark-orange)" }}></i>
                                My Debts
                            </h1>
                            <p className="mb-0" style={{ color: "var(--color-base-light)", opacity: 0.6, fontSize: "1rem" }}>
                                Your consolidated debts across all groups.
                            </p>
                        </div>
                        <button
                            className="btn text-white d-flex align-items-center justify-content-center"
                            onClick={() => navigate("/")}
                            style={{
                                height: "46px",
                                borderRadius: "14px",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                backdropFilter: "blur(12px)",
                                fontSize: "0.95rem",
                                fontWeight: "500",
                                padding: "0 24px",
                                color: "var(--color-base-cream)",
                                transition: "all 0.3s ease",
                                minWidth: "110px",
                                whiteSpace: "nowrap"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                            }}
                        >
                            <i className="fa-solid fa-arrow-left me-2"></i> Back
                        </button>
                    </div>
                </FadeContent>

                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border" role="status" style={{ color: "var(--color-base-dark-orange)" }}>
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <FadeContent blur={true} duration={1000}>
                            <div className="d-flex flex-wrap gap-3 mb-4 mt-4">
                                {/* You Owe */}
                                <div className="flex-fill p-4 stat-card" style={{ borderRadius: "18px", minWidth: "200px" }}>
                                    <small style={{
                                        color: "#f87171",
                                        textTransform: "uppercase",
                                        letterSpacing: "1.5px",
                                        fontSize: "0.75rem",
                                        fontWeight: "800"
                                    }}>You Owe</small>
                                    <h2 className="fw-bold mb-0 mt-2" style={{ color: "#f87171", fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
                                        $<CountUp from={0} to={debts.total_you_owe || 0} duration={0.8} decimals={2} />
                                    </h2>
                                </div>

                                {/* Owed to You */}
                                <div className="flex-fill p-4 stat-card" style={{ borderRadius: "18px", minWidth: "200px" }}>
                                    <small style={{
                                        color: "#4ade80",
                                        textTransform: "uppercase",
                                        letterSpacing: "1.5px",
                                        fontSize: "0.75rem",
                                        fontWeight: "800"
                                    }}>Owed to You</small>
                                    <h2 className="fw-bold mb-0 mt-2" style={{ color: "#4ade80", fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
                                        $<CountUp from={0} to={debts.total_owed_to_you || 0} duration={0.8} decimals={2} />
                                    </h2>
                                </div>

                                {/* Net Balance */}
                                <div className="flex-fill p-4 stat-card" style={{
                                    borderRadius: "18px",
                                    minWidth: "200px",
                                    background: debts.net_balance >= 0
                                        ? "linear-gradient(135deg, rgba(74,222,128,0.08), rgba(74,222,128,0.02))"
                                        : "linear-gradient(135deg, rgba(248,113,113,0.08), rgba(248,113,113,0.02))"
                                }}>
                                    <small style={{
                                        color: "var(--color-base-dark-orange)",
                                        textTransform: "uppercase",
                                        letterSpacing: "1.5px",
                                        fontSize: "0.75rem",
                                        fontWeight: "800"
                                    }}>Net Balance</small>
                                    <h2 className="fw-bold mb-0 mt-2" style={{
                                        color: debts.net_balance >= 0 ? "#4ade80" : "#f87171",
                                        fontSize: "clamp(1.5rem, 4vw, 2.2rem)"
                                    }}>
                                        {debts.net_balance >= 0 ? "+" : "-"}$<CountUp from={0} to={Math.abs(debts.net_balance || 0)} duration={0.8} decimals={2} />
                                    </h2>
                                    <small style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
                                        {debts.net_balance >= 0 ? "You're ahead! 🎉" : "Time to settle up"}
                                    </small>
                                </div>
                            </div>
                        </FadeContent>

                        {/* Debts by Friend */}
                        <div className="d-flex align-items-center mb-4">
                            <h5 className="fw-bold mb-0 text-white">Debts by Friend</h5>
                            <div className="ms-3 flex-grow-1" style={{ height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                        </div>

                        <div ref={listRef}>
                            {debts.debts_by_friend?.length === 0 ? (
                                <div className="text-center py-5 stat-card" style={{ borderRadius: "18px" }}>
                                    <i className="fas fa-check-circle mb-3" style={{ fontSize: "3rem", color: "#4ade80" }}></i>
                                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>All settled up! No pending debts.</p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {debts.debts_by_friend?.map((debt) => {
                                        const isExpanded = expandedFriend === debt.friend.id;
                                        const isPositive = debt.net_balance >= 0;

                                        return (
                                            <div
                                                key={debt.friend.id}
                                                className="debt-card-item stat-card"
                                                style={{ borderRadius: "16px", overflow: "hidden" }}
                                            >
                                                {/* Main row */}
                                                <div
                                                    className="d-flex align-items-center p-3"
                                                    onClick={() => toggleExpand(debt.friend.id)}
                                                    style={{ cursor: "pointer", minHeight: "64px" }}
                                                >
                                                    {/* Avatar */}
                                                    <div style={{
                                                        width: "48px",
                                                        height: "48px",
                                                        borderRadius: "50%",
                                                        background: isPositive
                                                            ? "linear-gradient(135deg, rgba(74,222,128,0.3), rgba(74,222,128,0.1))"
                                                            : "linear-gradient(135deg, rgba(248,113,113,0.3), rgba(248,113,113,0.1))",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "1.2rem",
                                                        fontWeight: "700",
                                                        color: isPositive ? "#4ade80" : "#f87171",
                                                        flexShrink: 0
                                                    }}>
                                                        {debt.friend.username?.[0]?.toUpperCase() || "?"}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="ms-3 flex-grow-1">
                                                        <h6 className="mb-0 text-white fw-bold">{debt.friend.username}</h6>
                                                        <small style={{ color: "rgba(255,255,255,0.4)" }}>
                                                            {isPositive ? "owes you" : "you owe"}
                                                        </small>
                                                    </div>

                                                    {/* Amount */}
                                                    <div className="text-end me-2">
                                                        <span className="fw-bold" style={{
                                                            color: isPositive ? "#4ade80" : "#f87171",
                                                            fontSize: "1.2rem"
                                                        }}>
                                                            {isPositive ? "+" : "-"}${formatAmount(debt.net_balance)}
                                                        </span>
                                                    </div>

                                                    {/* Expand icon */}
                                                    <i className={`fas fa-chevron-${isExpanded ? "up" : "down"}`}
                                                        style={{ color: "rgba(255,255,255,0.3)", transition: "transform 0.3s" }}></i>
                                                </div>

                                                {/* Expanded: Group breakdown */}
                                                {isExpanded && debt.groups?.length > 0 && (
                                                    <div className="px-3 pb-3">
                                                        <div style={{
                                                            background: "rgba(255,255,255,0.03)",
                                                            borderRadius: "12px",
                                                            padding: "12px"
                                                        }}>
                                                            <small className="d-block mb-2" style={{
                                                                color: "var(--color-base-dark-orange)",
                                                                fontWeight: "700",
                                                                textTransform: "uppercase",
                                                                letterSpacing: "1px",
                                                                fontSize: "0.7rem"
                                                            }}>
                                                                Breakdown by group
                                                            </small>
                                                            {debt.groups.map((g) => (
                                                                <div key={g.group_id} className="d-flex justify-content-between align-items-center py-2">
                                                                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
                                                                        <i className="fas fa-folder-open me-2" style={{ fontSize: "0.75rem" }}></i>
                                                                        {g.group_name}
                                                                    </span>
                                                                    <span style={{
                                                                        color: g.balance >= 0 ? "#4ade80" : "#f87171",
                                                                        fontWeight: "600",
                                                                        fontSize: "0.9rem"
                                                                    }}>
                                                                        {g.balance >= 0 ? "+" : "-"}${formatAmount(g.balance)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DebtsPage;
