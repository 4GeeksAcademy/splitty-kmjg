import React from "react";
import PropTypes from "prop-types";
import FadeContent from "./bits/FadeContent.jsx";

const PaymentHistory = ({ 
    payments = [], 
    currentUserId, 
    onConfirmPayment = null, 
    onCancelPayment = null, 
    onViewReceipt = null, 
    readOnlyMode = false, 
    actionPaymentId = null 
}) => {
    if (!payments || payments.length === 0) {
        return (
            <div className="text-center py-5 stat-card" style={{ borderRadius: "18px" }}>
                <i className="fas fa-receipt mb-3" style={{ 
                    fontSize: "3rem", 
                    color: "rgba(255, 255, 255, 0.2)" 
                }}></i>
                <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "1.1rem" }}>
                    No payments yet
                </p>
            </div>
        );
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <FadeContent duration={400}>
            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px"
            }}>
                {payments.map((payment) => {
                    const isPayer = payment.payer_id === currentUserId;
                    const isReceiver = payment.receiver_id === currentUserId;
                    const isPending = payment.status === 'pending';
                    const isConfirmed = payment.status === 'confirmed';

                    const itemBgColor = isConfirmed 
                        ? "rgba(74, 222, 128, 0.05)" 
                        : (readOnlyMode ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 193, 7, 0.05)");
                    
                    const itemBorderColor = isConfirmed
                        ? "1px solid rgba(74, 222, 128, 0.15)"
                        : (readOnlyMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 193, 7, 0.15)");
                    
                    const iconBg = isConfirmed
                        ? "linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(74, 222, 128, 0.05))"
                        : (readOnlyMode ? "linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))" : "linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 193, 7, 0.05))");
                        
                    const iconColor = isConfirmed ? "#4ade80" : (readOnlyMode ? "rgba(255,255,255,0.7)" : "#ffc107");

                    const badgeBg = isConfirmed
                        ? "rgba(74, 222, 128, 0.15)"
                        : (readOnlyMode ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 193, 7, 0.15)");
                    
                    const badgeColor = isConfirmed ? "#4ade80" : (readOnlyMode ? "rgba(255,255,255,0.7)" : "#ffc107");

                    return (
                        <div
                            key={payment.id}
                            style={{
                                background: itemBgColor,
                                backdropFilter: "blur(10px)",
                                borderRadius: "14px",
                                border: itemBorderColor,
                                padding: "16px 20px",
                                transition: "all 0.2s ease",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: "16px",
                                flexWrap: "wrap"
                            }}
                        >
                            {/* Icon */}
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                background: iconBg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <i
                                    className={isConfirmed ? "fas fa-check" : "fas fa-clock"}
                                    style={{
                                        color: iconColor,
                                        fontSize: "0.9rem"
                                    }}
                                ></i>
                            </div>

                            {/* Payment Info */}
                            <div style={{ flex: "1 1 200px", minWidth: "0" }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                    marginBottom: "4px"
                                }}>
                                    <span style={{ color: "#fff", fontWeight: "600" }}>
                                        ${payment.amount.toFixed(2)}
                                    </span>
                                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>
                                        {isPayer ? "paid to" : "received from"}
                                    </span>
                                    <span style={{ color: "#fff", fontWeight: "500", fontSize: "0.9rem" }}>
                                        {isPayer ? payment.receiver?.username : payment.payer?.username}
                                    </span>
                                </div>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    fontSize: "0.75rem",
                                    color: "rgba(255,255,255,0.4)",
                                    flexWrap: "wrap"
                                }}>
                                    <span>
                                        <i className="far fa-calendar me-1"></i>
                                        {formatDate(payment.created_at)}
                                    </span>
                                    <span>
                                        <i className="far fa-clock me-1"></i>
                                        {formatTime(payment.created_at)}
                                    </span>
                                    {payment.group?.name && (
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }}>
                                            <i className="fas fa-folder-open me-1"></i>
                                            {payment.group.name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Status & Actions Wrap */}
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginLeft: "auto",
                                flexWrap: "wrap",
                                justifyContent: "flex-end"
                            }}>
                                {/* Status Badge */}
                                <span style={{
                                    padding: "6px 12px",
                                    borderRadius: "20px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                    background: badgeBg,
                                    color: badgeColor
                                }}>
                                    {isConfirmed ? "Confirmed" : "Pending"}
                                </span>

                                {/* View Receipt */}
                                {payment.receipt_url && (
                                    <button
                                        onClick={() => onViewReceipt ? onViewReceipt(payment.receipt_url) : window.open(payment.receipt_url, '_blank')}
                                        className="btn-stable-layout"
                                        style={{
                                            padding: "10px 18px",
                                            borderRadius: "12px",
                                            border: "1px solid rgba(255, 255, 255, 0.15)",
                                            background: "rgba(255, 255, 255, 0.06)",
                                            color: "#fff",
                                            fontSize: "0.85rem",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            boxShadow: "inset 0 0 15px rgba(255, 255, 255, 0.02)"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                                            e.currentTarget.style.transform = "translateY(-1px)";
                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                                            e.currentTarget.style.transform = "translateY(0)";
                                            e.currentTarget.style.boxShadow = "inset 0 0 15px rgba(255, 255, 255, 0.02)";
                                        }}
                                    >
                                        <i className="fas fa-file-invoice" style={{ opacity: 0.8 }}></i>
                                        Proof
                                    </button>
                                )}

                                {/* Action Buttons Container */}
                                <div className="d-flex align-items-center gap-2">
                                    {isPending && isReceiver && onConfirmPayment && (
                                        <button
                                            onClick={() => onConfirmPayment(payment.id)}
                                            disabled={actionPaymentId === payment.id}
                                            className={`btn-stable-layout ${actionPaymentId === payment.id ? "splitty-btn-loading" : ""}`}
                                            style={{
                                                padding: "10px 20px",
                                                borderRadius: "12px",
                                                border: "none",
                                                background: "linear-gradient(135deg, #4ade80, #22c55e)",
                                                color: "#fff",
                                                fontSize: "0.85rem",
                                                fontWeight: "700",
                                                cursor: actionPaymentId === payment.id ? "default" : "pointer",
                                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                boxShadow: actionPaymentId === payment.id ? "none" : "0 4px 15px rgba(34, 197, 94, 0.3)",
                                                opacity: actionPaymentId === payment.id ? 0.7 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (actionPaymentId !== payment.id) {
                                                    e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                                                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(34, 197, 94, 0.4)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (actionPaymentId !== payment.id) {
                                                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                                                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(34, 197, 94, 0.3)";
                                                }
                                            }}
                                        >
                                            <i className="fas fa-check-circle"></i>
                                            {actionPaymentId === payment.id ? "Processing..." : "Confirm"}
                                        </button>
                                    )}

                                    {isPending && (isPayer || isReceiver) && onCancelPayment && (
                                        <button
                                            onClick={() => onCancelPayment(payment.id)}
                                            disabled={actionPaymentId === payment.id}
                                            className={`btn-stable-layout ${actionPaymentId === payment.id ? "splitty-btn-loading" : ""}`}
                                            style={{
                                                padding: "10px 20px",
                                                borderRadius: "12px",
                                                border: "1px solid rgba(248, 113, 113, 0.3)",
                                                background: "rgba(248, 113, 113, 0.08)",
                                                color: "#f87171",
                                                fontSize: "0.85rem",
                                                fontWeight: "600",
                                                cursor: actionPaymentId === payment.id ? "default" : "pointer",
                                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                boxShadow: "inset 0 0 12px rgba(248, 113, 113, 0.05)",
                                                opacity: actionPaymentId === payment.id ? 0.7 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (actionPaymentId !== payment.id) {
                                                    e.currentTarget.style.background = "rgba(248, 113, 113, 0.15)";
                                                    e.currentTarget.style.border = "1px solid rgba(248, 113, 113, 0.5)";
                                                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(248, 113, 113, 0.2)";
                                                    e.currentTarget.style.transform = "translateY(-1px)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (actionPaymentId !== payment.id) {
                                                    e.currentTarget.style.background = "rgba(248, 113, 113, 0.08)";
                                                    e.currentTarget.style.border = "1px solid rgba(248, 113, 113, 0.3)";
                                                    e.currentTarget.style.boxShadow = "inset 0 0 12px rgba(248, 113, 113, 0.05)";
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                }
                                            }}
                                        >
                                            <i className="fas fa-times-circle"></i>
                                            {actionPaymentId === payment.id ? (isPayer ? "Stopping..." : "Declining...") : (isPayer ? "Cancel" : "Reject")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </FadeContent>
    );
};

PaymentHistory.propTypes = {
    payments: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        payer_id: PropTypes.number.isRequired,
        receiver_id: PropTypes.number.isRequired,
        amount: PropTypes.number.isRequired,
        status: PropTypes.string.isRequired,
        created_at: PropTypes.string.isRequired,
        payer: PropTypes.shape({
            username: PropTypes.string
        }),
        receiver: PropTypes.shape({
            username: PropTypes.string
        }),
        group: PropTypes.shape({
            name: PropTypes.string
        })
    })),
    currentUserId: PropTypes.number.isRequired,
    onConfirmPayment: PropTypes.func,
    onCancelPayment: PropTypes.func,
    onViewReceipt: PropTypes.func,
    readOnlyMode: PropTypes.bool,
    actionPaymentId: PropTypes.number
};

export default PaymentHistory;
