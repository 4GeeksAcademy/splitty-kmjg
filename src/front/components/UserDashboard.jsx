import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { GroupList } from "./GroupsList.jsx";
import FadeContent from "./bits/FadeContent.jsx";
import CountUp from "./bits/CountUp.jsx";

export const UserDashboard = () => {
    const { store, actions } = useGlobalReducer();

    useEffect(() => {
        // Load groups on mount
        actions.loadUserGroups();
    }, []);

    const totalGroups = store.groups?.length || 0;

    return (
        <div className="min-vh-100 py-5" style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #151515 100%)" }}>
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
                            <div className="p-4 flex-fill stat-card" style={statCardStyle}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                            >
                                <small style={statLabelStyle}>Active Groups</small>
                                <h2 className="fw-bold mb-0 text-white mt-2">
                                    <CountUp from={0} to={totalGroups} duration={1} />
                                </h2>
                            </div>

                            {/* Card: Overall Balance */}
                            <div className="p-4 flex-fill stat-card" style={statCardStyle}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                            >
                                <small style={statLabelStyle}>Overall Balance</small>
                                <h2 className="fw-bold mb-0 mt-2" style={{ color: "#4ade80" }}>$0.00</h2>
                            </div>

                            {/* Card: Friends/Network */}
                            <div className="p-4 flex-fill stat-card" style={statCardStyle}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                            >
                                <small style={statLabelStyle}>Friends</small>
                                <div className="mt-2">
                                    <span style={{ color: "var(--color-base-light)", fontSize: "0.9rem", opacity: 0.8 }}>
                                        No friends yet
                                    </span>
                                </div>
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
    background: "rgba(255,255,255,0.06)",
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
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