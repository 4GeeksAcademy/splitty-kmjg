import React, { useState } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import PropTypes from "prop-types";
import FadeContent from "./bits/FadeContent.jsx";

const PaymentForm = ({ groupId, groupMembers, onPaymentCreated, currentUserId, suggestedAmount = null, preSelectedReceiverId = null }) => {
    const [receiverId, setReceiverId] = useState(preSelectedReceiverId || "");
    const [amount, setAmount] = useState(suggestedAmount || "");
    const [receiptFile, setReceiptFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("manual"); // manual | paypal

    // Filter available members (exclude current user)
    const availableMembers = groupMembers.filter(member => member.id !== currentUserId);

    // Handle receipt file changes and preview
    React.useEffect(() => {
        if (!receiptFile) {
            setPreviewUrl(null);
            return;
        }

        // Only show preview for images
        if (!receiptFile.type.startsWith('image/')) {
            setPreviewUrl(null); // Or some generic file icon symbol
            return;
        }

        const objectUrl = URL.createObjectURL(receiptFile);
        setPreviewUrl(objectUrl);

        // Clean up memory
        return () => URL.revokeObjectURL(objectUrl);
    }, [receiptFile]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReceiptFile(file);
        }
    };

    const removeFile = () => {
        setReceiptFile(null);
        setPreviewUrl(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Validaciones
        if (!receiverId) {
            setError("Please select a receiver");
            return;
        }

        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            setError("Amount must be greater than 0");
            return;
        }

        if (parseInt(receiverId) === currentUserId) {
            setError("You cannot pay yourself");
            return;
        }

        setLoading(true);

        try {
            let submitData;
            if (receiptFile) {
                // Si hay archivo, enviamos FormData
                submitData = new FormData();
                submitData.append("receiver_id", receiverId);
                submitData.append("amount", amountValue);
                submitData.append("receipt", receiptFile);
            } else {
                // Si no, mandamos el JSON plano
                submitData = {
                    receiver_id: parseInt(receiverId),
                    amount: amountValue
                };
            }

            const result = await onPaymentCreated(groupId, submitData);

            if (result.success) {
                setSuccess(true);
                setAmount("");
                setReceiverId("");
                setReceiptFile(null);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                setError(result.error || "Failed to create payment");
            }
        } catch (err) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleAmountChange = (e) => {
        const value = e.target.value;
        // Permitir solo números y punto decimal
        if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
            setAmount(value);
        }
    };

    return (
        <FadeContent duration={400}>
            <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px)",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "24px",
                marginBottom: "20px"
            }}>
                <h5 style={{
                    color: "var(--color-base-cream, #F5F5DC)",
                    marginBottom: "20px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                }}>
                    <i className="fas fa-money-bill-transfer" style={{ color: "var(--color-base-dark-orange, #FF8C00)" }}></i>
                    Register Payment
                </h5>

                {error && (
                    <div style={{
                        background: "rgba(248, 113, 113, 0.15)",
                        border: "1px solid rgba(248, 113, 113, 0.3)",
                        borderRadius: "10px",
                        padding: "12px 16px",
                        marginBottom: "16px",
                        color: "#f87171",
                        fontSize: "0.9rem"
                    }}>
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        background: "rgba(74, 222, 128, 0.15)",
                        border: "1px solid rgba(74, 222, 128, 0.3)",
                        borderRadius: "10px",
                        padding: "12px 16px",
                        marginBottom: "16px",
                        color: "#4ade80",
                        fontSize: "0.9rem"
                    }}>
                        <i className="fas fa-check-circle me-2"></i>
                        Payment registered successfully! Waiting for confirmation.
                    </div>
                )}

                {/* Payment Method Tabs */}
                <div style={{
                    display: "flex",
                    gap: "4px",
                    marginBottom: "28px",
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "6px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)"
                }}>
                    <button
                        onClick={() => setPaymentMethod("manual")}
                        style={{
                            flex: 1,
                            padding: "12px",
                            borderRadius: "10px",
                            border: "none",
                            background: paymentMethod === "manual" ? "rgba(255, 140, 0, 0.15)" : "transparent",
                            color: paymentMethod === "manual" ? "#fff" : "rgba(255,255,255,0.4)",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: paymentMethod === "manual" ? "0 4px 12px rgba(255, 140, 0, 0.1)" : "none"
                        }}
                    >
                        <i className="fas fa-hand-holding-dollar" style={{ 
                            color: paymentMethod === "manual" ? "var(--color-base-dark-orange)" : "inherit",
                            fontSize: "1rem"
                        }}></i>
                        Manual
                    </button>
                    <button
                        onClick={() => setPaymentMethod("paypal")}
                        style={{
                            flex: 1,
                            padding: "12px",
                            borderRadius: "10px",
                            border: "none",
                            background: paymentMethod === "paypal" ? "rgba(0, 112, 186, 0.15)" : "transparent",
                            color: paymentMethod === "paypal" ? "#fff" : "rgba(255,255,255,0.4)",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: paymentMethod === "paypal" ? "0 4px 12px rgba(0, 112, 186, 0.1)" : "none"
                        }}
                    >
                        <i className="fab fa-paypal" style={{ 
                            color: paymentMethod === "paypal" ? "#0070ba" : "inherit",
                            fontSize: "1rem"
                        }}></i>
                        PayPal
                    </button>
                </div>

                {paymentMethod === "manual" ? (
                    <form onSubmit={handleSubmit}>
                    {/* Receiver Select */}
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{
                            display: "block",
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "8px",
                            fontWeight: "500"
                        }}>
                            Pay To
                        </label>
                        <select
                            value={receiverId}
                            onChange={(e) => setReceiverId(e.target.value)}
                            disabled={loading || availableMembers.length === 0 || preSelectedReceiverId}
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                borderRadius: "12px",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                background: "rgba(255, 255, 255, 0.05)",
                                color: receiverId ? "#fff" : "rgba(255,255,255,0.5)",
                                fontSize: "0.95rem",
                                outline: "none",
                                cursor: preSelectedReceiverId ? "not-allowed" : "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <option value="">
                                {availableMembers.length === 0
                                    ? "No available members"
                                    : "Select who you're paying..."}
                            </option>
                            {availableMembers.map(member => (
                                <option
                                    key={member.id}
                                    value={member.id}
                                    style={{ background: "#1e1e1e", color: "#fff" }}
                                >
                                    {member.username}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount Input */}
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{
                            display: "block",
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "8px",
                            fontWeight: "500"
                        }}>
                            Amount ($)
                        </label>
                        <div style={{ position: "relative" }}>
                            <span style={{
                                position: "absolute",
                                left: "16px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--color-base-dark-orange, #FF8C00)",
                                fontWeight: "600",
                                fontSize: "1rem"
                            }}>
                                $
                            </span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={handleAmountChange}
                                placeholder="0.00"
                                disabled={loading}
                                style={{
                                    width: "100%",
                                    padding: "12px 16px 12px 32px",
                                    borderRadius: "12px",
                                    border: "1px solid rgba(255, 255, 255, 0.15)",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    color: "#fff",
                                    fontSize: "1rem",
                                    outline: "none",
                                    transition: "all 0.2s ease"
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = "var(--color-base-dark-orange, #FF8C00)";
                                    e.target.style.background = "rgba(255, 255, 255, 0.08)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = "rgba(255, 255, 255, 0.15)";
                                    e.target.style.background = "rgba(255, 255, 255, 0.05)";
                                }}
                            />
                        </div>
                    </div>

                    {/* Receipt Upload (Optional) */}
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{
                            display: "block",
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "8px",
                            fontWeight: "500"
                        }}>
                            Receipt / Proof (Optional)
                        </label>
                        
                        {!receiptFile ? (
                            <div 
                                onClick={() => document.getElementById('receipt-upload').click()}
                                style={{
                                    border: "1px dashed rgba(255, 255, 255, 0.2)",
                                    borderRadius: "12px",
                                    padding: "20px",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    background: "rgba(255, 255, 255, 0.02)",
                                    transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                    e.currentTarget.style.borderColor = "var(--color-base-dark-orange, #FF8C00)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                                }}
                            >
                                <i className="fas fa-cloud-upload-alt mb-2" style={{ fontSize: "1.5rem", color: "rgba(255,255,255,0.3)" }}></i>
                                <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
                                    Click to upload receipt
                                </p>
                                <input
                                    id="receipt-upload"
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    style={{ display: "none" }}
                                />
                            </div>
                        ) : (
                            <div style={{
                                position: "relative",
                                borderRadius: "12px",
                                overflow: "hidden",
                                border: "1px solid rgba(255,255,255,0.2)",
                                background: "rgba(0,0,0,0.2)"
                            }}>
                                {previewUrl ? (
                                    <img 
                                        src={previewUrl} 
                                        alt="Receipt Preview" 
                                        style={{ width: "100%", maxHeight: "200px", objectFit: "cover", display: "block" }}
                                    />
                                ) : (
                                    <div style={{ padding: "20px", textAlign: "center" }}>
                                        <i className="fas fa-file-pdf mb-2" style={{ fontSize: "2rem", color: "#f87171" }}></i>
                                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#fff" }}>{receiptFile.name}</p>
                                    </div>
                                )}
                                
                                <button
                                    type="button"
                                    onClick={removeFile}
                                    style={{
                                        position: "absolute",
                                        top: "8px",
                                        right: "8px",
                                        width: "28px",
                                        height: "28px",
                                        borderRadius: "50%",
                                        background: "rgba(0,0,0,0.6)",
                                        border: "1px solid rgba(255,255,255,0.3)",
                                        color: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        zIndex: 2,
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(220, 38, 38, 0.8)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.6)"}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !receiverId || !amount}
                        style={{
                            width: "100%",
                            height: "50px",
                            padding: "0 24px",
                            borderRadius: "12px",
                            border: "none",
                            background: loading
                                ? "rgba(255, 140, 0, 0.5)"
                                : "linear-gradient(135deg, var(--color-base-dark-orange, #FF8C00), var(--color-base-coral, #FF7F50))",
                            color: "#fff",
                            fontSize: "1rem",
                            fontWeight: "600",
                            cursor: loading || !receiverId || !amount ? "not-allowed" : "pointer",
                            opacity: loading || !receiverId || !amount ? 0.7 : 1,
                            transition: "all 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px"
                        }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Processing...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check"></i>
                                Mark as Paid
                            </>
                        )}
                    </button>
                </form>
                ) : (
                    <>
                        <div style={{
                            marginBottom: "24px",
                            padding: "20px",
                            borderRadius: "16px",
                            background: "linear-gradient(135deg, rgba(255, 140, 0, 0.05) 0%, rgba(255, 127, 80, 0.05) 100%)",
                            border: "1px solid rgba(255, 140, 0, 0.15)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "10px",
                                    background: "rgba(255, 140, 0, 0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--color-base-dark-orange)"
                                }}>
                                    <i className="fas fa-receipt" style={{ fontSize: "1.2rem" }}></i>
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>
                                        Total Amount
                                    </p>
                                    <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#fff" }}>
                                        ${amount || suggestedAmount || "0.00"}
                                    </p>
                                </div>
                            </div>
                            
                            <div style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "8px", 
                                fontSize: "0.85rem", 
                                color: "rgba(255,255,255,0.7)",
                                padding: "8px 12px",
                                background: "rgba(255,255,255,0.03)",
                                borderRadius: "8px"
                            }}>
                                <i className="fas fa-user-circle" style={{ color: "rgba(255,255,255,0.3)" }}></i>
                                Paying to <strong style={{ color: "#fff" }}>{availableMembers.find(m => m.id == receiverId)?.username || "selected friend"}</strong>
                            </div>
                        </div>
                        
                        <div style={{ position: "relative", colorScheme: "light" }}>
                            <PayPalButtons
                                style={{ 
                                    layout: "vertical", 
                                    shape: "rect", 
                                    label: "pay",
                                    color: "gold",
                                    height: 48 
                                }}
                                disabled={!receiverId || !amount}
                                createOrder={(data, actions) => {
                                    return actions.order.create({
                                        purchase_units: [
                                            {
                                                amount: {
                                                    currency_code: "USD",
                                                    value: amount,
                                                },
                                                description: `Payment to ${availableMembers.find(m => m.id == receiverId)?.username || "User"} via Splitty`,
                                            },
                                        ],
                                    });
                                }}
                                onApprove={async (data, actions) => {
                                    const order = await actions.order.capture();
                                    console.log("PayPal Order Approved:", order);
                                    
                                    const submitData = {
                                        receiver_id: parseInt(receiverId),
                                        amount: parseFloat(amount),
                                        payment_method: "paypal",
                                        paypal_order_id: order.id
                                    };
                                    
                                    const result = await onPaymentCreated(groupId, submitData);
                                    if (result.success) {
                                        setSuccess(true);
                                        // Limpiar despues de éxito
                                        setTimeout(() => setSuccess(false), 3000);
                                    } else {
                                        setError(result.error || "Failed to sync PayPal payment to server");
                                    }
                                }}
                                onError={(err) => {
                                    console.error("PayPal Error:", err);
                                    setError("PayPal transaction failed. Please try again.");
                                }}
                            />
                            
                            <div style={{ 
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                marginTop: "20px",
                                padding: "10px",
                                borderTop: "1px solid rgba(255,255,255,0.05)"
                            }}>
                                <i className="fas fa-shield-halved" style={{ color: "#4ade80", fontSize: "0.8rem" }}></i>
                                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                                    Secure SSL Encrypted Payment
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </FadeContent>
    );
};

PaymentForm.propTypes = {
    groupId: PropTypes.number.isRequired,
    groupMembers: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        username: PropTypes.string.isRequired
    })).isRequired,
    onPaymentCreated: PropTypes.func.isRequired,
    currentUserId: PropTypes.number.isRequired,
    suggestedAmount: PropTypes.number,
    preSelectedReceiverId: PropTypes.number
};

export default PaymentForm;
