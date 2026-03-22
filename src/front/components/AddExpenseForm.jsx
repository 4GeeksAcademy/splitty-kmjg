import React, { useState, useEffect } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { Loading } from "./Loading";
import CustomSelect from "./CustomSelect";
import InviteModal from "./InviteModal";

export const AddExpenseForm = ({ groupId, groupMembers, onSuccess, onCancel, expenseToEdit }) => {
    const { store, actions } = useGlobalReducer();
    const isEditing = !!expenseToEdit;
    
    // Internal state
    const [description, setDescription] = useState(expenseToEdit?.expense?.description || "");
    const [totalAmount, setTotalAmount] = useState(expenseToEdit?.expense?.amount || "");
    const [currency, setCurrency] = useState(expenseToEdit?.expense?.currency || "$"); 
    const [paidBy, setPaidBy] = useState(expenseToEdit?.expense?.paid_by?.toString() || "");
    const [splitMode, setSplitMode] = useState("equal");
    const [splits, setSplits] = useState({});
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showInviteModal, setShowInviteModal] = useState(false);

    const [selectedMembers, setSelectedMembers] = useState([]);

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

    // Initialize paidBy and members for NEW expense
    useEffect(() => {
        if (!isEditing && groupMembers.length > 0) {
            if (!paidBy && store.user?.username) {
                const currentUserMember = groupMembers.find(m => m.username === store.user.username || m.email === store.user.email);
                setPaidBy(currentUserMember ? currentUserMember.id.toString() : groupMembers[0].id.toString());
            } else if (!paidBy) {
                setPaidBy(groupMembers[0].id.toString());
            }
            if (selectedMembers.length === 0) {
                setSelectedMembers(groupMembers.map(m => m.id));
            }
        }
    }, [groupMembers, store.user?.username, isEditing]);

    const selectedGroupMembers = groupMembers.filter(m => selectedMembers.includes(m.id));

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
            onSuccess();
        } else {
            setError(resp.error || "Error saving expense");
            setLoading(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="splitty-card w-100 shadow-lg px-3 px-md-4 py-4 py-md-5" style={{ maxWidth: "100%" }}>
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2">
                {/* Fix #6: gradient text always applied */}
                <h3 className="fw-bold mb-0 splitty-gradient-text" style={{ fontSize: "1.9rem" }}>
                    {isEditing ? "Edit Expense" : "Add Expense"}
                </h3>
                <div className="d-flex gap-2 align-items-center">
                    {isEditing && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            title="Delete Expense"
                            style={{
                                background: "rgba(248,113,113,0.12)",
                                border: "1px solid rgba(248,113,113,0.3)",
                                borderRadius: "10px",
                                padding: "8px 12px",
                                color: "#f87171",
                                cursor: "pointer"
                            }}
                        >
                            <i className="fa-solid fa-trash-can"></i>
                        </button>
                    )}
                    <button type="button" className="btn-close btn-close-white opacity-50" onClick={onCancel} aria-label="Close"></button>
                </div>
            </div>
            
            {error && <div className="splitty-alert splitty-alert-danger">{error}</div>}

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
                            options={groupMembers.map(m => ({ value: m.id.toString(), label: m.username }))}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="splitty-label splitty-gradient-text mb-0" style={{ fontWeight: 700 }}>Participants</label>
                        <button 
                            type="button"
                            className="btn py-2 px-3 border-0 shadow-sm"
                            onClick={() => setShowInviteModal(true)}
                            style={{ 
                                borderRadius: "10px", 
                                background: "rgba(252, 164, 52, 0.15)", 
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                color: "var(--color-base-orange)",
                                border: "1px solid rgba(252, 164, 52, 0.3)"
                            }}
                        >
                            <i className="fa-solid fa-user-plus me-2"></i> Anyone missing?
                        </button>
                    </div>
                    <div className="d-flex flex-wrap gap-2 p-3" style={{ background: "rgba(0,0,0,0.2)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.03)" }}>
                        {groupMembers.map(m => {
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
                                        fontSize: "0.85rem",
                                        padding: "10px 0",
                                        transition: "all 0.3s ease"
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

                {/* Fix #4: Contextual submit button label */}
                <button 
                    type="submit" 
                    className="splitty-btn w-100 py-3 mt-2" 
                    disabled={!isValid || loading}
                >
                    <i className={`fa-solid ${isEditing ? 'fa-floppy-disk' : 'fa-receipt'} me-2`}></i>
                    {isEditing ? "Save Changes" : "Create Shared Expense"}
                </button>
            </form>

            {showInviteModal && (
                <InviteModal 
                    groupId={groupId} 
                    groupName={store.groups.find(g => g.id.toString() === groupId.toString())?.name || "the group"} 
                    onClose={() => setShowInviteModal(false)} 
                />
            )}
        </div>
    );
};

export default AddExpenseForm;
