import React, { useState, useEffect } from "react";
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

    if (amountVal > 0 && description.trim() !== "" && selectedGroupMembers.length > 0) {
        if (splitMode === "equal") {
            isValid = true;
        } else if (splitMode === "exact") {
            currentSum = Object.values(splits).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            if (Math.abs(currentSum - amountVal) < 0.05) {
                isValid = true;
            } else {
                diffMsg = `Assigned: ${currency}${currentSum.toFixed(2)} / Left: ${currency}${(amountVal - currentSum).toFixed(2)}`;
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
                .skel-block {
                    animation: pulse-dark 1.5s infinite ease-in-out;
                }
                .skel-orange {
                    animation: pulse-orange 1.5s infinite ease-in-out;
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
                    <label className="splitty-label splitty-gradient-text" style={{ fontWeight: 700 }}>Description</label>
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
                                    onClick={() => setSplitMode(tab.id)}
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
                        {selectedGroupMembers.map(m => (
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
                        ))}
                        
                        {!isValid && amountVal > 0 && splitMode !== 'equal' && (
                            <div className="mt-3 p-3 text-center rounded splitty-alert-danger" style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                                <i className="fa-solid fa-triangle-exclamation me-2"></i>
                                {diffMsg}
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

                <ReceiptUploader 
                    onChange={(file, url) => setReceiptFile({ file, url })}
                    onPreviewClick={(url, type) => setLightboxData({ isOpen: true, url, type })}
                />

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
