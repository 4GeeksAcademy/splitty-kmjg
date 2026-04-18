import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import FadeContent from "../components/bits/FadeContent.jsx";
import PaymentForm from "../components/PaymentForm.jsx";
import PaymentHistory from "../components/PaymentHistory.jsx";
import ReceiptViewerLightbox from "../components/ReceiptViewerLightbox.jsx";

const DebtsPage = () => {
    const { store, actions } = useGlobalReducer();
    const navigate = useNavigate();
    const [expandedFriend, setExpandedFriend] = useState(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState(null);
    const [activeTab, setActiveTab] = useState("debts"); // debts | payments
    const [actionPaymentId, setActionPaymentId] = useState(null);
    const [hoveringCancel, setHoveringCancel] = useState(null);
    const [notification, setNotification] = useState(null);
    const [lightboxData, setLightboxData] = useState({ isOpen: false, fileUrl: null });
    const listRef = useRef(null);

    useEffect(() => {
        actions.loadFriendDebts();
        actions.fetchPendingPayments();
    }, []);

    // Auto-hide notification after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

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

    const handlePayDebt = (debt) => {
        setSelectedDebt(debt);
        setShowPaymentForm(true);
    };

    const handlePaymentCreated = async (groupId, paymentData) => {
        const result = await actions.createPayment(groupId, paymentData);
        if (result.success) {
            setNotification({ type: "success", message: "Payment registered! Waiting for confirmation." });
            setTimeout(() => {
                setShowPaymentForm(false);
                setSelectedDebt(null);
            }, 1500);
        } else {
            setNotification({ type: "error", message: result.error || "Failed to create payment" });
        }
        return result;
    };

    const handleConfirmPayment = async (paymentId) => {
        setActionPaymentId(paymentId);
        const result = await actions.confirmPayment(paymentId);
        if (result.success) {
            setNotification({ type: "success", message: "Payment confirmed successfully!" });
            await actions.fetchPendingPayments();
            await actions.loadFriendDebts();
        } else {
            setNotification({ type: "error", message: result.error || "Failed to confirm payment" });
        }
        setActionPaymentId(null);
    };

    const handleCancelPayment = async (paymentId) => {
        setActionPaymentId(paymentId);
        const result = await actions.cancelPayment(paymentId);
        if (result.success) {
            setNotification({ type: "success", message: "Payment cancelled." });
            await actions.fetchPendingPayments();
            await actions.loadFriendDebts();
        } else {
            setNotification({ type: "error", message: result.error || "Failed to cancel payment" });
        }
        setActionPaymentId(null);
    };

    const handleViewReceipt = (url) => {
        setLightboxData({ isOpen: true, fileUrl: url });
    };

    // Get all pending payments from store
    const pendingReceived = store.pendingPayments?.received || [];
    const pendingSent = store.pendingPayments?.sent || [];

    // Combine all payments for history
    const allPayments = [...pendingReceived, ...pendingSent].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    // Calculate effective totals by summing up effective balances for each friend
    // This allows the header cards to match the friend-level synthetic updates correctly.
    let effectiveTotalOwe = 0;
    let effectiveTotalOwedToYou = 0;

    if (debts?.debts_by_friend) {
        debts.debts_by_friend.forEach((d) => {
            // Subtract pending sent to this specific friend from what we owe them
            const pendingToThisFriend = pendingSent
                .filter(p => p.receiver_id === d.friend.id)
                .reduce((sum, p) => sum + p.amount, 0);
            
            // net_balance: positive = friend owes user, negative = user owes friend
            const effBal = d.net_balance + pendingToThisFriend;
            
            if (effBal > 0) {
                effectiveTotalOwedToYou += effBal;
            } else if (effBal < 0) {
                effectiveTotalOwe += Math.abs(effBal);
            }
        });
    }

    const effectiveNetBalance = effectiveTotalOwedToYou - effectiveTotalOwe;

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
                                        ${effectiveTotalOwe.toFixed(2)}
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
                                        ${effectiveTotalOwedToYou.toFixed(2)}
                                    </h2>
                                </div>

                                {/* Net Balance */}
                                <div className="flex-fill p-4 stat-card" style={{
                                    borderRadius: "18px",
                                    minWidth: "200px",
                                    background: effectiveNetBalance >= 0
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
                                        color: effectiveNetBalance >= 0 ? "#4ade80" : "#f87171",
                                        fontSize: "clamp(1.5rem, 4vw, 2.2rem)"
                                    }}>
                                        {effectiveNetBalance >= 0 ? "+" : "-"}${Math.abs(effectiveNetBalance || 0).toFixed(2)}
                                    </h2>
                                    <small style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
                                        {effectiveNetBalance >= 0 ? "You're ahead! 🎉" : "Time to settle up"}
                                    </small>
                                </div>
                            </div>
                        </FadeContent>

                        {/* Notification */}
                        {notification && (
                            <div style={{
                                position: "fixed",
                                bottom: "100px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                zIndex: 9999,
                                width: "max-content",
                                maxWidth: "90vw"
                            }}>
                                <FadeContent duration={300}>
                                    <div style={{
                                        padding: "12px 24px",
                                        borderRadius: "100px",
                                        background: notification.type === "success"
                                            ? "rgba(74, 222, 128, 0.9)"
                                            : "rgba(248, 113, 113, 0.9)",
                                        border: `1px solid ${notification.type === "success" ? "rgba(74, 222, 128, 0.3)" : "rgba(248, 113, 113, 0.3)"}`,
                                        backdropFilter: "blur(16px)",
                                        color: "#fff",
                                        boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        fontWeight: "600",
                                        fontSize: "0.95rem",
                                        textAlign: "center"
                                    }}>
                                        <i className={`fas ${notification.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`}></i>
                                        {notification.message}
                                    </div>
                                </FadeContent>
                            </div>
                        )}

                        {/* Tabs */}
                        <FadeContent blur={true} duration={800}>
                            <div style={{
                                display: "flex",
                                gap: "8px",
                                marginBottom: "24px",
                                background: "rgba(255, 255, 255, 0.03)",
                                padding: "6px",
                                borderRadius: "14px",
                                border: "1px solid rgba(255, 255, 255, 0.08)"
                            }}>
                                {["debts", "payments"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        style={{
                                            flex: 1,
                                            padding: "10px 20px",
                                            borderRadius: "10px",
                                            border: "none",
                                            background: activeTab === tab
                                                ? "linear-gradient(135deg, rgba(255,140,0,0.8), rgba(255,127,80,0.8))"
                                                : "transparent",
                                            color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.6)",
                                            fontSize: "0.95rem",
                                            fontWeight: activeTab === tab ? "600" : "500",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                            textTransform: "capitalize",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px"
                                        }}
                                    >
                                        <i className={`fas ${tab === "debts" ? "fa-hand-holding-dollar" : "fa-receipt"}`}></i>
                                        {tab === "debts" ? "My Debts" : "Payments"}
                                        {tab === "payments" && (pendingReceived.length + pendingSent.length) > 0 && (
                                            <span style={{
                                                background: "rgba(255,255,255,0.2)",
                                                borderRadius: "10px",
                                                padding: "2px 8px",
                                                fontSize: "0.7rem",
                                                marginLeft: "4px"
                                            }}>
                                                {pendingReceived.length + pendingSent.length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </FadeContent>

                        {activeTab === "debts" ? (
                            <>
                                {/* Pending Payments Alert */}
                                {pendingReceived.length > 0 && (
                                    <FadeContent duration={400}>
                                        <div style={{
                                            background: "rgba(255, 193, 7, 0.1)",
                                            border: "1px solid rgba(255, 193, 7, 0.3)",
                                            borderRadius: "14px",
                                            padding: "16px 20px",
                                            marginBottom: "20px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px"
                                        }}>
                                            <i className="fas fa-bell" style={{ color: "#ffc107", fontSize: "1.2rem" }}></i>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ margin: 0, color: "#fff", fontWeight: "500" }}>
                                                    You have {pendingReceived.length} payment{pendingReceived.length > 1 ? "s" : ""} to confirm
                                                </p>
                                                <p style={{ margin: "4px 0 0 0", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                                                    Total: ${pendingReceived.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab("payments")}
                                                style={{
                                                    padding: "10px 18px",
                                                    borderRadius: "10px",
                                                    border: "1px solid rgba(255, 193, 7, 0.5)",
                                                    background: "rgba(255, 193, 7, 0.15)",
                                                    color: "#ffc107",
                                                    fontSize: "0.85rem",
                                                    fontWeight: "600",
                                                    cursor: "pointer",
                                                    transition: "all 0.2s ease"
                                                }}
                                            >
                                                View
                                            </button>
                                        </div>
                                    </FadeContent>
                                )}

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
                                                
                                                // Subtract pending sent to this specific friend
                                                const pendingToThisFriend = pendingSent
                                                    .filter(p => p.receiver_id === debt.friend.id)
                                                    .reduce((sum, p) => sum + p.amount, 0);
                                                
                                                const effectiveFriendBalance = debt.net_balance + pendingToThisFriend; // net_balance is negative if we owe them
                                                const isPositive = effectiveFriendBalance >= 0;
                                                
                                                // Check for a specific pending payment sent to this friend
                                                const currentPendingSent = pendingSent.find(p => p.receiver_id === debt.friend.id);
                                                
                                                // Only pay if effectively owe them > $0.05 and NO pending payment exists
                                                const canPay = effectiveFriendBalance <= -0.05 && !currentPendingSent; 

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
                                                                    {isPositive ? "+" : "-"}${formatAmount(effectiveFriendBalance)}
                                                                </span>
                                                            </div>

                                                            {/* Expand icon */}
                                                            <i className={`fas fa-chevron-${isExpanded ? "up" : "down"}`}
                                                                style={{ color: "rgba(255,255,255,0.3)", transition: "transform 0.3s" }}></i>
                                                        </div>

                                                        {/* Expanded: Group breakdown + Pay button */}
                                                        {isExpanded && (
                                                            <div className="px-3 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" }}>
                                                                {debt.groups?.length > 0 && (
                                                                    <div style={{
                                                                        background: "rgba(255,255,255,0.03)",
                                                                        borderRadius: "12px",
                                                                        padding: "12px",
                                                                        marginBottom: "16px"
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
                                                                )}

                                                                {/* Pay Debt Button */}
                                                                {canPay && (
                                                                    <button
                                                                        onClick={() => handlePayDebt({ ...debt, net_balance: effectiveFriendBalance })}
                                                                        className="btn-stable-layout"
                                                                        style={{
                                                                            width: "100%",
                                                                            padding: "12px",
                                                                            borderRadius: "10px",
                                                                            border: "none",
                                                                            background: "linear-gradient(135deg, #f87171, #ef4444)",
                                                                            color: "#fff",
                                                                            fontSize: "0.95rem",
                                                                            fontWeight: "600",
                                                                            cursor: "pointer",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                            gap: "8px",
                                                                            transition: "all 0.2s ease"
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.transform = "scale(1.02)";
                                                                            e.currentTarget.style.boxShadow = "0 4px 20px rgba(248, 113, 113, 0.4)";
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.transform = "scale(1)";
                                                                            e.currentTarget.style.boxShadow = "none";
                                                                        }}
                                                                    >
                                                                        <i className="fas fa-money-bill-transfer"></i>
                                                                        Pay ${Math.abs(effectiveFriendBalance).toFixed(2)}
                                                                    </button>
                                                                )}

                                                                {/* Pending Confirmation View for Debtor */}
                                                                {currentPendingSent && (
                                                                    <div className="p-3" style={{ 
                                                                        marginTop: "16px",
                                                                        background: "linear-gradient(135deg, rgba(252, 164, 52, 0.12), rgba(252, 164, 52, 0.04))", 
                                                                        borderRadius: "16px", 
                                                                        border: "1px solid rgba(252, 164, 52, 0.2)",
                                                                        backdropFilter: "blur(4px)",
                                                                        display: "flex",
                                                                        flexDirection: "column",
                                                                        gap: "12px",
                                                                        boxShadow: "0 8px 32px 0 rgba(252, 164, 52, 0.08)"
                                                                    }}>
                                                                        <div className="d-flex align-items-center justify-content-between">
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <div style={{
                                                                                    width: "32px", height: "32px", 
                                                                                    borderRadius: "50%", 
                                                                                    background: "rgba(252, 164, 52, 0.2)", 
                                                                                    display: "flex", alignItems: "center", justifyContent: "center"
                                                                                }}>
                                                                                    <i className="fas fa-hourglass-half" style={{ color: "#ffc107", fontSize: "0.85rem" }}></i>
                                                                                </div>
                                                                                <span style={{ color: "var(--color-base-dark-orange)", fontWeight: "700", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                                                                    Payment Sent
                                                                                </span>
                                                                            </div>
                                                                            <span className="fw-bold" style={{ color: "var(--color-base-light)", fontSize: "1.05rem" }}>
                                                                                ${currentPendingSent.amount.toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleCancelPayment(currentPendingSent.id)}
                                                                            disabled={actionPaymentId === currentPendingSent.id}
                                                                            className={`btn-stable-layout ${actionPaymentId === currentPendingSent.id ? "splitty-btn-loading" : ""}`}
                                                                            onMouseEnter={() => setHoveringCancel(currentPendingSent.id)}
                                                                            onMouseLeave={() => setHoveringCancel(null)}
                                                                            style={{
                                                                                width: "100%",
                                                                                padding: "11px",
                                                                                borderRadius: "10px",
                                                                                border: hoveringCancel === currentPendingSent.id ? "1px solid rgba(248, 113, 113, 0.5)" : "1px solid rgba(248, 113, 113, 0.3)",
                                                                                background: hoveringCancel === currentPendingSent.id ? "rgba(248, 113, 113, 0.15)" : "rgba(248, 113, 113, 0.06)",
                                                                                color: "#f87171",
                                                                                fontSize: "0.88rem",
                                                                                fontWeight: "600",
                                                                                cursor: actionPaymentId === currentPendingSent.id ? "default" : "pointer",
                                                                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "center",
                                                                                gap: "8px",
                                                                                boxShadow: hoveringCancel === currentPendingSent.id ? "0 4px 15px rgba(248, 113, 113, 0.15)" : "none",
                                                                                opacity: actionPaymentId === currentPendingSent.id ? 0.7 : 1
                                                                            }}
                                                                        >
                                                                            <i className="fas fa-times-circle"></i>
                                                                            {actionPaymentId === currentPendingSent.id ? "Attempting Cancel..." : "Cancel Payment"}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Payments Tab */}
                                <div className="d-flex align-items-center mb-4">
                                    <h5 className="fw-bold mb-0 text-white">Payment History</h5>
                                    <div className="ms-3 flex-grow-1" style={{ height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                                </div>

                                {/* Pending to Confirm */}
                                {pendingReceived.length > 0 && (
                                    <>
                                        <div className="d-flex align-items-center mb-3">
                                            <h6 className="mb-0" style={{ color: "#ffc107", fontSize: "0.9rem" }}>
                                                <i className="fas fa-clock me-2"></i>
                                                Pending Your Confirmation
                                            </h6>
                                            <span style={{
                                                                                marginLeft: "8px",
                                                                                background: "rgba(255, 193, 7, 0.2)",
                                                                                color: "#ffc107",
                                                                                padding: "2px 8px",
                                                                                borderRadius: "10px",
                                                                                fontSize: "0.75rem",
                                                                                fontWeight: "600"
                                                                            }}>
                                                {pendingReceived.length}
                                            </span>
                                        </div>
                                        <PaymentHistory
                                            payments={pendingReceived}
                                            currentUserId={store.user?.id}
                                            onConfirmPayment={handleConfirmPayment}
                                            onCancelPayment={handleCancelPayment}
                                            onViewReceipt={handleViewReceipt}
                                            actionPaymentId={actionPaymentId}
                                        />
                                        <div className="mt-4"></div>
                                    </>
                                )}

                                {/* Pending Confirmation (Sent) */}
                                {pendingSent.length > 0 && (
                                    <>
                                        <div className="d-flex align-items-center mb-3">
                                            <h6 className="mb-0" style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
                                                <i className="fas fa-hourglass-half me-2"></i>
                                                Awaiting Confirmation
                                            </h6>
                                            <span style={{
                                                                                marginLeft: "8px",
                                                                                background: "rgba(255,255,255,0.1)",
                                                                                color: "rgba(255,255,255,0.7)",
                                                                                padding: "2px 8px",
                                                                                borderRadius: "10px",
                                                                                fontSize: "0.75rem",
                                                                                fontWeight: "600"
                                                                            }}>
                                                {pendingSent.length}
                                            </span>
                                        </div>
                                        <PaymentHistory
                                            payments={pendingSent}
                                            currentUserId={store.user?.id}
                                            onCancelPayment={handleCancelPayment}
                                            onViewReceipt={handleViewReceipt}
                                            actionPaymentId={actionPaymentId}
                                        />
                                        <div className="mt-4"></div>
                                    </>
                                )}

                                {/* All Payments History */}
                                <div className="d-flex align-items-center mb-3">
                                    <h6 className="mb-0" style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
                                        <i className="fas fa-history me-2"></i>
                                        All Payments
                                    </h6>
                                </div>
                                <PaymentHistory
                                    payments={allPayments}
                                    currentUserId={store.user?.id}
                                    onConfirmPayment={handleConfirmPayment}
                                    onCancelPayment={handleCancelPayment}
                                    onViewReceipt={handleViewReceipt}
                                    actionPaymentId={actionPaymentId}
                                    readOnlyMode={true}
                                />
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Payment Form Modal */}
            {showPaymentForm && selectedDebt && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.8)",
                        backdropFilter: "blur(8px)",
                        zIndex: 9998,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px"
                    }}
                    onClick={() => {
                        setShowPaymentForm(false);
                        setSelectedDebt(null);
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "480px",
                            maxHeight: "90vh",
                            overflow: "auto"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <PaymentForm
                            groupId={selectedDebt.groups?.[0]?.group_id}
                            groupMembers={[
                                { id: store.user?.id, username: store.user?.username },
                                { id: selectedDebt.friend.id, username: selectedDebt.friend.username }
                            ]}
                            currentUserId={store.user?.id}
                            suggestedAmount={Math.abs(selectedDebt.net_balance)}
                            preSelectedReceiverId={selectedDebt.friend.id}
                            onPaymentCreated={handlePaymentCreated}
                        />
                        <button
                            onClick={() => {
                                setShowPaymentForm(false);
                                setSelectedDebt(null);
                            }}
                            style={{
                                width: "100%",
                                padding: "14px",
                                marginTop: "12px",
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.2)",
                                background: "rgba(255,255,255,0.05)",
                                color: "#fff",
                                fontSize: "0.95rem",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Receipt Viewer Lightbox */}
            <ReceiptViewerLightbox
                isOpen={lightboxData.isOpen}
                onClose={() => setLightboxData({ ...lightboxData, isOpen: false })}
                fileUrl={lightboxData.fileUrl}
            />
        </div>
    );
};

export default DebtsPage;
