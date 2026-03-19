import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { Loading } from "./Loading";
import { AddExpenseForm } from "./AddExpenseForm";
import InviteModal from "./InviteModal";
import gsap from "gsap";

export const GroupDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { actions, store } = useGlobalReducer();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [data, setData] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const initialAnimation = useRef(false);

    // Current logged in user ID to format messages
    const currentUserId = store.user?.id || -1; 

    const loadDashboardData = async () => {
        setLoading(true);
        const resp = await actions.fetchGroupBalances(id);
        if (resp.success) {
            setData(resp.data);
            setError("");
        } else {
            setError(resp.error || "Could not load group dashboard");
        }
        setLoading(false);
    };

    useEffect(() => {
        loadDashboardData();
    }, [id]);

    useEffect(() => {
        if (!loading && data && !initialAnimation.current) {
            gsap.fromTo(".dashboard-element", 
                { opacity: 0, y: 15 }, 
                { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }
            );
            initialAnimation.current = true;
        }
    }, [loading, data]);

    if (loading) return <Loading />;
    if (error) return (
        <div className="container mt-5 text-center">
            <h2 className="splitty-gradient-text fw-bold">Error</h2>
            <p className="mb-4" style={{ color: "var(--color-base-cream)" }}>{error}</p>
            <button className="splitty-btn" style={{ maxWidth: "200px" }} onClick={() => navigate("/")}>
                Back to Home
            </button>
        </div>
    );

    const { personal_balances, settlements, users } = data;
    const groupMembersArray = Object.values(users);

    return (
        <div className="container py-4 dashboard-element">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                <div className="d-flex gap-2 w-100 w-md-auto">
                    <button className="btn text-white border-0 shadow-sm flex-grow-1 flex-md-grow-0" onClick={() => navigate("/")} style={{ borderRadius: "12px", background: "rgba(255,255,255,0.1)", fontSize: "0.9rem", padding: "12px 20px" }}>
                        <i className="fa-solid fa-arrow-left me-2"></i> Back
                    </button>
                    <button 
                        className="btn text-white border-0 shadow-sm px-4 flex-grow-1 flex-md-grow-0 hover-lift" 
                        onClick={() => setShowInviteModal(true)} 
                        style={{ 
                            borderRadius: "14px", 
                            background: "var(--splitty-gradient)", 
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            boxShadow: "0 8px 20px -8px rgba(187, 77, 0, 0.6)",
                            transition: "all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
                            padding: "12px 20px"
                        }}
                    >
                        <i className="fa-solid fa-user-plus me-2"></i> Invite Friend
                    </button>
                </div>
                <h1 className="fw-bold mb-0 splitty-gradient-text w-100 w-md-auto text-start text-md-end" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>Group Dashboard</h1>
            </div>

            <div className="row g-4">
                <div className="col-12 col-md-5">
                    {/* The Balances / Settlements Board */}
                    <div className="splitty-card dashboard-element p-4" style={{ maxWidth: "100%", padding: "2rem" }}>
                        <div className="p-0">
                            <h4 className="card-title fw-bold mb-4 splitty-gradient-text d-flex align-items-center">
                                <i className="fa-solid fa-scale-balanced me-2 text-warning fs-5"></i> Settle Up (Optimal Path)
                            </h4>
                            
                            {settlements.length === 0 ? (
                                <div className="text-center py-4">
                                    <div className="fs-1 mb-2">🎉</div>
                                    <p className="fw-bold m-0 fs-5" style={{ color: "#4ade80" }}>Everyone is settled up!</p>
                                    <small style={{ color: "#a19b95" }}>No pending debts.</small>
                                </div>
                            ) : (
                                <ul className="list-group list-group-flush bg-transparent">
                                    {settlements.map((tx, idx) => {
                                        const fromUser = users[tx.from].username;
                                        const toUser = users[tx.to].username;
                                        // Highlight current user
                                        const isCurrentUserInvolved = tx.from === currentUserId || tx.to === currentUserId;
                                        
                                        return (
                                            <li key={idx} className="list-group-item bg-transparent d-flex justify-content-between align-items-center px-0 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                                                <div style={{ color: "var(--color-base-light)" }}>
                                                    <strong style={{ color: "var(--color-base-dark-orange)" }}>{fromUser}</strong>
                                                    <span className="mx-2" style={{ color: "#a19b95", fontSize: "0.9rem" }}>owes</span>
                                                    <strong style={{ color: "var(--color-base-cream)" }}>{toUser}</strong>
                                                </div>
                                                <span className="badge rounded-pill fs-6 fw-bold shadow-sm" style={{ background: "var(--splitty-gradient)", color: "var(--color-base-light)" }}>
                                                    ${tx.amount.toFixed(2)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 dashboard-element">
                         <button 
                            className="splitty-btn w-100 py-3 mb-2" 
                            onClick={() => setShowAddForm(!showAddForm)}
                            style={{ 
                                background: showAddForm ? "rgba(255,255,255,0.1)" : "var(--splitty-gradient)",
                                color: showAddForm ? "var(--color-base-cream)" : "var(--color-base-light)"
                            }}
                        >
                            <i className={`fa-solid ${showAddForm ? 'fa-xmark' : 'fa-receipt'} me-2`}></i> 
                            {showAddForm ? "Cancel" : "Add New Expense"}
                        </button>
                    </div>
                </div>

                <div className="col-12 col-md-7 dashboard-element">
                    {showAddForm ? (
                        <AddExpenseForm 
                            groupId={id} 
                            groupMembers={groupMembersArray} 
                            onSuccess={() => {
                                setShowAddForm(false);
                                loadDashboardData();
                            }}
                            onCancel={() => setShowAddForm(false)}
                        />
                    ) : (
                        <div className="splitty-card text-center d-flex flex-column justify-content-center align-items-center text-white" style={{ maxWidth: "100%", padding: "2rem", minHeight: "350px" }}>
                            <i className="fa-solid fa-chart-pie display-1 mb-3 splitty-gradient-text" style={{ opacity: 0.3 }}></i>
                            <h3 className="splitty-gradient-text fw-bold mb-3">Shared Expenses</h3>
                            <p style={{ maxWidth: "300px", color: "#a19b95" }}>
                                Add all trip or apartment expenses and Splitty's algorithm will tell you exactly who to pay.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showInviteModal && (
                <InviteModal 
                    groupId={id} 
                    groupName={store.groups.find(g => g.id.toString() === id.toString())?.name || "the group"} 
                    onClose={() => setShowInviteModal(false)} 
                />
            )}
        </div>
    );
};

export default GroupDashboard;
