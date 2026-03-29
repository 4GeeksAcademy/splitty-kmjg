import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { GroupList } from "./GroupsList.jsx";
import FadeContent from "./bits/FadeContent.jsx";
import CountUp from "./bits/CountUp.jsx";

export const UserDashboard = () => {
    const { store, actions } = useGlobalReducer();
    const navigate = useNavigate();

    useEffect(() => {
        // Load groups on mount
        actions.loadUserGroups();
        // Load friends data
        actions.loadFriends();
        actions.loadPendingRequests();
        actions.loadFriendDebts();

        // Check for pending friend invitation token (from accept-friend flow)
        const pendingToken = sessionStorage.getItem("pending_friend_token");
        if (pendingToken) {
            navigate(`/accept-friend?token=${pendingToken}`);
        }
    }, []);

    const totalGroups = store.groups?.length || 0;
    const totalFriends = store.friends?.length || 0;
    const netBalance = store.friendDebts?.net_balance || 0;

    return (
        <div className="py-5">
            <div className="container mt-5">

                {/* Header Section */}
                <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0} className="row mb-5 align-items-center">
                    <div className="col-12 col-md-8 text-start">
                        <h1 className="fw-bold" style={{ color: "var(--color-base-light)", fontSize: "clamp(2rem, 5vw, 2.8rem)" }}>
                            Hello, <span className="splitty-gradient-text" style={{ color: "var(--color-base-dark-orange)" }}>{store.user?.username || "User"}</span>
                        </h1>
                        <p style={{ color: "var(--color-base-light)", opacity: 0.7, fontSize: "1.1rem" }}>
                            Welcome back to Splitty.
                        </p>
                    </div>
                    <div className="col-12 col-md-4 text-md-end mt-3 mt-md-0">
                        <Link to="/create-group" className="btn splitty-btn shadow-lg p-3 px-md-5"
                            style={{
                                background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)",
                                color: "var(--color-base-light)",
                                border: "none",
                                borderRadius: "12px",
                                fontWeight: "600"
                            }}>
                            <i className="fas fa-plus me-2"></i> New Group
                        </Link>
                    </div>
                </FadeContent>

                {/* Stats Cards */}
                <div className="row g-4 mb-5">
                    <FadeContent blur={true} duration={1500}>
                        <div className="d-flex flex-wrap gap-4">
                            {/* Card: Active Groups */}
                            <div className="p-3 p-md-4 flex-fill stat-card" style={statCardStyle}>
                                <small style={statLabelStyle}>Active Groups</small>
                                <h2 className="fw-bold mb-0 text-white mt-2">
                                    <CountUp from={0} to={totalGroups} duration={0.5} />
                                </h2>
                            </div>

                            {/* Card: Overall Balance */}
                            <div className="p-3 p-md-4 flex-fill stat-card" style={{ ...statCardStyle, cursor: "pointer" }}
                                onClick={() => navigate("/debts")}>
                                <small style={statLabelStyle}>Overall Balance</small>
                                <h2 className="fw-bold mb-0 mt-2" style={{ color: netBalance >= 0 ? "#4ade80" : "#f87171" }}>
                                    {netBalance >= 0 ? "+" : "-"}$<CountUp from={0} to={Math.abs(netBalance)} duration={0.8} decimals={2} />
                                </h2>
                                {store.friendDebts && (
                                    <small style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
                                        {netBalance >= 0 ? "You're ahead" : "You owe more"} • Tap to view
                                    </small>
                                )}
                            </div>

                            {/* Card: Friends */}
                            <div className="p-3 p-md-4 flex-fill stat-card" style={{ ...statCardStyle, cursor: "pointer" }}
                                onClick={() => navigate("/friends")}>
                                <div className="d-flex justify-content-between align-items-start">
                                    <small style={statLabelStyle}>Friends</small>
                                    <i className="fas fa-arrow-right" style={{
                                        color: "var(--color-base-dark-orange)",
                                        fontSize: "0.85rem",
                                        opacity: 0.7,
                                        transition: "transform 0.2s ease, opacity 0.2s ease"
                                    }}></i>
                                </div>
                                <h2 className="fw-bold mb-0 text-white mt-2">
                                    <CountUp from={0} to={totalFriends} duration={0.5} />
                                </h2>
                                {store.friendRequests?.received?.length > 0 ? (
                                    <small style={{ color: "var(--color-base-dark-orange)", fontSize: "0.8rem", fontWeight: "600" }}>
                                        {store.friendRequests.received.length} pending request{store.friendRequests.received.length > 1 ? "s" : ""}
                                    </small>
                                ) : (
                                    <span className="d-inline-flex align-items-center mt-2 px-3 py-1"
                                        style={{
                                            background: "linear-gradient(135deg, rgba(252,164,52,0.15), rgba(199,106,42,0.1))",
                                            borderRadius: "20px",
                                            color: "var(--color-base-dark-orange)",
                                            fontSize: "0.75rem",
                                            fontWeight: "600",
                                            letterSpacing: "0.3px",
                                            gap: "6px"
                                        }}>
                                        View Friends <i className="fas fa-chevron-right" style={{ fontSize: "0.6rem" }}></i>
                                    </span>
                                )}
                            </div>
                        </div>
                    </FadeContent>
                </div>

                <div className="d-flex align-items-center mb-4">
                    <h3 className="fw-bold mb-0 text-white">Your Shared Groups</h3>
                    <div className="ms-3 flex-grow-1" style={{ height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                </div>

                {/* Groups Grid */}
                <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0} className="row">
                    <div className="col-12">
                        <GroupList />
                    </div>
                </FadeContent>

            </div>
        </div>
    );
};

// Styles
const statCardStyle = {
    borderRadius: "18px",
    cursor: "pointer",
    minWidth: "240px"
};

const statLabelStyle = {
    color: "var(--color-base-dark-orange)",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    fontSize: "0.9rem",
    fontWeight: "800"
};

export default UserDashboard;