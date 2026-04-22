import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import CustomSelect from "./CustomSelect";
import InviteModal from "./InviteModal";
import ReceiptUploader from "./ReceiptUploader";
import ReceiptViewerLightbox from "./ReceiptViewerLightbox";

export const AddExpenseForm = ({ groupId, groupMembers, onSuccess, onCancel, expenseToEdit }) => {
    const { store, actions } = useGlobalReducer();
    const isEditing = !!expenseToEdit;
    
    // Internal state
    // Internal state - vercel-react-best-practices: Lazy state initialization (rerender-lazy-state-init)
    const [description, setDescription] = useState(() => expenseToEdit?.expense?.description || "");
    const [totalAmount, setTotalAmount] = useState(() => expenseToEdit?.expense?.amount || "");
    const [currency, setCurrency] = useState(() => expenseToEdit?.expense?.currency || "$"); 
    const [paidBy, setPaidBy] = useState(() => expenseToEdit?.expense?.paid_by?.toString() || "");
    const [splitMode, setSplitMode] = useState("equal");
    const [splits, setSplits] = useState({});
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showInviteModal, setShowInviteModal] = useState(false);

    const [selectedMembers, setSelectedMembers] = useState([]);
    
    // Receipt upload state
    const [receiptFile, setReceiptFile] = useState(null);
    const [lightboxData, setLightboxData] = useState({ isOpen: false, url: null, type: null });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [ocrData, setOcrData] = useState(null);
    const [itemAssignments, setItemAssignments] = useState({});
    const [aiAnalysisStatus, setAiAnalysisStatus] = useState("idle"); // idle, analyzing, success, failed

    // Pre-populate participants and splits if editing
    useEffect(() => {
        if (isEditing && expenseToEdit.participants) {
            const pIds = expenseToEdit.participants.map(p => p.user_id);
            setSelectedMembers(pIds);
            
            const newSplits = {};
            expenseToEdit.participants.forEach(p => {
                newSplits[p.user_id] = p.amount_owed;
            });
            setSplits(newSplits);
            
            // Try to guess if it was exact or percentage (simplified: default to exact if not equal)
            const amount = parseFloat(expenseToEdit.expense.amount);
            const isEqual = expenseToEdit.participants.every(p => Math.abs(p.amount_owed - (amount / pIds.length)) < 0.05);
            if (!isEqual) setSplitMode("exact");
        }
    }, [expenseToEdit]);

    // Fetch friends if not available
    useEffect(() => {
        if (!store.friends) {
            actions.getFriends();
        }
    }, [store.friends, actions]);

    // Merge group members and user friends, deduplicating by ID
    const allParticipants = React.useMemo(() => {
        const pMap = new Map();
        groupMembers.forEach(m => pMap.set(m.id, m));
        if (store.friends?.length > 0) {
            store.friends.forEach(f => {
                if (f.friend && !pMap.has(f.friend.id)) {
                    pMap.set(f.friend.id, f.friend);
                }
            });
        }
        return Array.from(pMap.values());
    }, [groupMembers, store.friends]);

    // Initialize paidBy for NEW expense (members start unchecked based on user request)
    useEffect(() => {
        if (!isEditing && allParticipants.length > 0) {
            if (!paidBy && store.user?.username) {
                const currentUserMember = allParticipants.find(m => m.username === store.user.username || m.email === store.user.email);
                setPaidBy(currentUserMember ? currentUserMember.id.toString() : allParticipants[0].id.toString());
            } else if (!paidBy) {
                setPaidBy(allParticipants[0].id.toString());
            }
            // Start unchecked (sin marcar) for manual selection
        }
    }, [allParticipants, store.user?.username, isEditing]);

    // Handle OCR Analyzing
    useEffect(() => {
        const processReceipt = async () => {
            if (receiptFile?.file && !isEditing && !ocrData) {
                setIsAnalyzing(true);
                const resp = await actions.analyzeReceipt(receiptFile.file);
                setIsAnalyzing(false);
                if (resp.success && resp.data) {
                    setOcrData(resp.data);
                    setAiAnalysisStatus("success");
                    if (resp.data.total && !totalAmount) {
                        setTotalAmount(resp.data.total.toString());
                    }
                    if (resp.data.merchant_name && !description) {
                        setDescription(resp.data.merchant_name + " Receipt");
                    }
                } else {
                    console.log("Error analyzing receipt:", resp.error);
                    setAiAnalysisStatus("failed");
                    setError(resp.error || "AI Analysis failed. Please enter details manually.");
                }
            }
        };
        processReceipt();
    }, [receiptFile]);

    // Auto-update exact splits when OCR item assignments change
    useEffect(() => {
        if (ocrData?.items?.length > 0) {
            setSplitMode("exact");
            const newSplits = {};
            
            ocrData.items.forEach(item => {
                const uid = itemAssignments[item.id];
                if (uid) {
                    newSplits[uid] = (newSplits[uid] || 0) + item.final_price;
                }
            });
            
            // Format sums
            Object.keys(newSplits).forEach(k => {
                newSplits[k] = newSplits[k].toFixed(2);
            });
            
            setSplits(newSplits);

            // Always sync totalAmount to the real sum of ALL ocr items
            // so the validation never sees a mismatch between assigned and total
            const ocrTotal = ocrData.items.reduce((acc, item) => acc + (item.final_price || 0), 0);
            setTotalAmount(ocrTotal.toFixed(2));
        }
    }, [itemAssignments, ocrData]);

    // vercel-react-best-practices: Memoize derived data
    const selectedGroupMembers = React.useMemo(() => allParticipants.filter(m => selectedMembers.includes(m.id)), [allParticipants, selectedMembers]);

    const handleMemberToggle = (id) => {
        setSelectedMembers(prev => 
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    // Calculate dynamic valid state
    const amountVal = parseFloat(totalAmount) || 0;
    let isValid = false;
    let currentSum = 0;
    let diffMsg = "";

    // Granular validation messages
    if (description.trim() === "") {
        diffMsg = "Please enter a description.";
    } else if (amountVal <= 0) {
        diffMsg = "Please enter a total amount.";
    } else if (selectedGroupMembers.length === 0) {
        diffMsg = "Please select at least one participant.";
    } else {
        // Basic fields are OK, now check split distribution
        if (splitMode === "equal") {
            isValid = true;
        } else if (splitMode === "exact") {
            currentSum = Object.values(splits).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            if (Math.abs(currentSum - amountVal) < 0.05) {
                isValid = true;
            } else {
                if (ocrData?.items?.length > 0 && currentSum === 0) {
                    diffMsg = "✨ Tap the items below to assign them to participants!";
                } else {
                    diffMsg = `Assigned: ${currency}${currentSum.toFixed(2)} / Left: ${currency}${(amountVal - currentSum).toFixed(2)}`;
                }
            }
        } else if (splitMode === "percentage") {
            currentSum = Object.values(splits).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            if (Math.abs(currentSum - 100) < 0.05) {
                isValid = true;
            } else {
                diffMsg = `Current sum: ${currentSum.toFixed(1)}% (Left: ${(100 - currentSum).toFixed(1)}%)`;
            }
        }
    }

    const handleSplitChange = (userId, value) => {
        setSplits(prev => ({
            ...prev,
            [userId]: value
        }));
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this expense?")) return;
        setLoading(true);
        const resp = await actions.deleteExpense(expenseToEdit.expense.id);
        if (resp.success) {
            onSuccess();
        } else {
            setError(resp.error || "Error deleting expense");
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid) return;

        setLoading(true);
        setError("");

        let participantsData = [];
        
        if (splitMode === "equal") {
            const splitAmount = amountVal / selectedGroupMembers.length;
            selectedGroupMembers.forEach(m => {
                participantsData.push({
                    user_id: m.id,
                    amount_owed: splitAmount
                });
            });
        } else if (splitMode === "exact") {
            // Filter splits to only included members
            selectedMembers.forEach(uid => {
                participantsData.push({
                    user_id: uid,
                    amount_owed: parseFloat(splits[uid]) || 0
                });
            });
        } else if (splitMode === "percentage") {
            selectedMembers.forEach(uid => {
                const perc = parseFloat(splits[uid]) || 0;
                participantsData.push({
                    user_id: uid,
                    amount_owed: (perc / 100) * amountVal
                });
            });
        }

        const expenseData = {
            description,
            amount: amountVal,
            currency: currency, 
            paid_by: parseInt(paidBy),
            participants: participantsData
        };

        const resp = isEditing 
            ? await actions.updateExpense(expenseToEdit.expense.id, expenseData)
            : await actions.addExpense(groupId, expenseData);

        if (resp.success) {
            if (receiptFile?.file) {
                const expenseId = isEditing ? expenseToEdit.expense.id : resp.data?.expense?.id;
                if (expenseId) {
                    const uploadResp = await actions.uploadReceipt(expenseId, receiptFile.file);
                    if (!uploadResp.success) {
                        setError(uploadResp.error || "Expense saved, but receipt upload failed");
                        setLoading(false);
                        return;
                    }
                }
            }
            onSuccess();
        } else {
            setError(resp.error || "Error saving expense");
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="w-100 form-skeleton-pulse" style={{ maxWidth: "100%" }}>
            <style>
                {`
                @keyframes pulse-dark {
                    0% { background-color: rgba(255, 255, 255, 0.02); }
                    50% { background-color: rgba(255, 255, 255, 0.08); }
                    100% { background-color: rgba(255, 255, 255, 0.02); }
                }
                @keyframes pulse-orange {
                    0% { background-color: rgba(252, 164, 52, 0.1); }
                    50% { background-color: rgba(252, 164, 52, 0.25); }
                    100% { background-color: rgba(252, 164, 52, 0.1); }
                }
                @keyframes scan-line {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .skel-block {
                    animation: pulse-dark 1.5s infinite ease-in-out;
                }
                .skel-orange {
                    animation: pulse-orange 1.5s infinite ease-in-out;
                }
                .ai-scan-line {
                    position: absolute;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, var(--color-base-orange), transparent);
                    box-shadow: 0 0 15px var(--color-base-orange);
                    animation: scan-line 2s infinite linear;
                    z-index: 5;
                }
                .ai-glow-pulse {
                    box-shadow: 0 0 30px rgba(252, 164, 52, 0.2);
                    animation: pulse-orange 2s infinite ease-in-out;
                }
                `}
            </style>

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2">
                <div className="skel-block" style={{ width: "200px", height: "36px", borderRadius: "8px" }}></div>
                <div className="skel-block" style={{ width: "36px", height: "36px", borderRadius: "50%" }}></div>
            </div>

            {/* Description */}
            <div className="mb-2">
                <div className="skel-block mb-2" style={{ width: "100px", height: "16px", borderRadius: "4px" }}></div>
                <div className="skel-block w-100" style={{ height: "54px", borderRadius: "16px" }}></div>
            </div>

            {/* Amount & Paid By */}
            <div className="row mb-4 g-3">
                <div className="col-12 col-md-6">
                    <div className="skel-block mb-2" style={{ width: "120px", height: "16px", borderRadius: "4px" }}></div>
                    <div className="skel-block w-100" style={{ height: "54px", borderRadius: "16px" }}></div>
                </div>
                <div className="col-12 col-md-6">
                    <div className="skel-block mb-2" style={{ width: "80px", height: "16px", borderRadius: "4px" }}></div>
                    <div className="skel-block w-100" style={{ height: "54px", borderRadius: "16px" }}></div>
                </div>
            </div>

            {/* Participants */}
            <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="skel-block" style={{ width: "100px", height: "16px", borderRadius: "4px" }}></div>
                    <div className="skel-block" style={{ width: "90px", height: "28px", borderRadius: "10px" }}></div>
                </div>
                <div className="d-flex flex-wrap gap-2 p-3" style={{ background: "rgba(0,0,0,0.2)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.03)" }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skel-block" style={{ width: i % 2 === 0 ? "80px" : "110px", height: "36px", borderRadius: "99px" }}></div>
                    ))}
                </div>
            </div>

            {/* How to split */}
            <div className="mb-4">
                <div className="skel-block mb-2" style={{ width: "120px", height: "16px", borderRadius: "4px" }}></div>
                <div className="skel-block w-100" style={{ height: "46px", borderRadius: "99px" }}></div>
            </div>

            {/* Receipt Uploader Skeleton */}
            <div className="mb-4">
                <div className="skel-block w-100 rounded-4" style={{ height: "120px", border: "1px dashed rgba(255,255,255,0.05)" }}></div>
            </div>

            {/* Button */}
            <div className="skel-orange w-100 mt-4" style={{ height: "56px", borderRadius: "16px" }}></div>
        </div>
    );

    const handleItemAssignment = (itemId, userId) => {
        setItemAssignments(prev => {
            const next = {...prev};
            if (next[itemId] === userId) {
                delete next[itemId]; // toggle off if same clicked
            } else {
                next[itemId] = userId;
            }
            return next;
        });

        // Ensure user is selected as a participant if they get an item
        if (userId && !selectedMembers.includes(userId)) {
            handleMemberToggle(userId);
        }
    };

    return (
        <div className="w-100" style={{ maxWidth: "100%" }}>
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2">
                {/* Fix #6: gradient text always applied */}
                <h3 className="fw-bold mb-0 splitty-gradient-text" style={{ fontSize: "1.9rem" }}>
                    {isEditing ? "Edit Expense" : "Add Expense"}
                </h3>
                {isEditing ? (
                    <div className="d-flex gap-2 align-items-center">
                        <button
                            type="button"
                            onClick={handleDelete}
                            title="Delete Expense"
                            style={{
                                background: "rgba(147, 0, 10, 0.15)",
                                border: "1px solid rgba(147, 0, 10, 0.3)",
                                borderRadius: "10px",
                                padding: "8px 12px",
                                color: "var(--color-base-cream)",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                boxShadow: "none"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = "linear-gradient(135deg, #93000a, #690005)";
                                e.currentTarget.style.borderColor = "rgba(147, 0, 10, 0.5)";
                                e.currentTarget.style.boxShadow = "0 6px 16px rgba(147, 0, 10, 0.4)";
                                e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = "rgba(147, 0, 10, 0.15)";
                                e.currentTarget.style.borderColor = "rgba(147, 0, 10, 0.3)";
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.transform = "translateY(0)";
                            }}
                        >
                            <i className="fa-solid fa-trash-can"></i>
                        </button>
                        {onCancel && (
                            <button 
                                onClick={onCancel} 
                                className="btn text-white p-0 d-flex align-items-center justify-content-center flex-shrink-0 ms-3" 
                                style={{ width: "36px", height: "36px", background: "rgba(255,255,255,0.1)", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)" }}
                            >
                                <i className="fa-solid fa-xmark fs-5"></i>
                            </button>
                        )}
                    </div>
                ) : (
                    onCancel && (
                        <button 
                            onClick={onCancel} 
                            className="btn text-white p-0 d-flex align-items-center justify-content-center flex-shrink-0 ms-3" 
                            style={{ width: "36px", height: "36px", background: "rgba(255,255,255,0.1)", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)" }}
                        >
                            <i className="fa-solid fa-xmark fs-5"></i>
                        </button>
                    )
                )}
            </div>
            
            {error ? <div className="splitty-alert splitty-alert-danger">{error}</div> : null}

            <form onSubmit={handleSubmit}>
                <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                        <label className="splitty-label splitty-gradient-text" style={{ fontWeight: 700 }}>Description</label>
                        {!receiptFile && !description && (
                            <span style={{ fontSize: "0.7rem", color: "var(--color-base-orange)", fontWeight: "600", opacity: 0.8 }}>
                                <i className="fa-solid fa-wand-magic-sparkles me-1"></i> Auto-fill with receipt
                            </span>
                        )}
                    </div>
                    <input
                        type="text"
                        className="splitty-input"
                        placeholder="E.g. Dinner, Uber, Rent..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </div>

                <div className="row mb-4 g-3">
                    <div className="col-12 col-md-6">
                        <label className="splitty-label splitty-gradient-text" style={{ fontWeight: 700 }}>Total Amount</label>
                        <div className="d-flex gap-2">
                            <CustomSelect 
                                style={{ width: "150px", paddingRight: "15px", color: "var(--color-base-dark-orange)", fontWeight: "bold" }}
                                innerClass="text-start"
                                value={currency}
                                onChange={setCurrency}
                                options={[
                                    { value: "$", label: "$ USD" },
                                    { value: "€", label: "€ EUR" },
                                    { value: "VES", label: "VES Bs" },
                                    { value: "£", label: "£ GBP" }
                                ]}
                            />
                            <input
                                type="number"
                                step="0.01"
                                min="0.1"
                                className="splitty-input mb-0 no-spinners flex-grow-1"
                                style={{ color: "#4ade80", fontWeight: "bold", fontSize: "1.1rem" }}
                                placeholder="0.00"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="col-12 col-md-6">
                        <label className="splitty-label splitty-gradient-text" style={{ fontWeight: 700 }}>Paid by</label>
                        <CustomSelect
                            value={paidBy}
                            onChange={setPaidBy}
                            options={allParticipants.map(m => ({ value: m.id.toString(), label: m.username }))}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="splitty-label splitty-gradient-text mb-0" style={{ fontWeight: 700 }}>Participants</label>
                        <button 
                            type="button"
                            className="btn py-1 px-3 border-0 shadow-sm text-nowrap"
                            onClick={() => setShowInviteModal(true)}
                            style={{ 
                                borderRadius: "10px", 
                                background: "rgba(252, 164, 52, 0.15)", 
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                color: "var(--color-base-orange)",
                                border: "1px solid rgba(252, 164, 52, 0.3)"
                            }}
                        >
                            <i className="fa-solid fa-user-plus me-1"></i> Missing?
                        </button>
                    </div>
                    <div className="d-flex flex-wrap gap-2 p-3" style={{ background: "rgba(0,0,0,0.2)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.03)", maxHeight: "200px", overflowY: "auto" }}>
                        {allParticipants.map(m => {
                            const isChecked = selectedMembers.includes(m.id);
                            return (
                                <div key={m.id} 
                                    className="d-flex align-items-center gap-2 px-3 py-2"
                                    onClick={() => handleMemberToggle(m.id)}
                                    style={{ 
                                        cursor: "pointer", 
                                        borderRadius: "99px",
                                        background: isChecked ? "rgba(187, 77, 0, 0.2)" : "transparent",
                                        border: isChecked ? "1px solid var(--color-base-dark-orange)" : "1px solid rgba(255,255,255,0.1)",
                                        transition: "all 0.2s ease"
                                    }}>
                                    
                                    <div style={{
                                        width: "18px", height: "18px", borderRadius: "50%",
                                        background: isChecked ? "var(--splitty-gradient)" : "rgba(255,255,255,0.1)",
                                        display: "flex", alignItems: "center", justifyContent: "center"
                                    }}>
                                        {isChecked && <i className="fa-solid fa-check text-white" style={{fontSize: "10px"}}></i>}
                                    </div>
                                    <span style={{ fontSize: "0.9rem", color: isChecked ? "var(--color-base-cream)" : "#a19b95", fontWeight: isChecked ? "600" : "400" }}>
                                        {m.username}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="splitty-label splitty-gradient-text" style={{ fontWeight: 700 }}>How to split?</label>
                    <div className="d-flex p-1 shadow-sm" style={{ background: "rgba(0,0,0,0.4)", borderRadius: "99px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        {[
                            { id: "equal", label: "Equally" },
                            { id: "exact", label: "Exact Amounts" },
                            { id: "percentage", label: "Percentages" }
                        ].map(tab => {
                            const active = splitMode === tab.id;
                            return (
                                <button 
                                    key={tab.id}
                                    type="button" 
                                    className="btn flex-fill border-0 rounded-pill"
                                    onClick={() => {
                                        if (splitMode !== tab.id) {
                                            setSplitMode(tab.id);
                                            setSplits({}); // Reset splits on mode change
                                            
                                            // Recalculate if returning to exact with OCR items
                                            if (tab.id === "exact" && ocrData?.items?.length > 0) {
                                                const newSplits = {};
                                                ocrData.items.forEach(item => {
                                                    const uid = itemAssignments[item.id];
                                                    if (uid) {
                                                        newSplits[uid] = (newSplits[uid] || 0) + item.final_price;
                                                    }
                                                });
                                                Object.keys(newSplits).forEach(k => {
                                                    newSplits[k] = newSplits[k].toFixed(2);
                                                });
                                                setSplits(newSplits);
                                            }
                                        }
                                    }}
                                    style={{ 
                                        background: active ? "var(--splitty-gradient)" : "transparent",
                                        color: active ? "var(--color-base-light)" : "#a19b95",
                                        fontWeight: active ? "bold" : "500",
                                        fontSize: "clamp(0.7rem, 2.5vw, 0.85rem)",
                                        padding: "10px 4px",
                                        transition: "all 0.3s ease",
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Dynamic Split Area */}
                <div style={{
                    maxHeight: splitMode !== 'equal' ? "500px" : "0",
                    opacity: splitMode !== 'equal' ? 1 : 0,
                    overflow: "hidden",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                }}>
                    <div className="p-4 mb-4" style={{ background: "rgba(0,0,0,0.2)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        <p className="mb-3 splitty-gradient-text" style={{ fontSize: "0.85rem", fontWeight: "700", textTransform: "uppercase" }}>
                            Assign amounts:
                        </p>
                        {selectedGroupMembers.length === 0 ? (
                            <div className="text-center py-4 px-3" style={{ background: "rgba(0,0,0,0.1)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.05)" }}>
                                <i className="fa-solid fa-users-slash mb-2 d-block fs-4" style={{ color: "var(--color-base-orange)", opacity: 0.6 }}></i>
                                <span className="text-secondary small">Select participants above to split the cost</span>
                            </div>
                        ) : (
                            selectedGroupMembers.map(m => (
                                <div key={m.id} className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom" style={{ borderColor: "rgba(255,255,255,0.03) !important" }}>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="rounded-circle text-center d-flex justify-content-center align-items-center fw-bold" 
                                            style={{ width: "32px", height: "32px", background: "rgba(187, 77, 0, 0.2)", color: "var(--color-base-dark-orange)", fontSize: "0.8rem" }}>
                                            {m.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span style={{ fontSize: "0.95rem", color: "var(--color-base-cream)" }}>{m.username}</span>
                                    </div>
                                    
                                    <div className="d-flex align-items-center gap-2" style={{ width: "130px" }}>
                                        {splitMode === 'exact' && <span className="splitty-gradient-text fw-bold">{currency}</span>}
                                        <input
                                            type="number"
                                            min="0"
                                            step={splitMode === 'exact' ? "0.01" : "1"}
                                            className="form-control text-end border-0 no-spinners"
                                            style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-base-cream)", fontWeight: "bold", borderRadius: "8px", padding: "8px 12px" }}
                                            value={splits[m.id] || ""}
                                            onChange={(e) => handleSplitChange(m.id, e.target.value)}
                                            placeholder="0"
                                        />
                                        {splitMode === 'percentage' && <span className="splitty-gradient-text fw-bold">%</span>}
                                    </div>
                                </div>
                            ))
                        )}
                        
                        {!isValid && amountVal > 0 && (
                            <div 
                                className={`mt-3 p-3 text-center rounded ${ocrData?.items?.length > 0 && currentSum === 0 ? 'splitty-alert-info' : 'splitty-alert-danger'}`} 
                                style={{ fontSize: "0.85rem", fontWeight: "600" }}
                            >
                                <i className={`fa-solid ${ocrData?.items?.length > 0 && currentSum === 0 ? 'fa-circle-info' : 'fa-triangle-exclamation'} me-2`}></i>
                                {diffMsg || "Please select participants and assign amounts."}
                            </div>
                        )}
                        {isValid && splitMode !== 'equal' && (
                            <div className="mt-3 p-3 text-center rounded splitty-alert-success" style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                                <i className="fa-solid fa-circle-check me-2"></i>
                                Perfect Distribution!
                            </div>
                        )}
                    </div>
                </div>

                {isAnalyzing ? (
                    <>
                        {createPortal(
                            <div className="ai-edge-glow-fullscreen"></div>,
                            document.body
                        )}
                        <div className="mb-4 text-center ai-glow-container ai-glow-pulse" 
                            style={{ 
                                minHeight: "130px", 
                                width: "100%", 
                                position: "relative",
                                overflow: "hidden",
                                background: "rgba(0,0,0,0.3)",
                                borderRadius: "20px",
                                border: "1px solid rgba(252, 164, 52, 0.2)"
                            }}>
                            <div className="ai-scan-line"></div>
                            <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100 py-4" style={{ position: "relative", zIndex: 10 }}>
                                <div className="spinner-border mb-3" style={{ color: "var(--color-base-dark-orange)", width: "2.5rem", height: "2.5rem", borderWidth: "0.2em" }} role="status"></div>
                                <span className="splitty-gradient-text fw-bold" style={{ letterSpacing: "1px", fontSize: "1.05rem", zIndex: 10 }}>
                                    MAGICAL AI ANALYSIS...
                                </span>
                                <span className="text-secondary small mt-1" style={{ fontSize: "0.75rem" }}>
                                    Reading description and amounts
                                </span>
                            </div>
                        </div>
                    </>
                ) : ocrData?.items?.length > 0 ? (
                    <div className="mb-4 p-3" style={{ background: "rgba(0,0,0,0.2)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        {ocrData?.merchant_name && (
                            <div className="mb-3">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <h5 className="mb-0 text-white" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                        {ocrData.merchant_name}
                                    </h5>
                                    {ocrData.merchant_name.includes("MOCK") && (
                                        <span 
                                            className="badge px-2 py-1" 
                                            style={{ fontSize: '0.65rem', borderRadius: '6px', fontWeight: 800, background: "rgba(252, 164, 52, 0.2)", color: "var(--color-base-orange)", border: "1px solid rgba(252, 164, 52, 0.3)" }}
                                        >
                                            ASSISTANT MODE
                                        </span>
                                    )}
                                </div>
                                {ocrData.merchant_name.includes("MOCK") && (
                                    <div 
                                        className="p-3 mb-3 rounded-4" 
                                        style={{ 
                                            background: "rgba(255, 255, 255, 0.03)", 
                                            border: "1px solid rgba(255, 255, 255, 0.08)",
                                            fontSize: "0.85rem",
                                            color: "#a19b95",
                                            lineHeight: "1.5"
                                        }}
                                    >
                                        <div className="d-flex align-items-center gap-2 mb-2" style={{ color: "var(--color-base-orange)", fontWeight: "600" }}>
                                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                                            <span>Assistant Suggestion</span>
                                        </div>
                                        We're showing a sample format to save you time. You can tap the items to assign them, or clear them to fill the form manually. Your file is attached!
                                        <div className="mt-3 d-flex gap-3">
                                            <button 
                                                type="button"
                                                onClick={() => setLightboxData({ isOpen: true, url: receiptFile.url, type: receiptFile.file?.type || (receiptFile.url.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg') })}
                                                className="btn btn-sm px-3 py-1 text-white border-0"
                                                style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.1)", borderRadius: "8px", fontWeight: "600" }}
                                            >
                                                <i className="fa-solid fa-eye me-1"></i> View Receipt
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setOcrData(null);
                                                    setAiAnalysisStatus("idle");
                                                }}
                                                className="btn btn-sm px-3 py-1 text-white border-0"
                                                style={{ fontSize: "0.75rem", background: "rgba(187, 77, 0, 0.15)", borderRadius: "8px", fontWeight: "600", color: "var(--color-base-orange)" }}
                                            >
                                                <i className="fa-solid fa-trash-can me-1"></i> Clear & Manual
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <label className="splitty-gradient-text mb-0" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                                <i className="fa-solid fa-wand-magic-sparkles me-2"></i>Items Details
                            </label>
                            <span className="badge rounded-pill bg-dark border border-secondary text-light px-2 py-1" style={{ fontSize: "0.75rem" }}>
                                Tax: {currency}{ocrData.tax.toFixed(2)} | Tip: {currency}{ocrData.tip.toFixed(2)}
                            </span>
                        </div>
                        {splitMode === 'exact' ? (
                            <>
                                <p className="text-secondary small mb-3">Tap an item to assign it. Tax and tip are distributed proportionally automatically.</p>
                                
                                <div className="d-flex flex-column gap-3">
                                    {ocrData.items.map((item, idx) => {
                                        const assignedUserId = itemAssignments[item.id];
                                        
                                        return (
                                            <div key={item.id} className="p-3 rounded-4" style={{
                                            position: "relative",
                                            zIndex: ocrData.items.length - idx,
                                            background: assignedUserId
                                                ? "rgba(187, 77, 0, 0.08)"
                                                : "rgba(255,255,255,0.03)",
                                            border: assignedUserId
                                                ? "1px solid rgba(187, 77, 0, 0.35)"
                                                : "1px solid rgba(255,255,255,0.05)",
                                            backdropFilter: "blur(8px)",
                                            WebkitBackdropFilter: "blur(8px)",
                                            transition: "all 0.2s"
                                        }}>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <div className="fw-bold text-white mb-1" style={{ fontSize: "0.95rem" }}>{item.name}</div>
                                                        <div style={{ fontSize: "0.75rem", color: "#a19b95" }}>
                                                            Base: {currency}{item.price.toFixed(2)} + Extras: {currency}{(item.tax_share + item.tip_share).toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div className="fw-bold" style={{ color: "var(--color-base-dark-orange)", fontSize: "1.05rem" }}>
                                                        {currency}{item.final_price.toFixed(2)}
                                                    </div>
                                                </div>

                                                <div className="mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                                    <CustomSelect
                                                        placeholder="Assign to a member..."
                                                        value={assignedUserId || ""}
                                                        onChange={(val) => handleItemAssignment(item.id, val)}
                                                        options={[
                                                            { value: "", label: "— Unassigned —", disabled: false },
                                                            ...selectedGroupMembers.map(m => ({ value: m.id.toString(), label: m.username }))
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="p-3 text-center rounded-4 mt-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
                                <i className="fa-solid fa-layer-group mb-2" style={{ fontSize: "1.5rem", color: "var(--color-base-orange)", opacity: 0.7 }}></i>
                                <p className="text-secondary small mb-0">
                                    You have chosen to split this expense <strong>{splitMode === 'equal' ? 'Equally' : 'by Percentage'}</strong>.<br/>
                                    Switch back to <strong>Exact Amounts</strong> to assign specific items individually.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {aiAnalysisStatus === "failed" && (
                            <div className="mb-4 p-3 rounded-4 d-flex align-items-center gap-3" 
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" 
                                    style={{ width: "40px", height: "40px", background: "rgba(252, 164, 52, 0.1)" }}>
                                    <i className="fa-solid fa-eye-slash" style={{ color: "#a19b95", fontSize: "1rem" }}></i>
                                </div>
                                <div style={{ fontSize: "0.85rem", color: "#a19b95" }}>
                                    <span className="fw-bold d-block mb-1" style={{ color: "var(--color-base-cream)" }}>Cloudy scan, manual save ready!</span>
                                    We couldn't read the text automatically, but your file is safe. You can see it below and fill the items manually.
                                </div>
                            </div>
                        )}

                        <ReceiptUploader 
                            onChange={(file, url) => {
                                setAiAnalysisStatus("idle"); // reset status on new file
                                setOcrData(null);
                                setReceiptFile({ file, url });
                            }}
                            onPreviewClick={(url, type) => setLightboxData({ isOpen: true, url, type })}
                        />
                    </>
                )}

                {/* Fix #4: Contextual submit button label */}
                <button 
                    type="submit" 
                    className="splitty-btn w-100 py-3 mt-4 d-flex align-items-center justify-content-center" 
                    disabled={!isValid || loading}
                >
                    <i className={`fa-solid ${isEditing ? 'fa-floppy-disk' : 'fa-receipt'} me-2`}></i>
                    {isEditing ? "Save Changes" : "Create Shared Expense"}
                </button>
            </form>

            {showInviteModal ? (
                <InviteModal 
                    groupId={groupId} 
                    groupName={store.groups.find(g => g.id.toString() === groupId.toString())?.name || "the group"} 
                    onClose={() => setShowInviteModal(false)} 
                />
            ) : null}
            
            <ReceiptViewerLightbox 
                isOpen={lightboxData.isOpen}
                onClose={() => setLightboxData({ isOpen: false, url: null, type: null })}
                fileUrl={lightboxData.url}
                fileType={lightboxData.type}
            />
        </div>
    );
};

export default AddExpenseForm;
