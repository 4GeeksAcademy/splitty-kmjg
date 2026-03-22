import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { SkeletonDashboard } from "./SkeletonDashboard";
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
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const initialAnimation = useRef(false);

    // Current logged in user ID to format messages
    const currentUserId = React.useMemo(() => store.user?.id || -1, [store.user?.id]); 

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

    // vercel-react-best-practices: memoize derived data (rerender-memo)
    // Hook must be called at the top level, before early returns
    const groupMembersArray = React.useMemo(() => {
        if (!data || !data.users) return [];
        return Object.values(data.users);
    }, [data]);

    if (loading) return <SkeletonDashboard />;
    if (error) return (
        <div className="container mt-5 text-center dashboard-element">
            <h2 className="splitty-gradient-text fw-bold">Error</h2>
            <p className="mb-4" style={{ color: "var(--color-base-cream)" }}>{error}</p>
            <button className="splitty-btn" style={{ maxWidth: "200px" }} onClick={() => navigate("/")}>
                Back to Home
            </button>
        </div>
    );

    const { personal_balances, settlements, users, expenses = [] } = data;

    return (
        <div className="container py-4 dashboard-element">
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-4 mb-5">
                {/* Left Side: Navigation & Primary Actions */}
                <div className="d-flex align-items-center gap-2 order-2 order-md-1 flex-shrink-0">
                    <button
                        className="btn text-white d-flex align-items-center justify-content-center"
                        onClick={() => navigate("/")}
                        style={{
                            borderRadius: "14px",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            backdropFilter: "blur(12px)",
                            fontSize: "0.95rem",
                            fontWeight: "500",
                            padding: "10px 20px",
                            color: "var(--color-base-cream)",
                            transition: "all 0.3s ease",
                            minWidth: "100px"
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
                    
                    <button 
                        className="btn text-white border-0 px-4 d-flex align-items-center justify-content-center shadow-sm" 
                        onClick={() => setShowInviteModal(true)} 
                        style={{ 
                            borderRadius: "14px", 
                            background: "var(--splitty-gradient)", 
                            fontSize: "0.95rem",
                            fontWeight: "600",
                            transition: "all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
                            padding: "10px 24px",
                            minWidth: "140px"
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 8px 15px rgba(187, 77, 0, 0.4)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    >
                        <i className="fa-solid fa-user-plus me-2"></i> Invite Friend
                    </button>
                </div>

                {/* Center: Title */}
                <div className="order-1 order-md-2 text-center flex-grow-1">
                    <h1 className="fw-bold mb-0 splitty-gradient-text" style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)", letterSpacing: "-1px" }}>
                        Group Dashboard
                    </h1>
                </div>

                {/* Right Side: User Profile / Space Balance */}
                <div className="d-none d-md-flex align-items-center justify-content-end order-3 flex-shrink-0" style={{ minWidth: "250px" }}>
                    {store.user && (
                        <div className="d-flex align-items-center p-2 px-3 rounded-pill" style={{ background: "rgba(252, 164, 52, 0.1)", border: "1px solid rgba(252, 164, 52, 0.2)" }}>
                            <i className="fa-solid fa-circle-user me-2" style={{ color: "var(--color-base-orange)" }}></i>
                            <span className="fw-semibold" style={{ color: "var(--color-base-cream)", fontSize: "0.9rem" }}>{store.user.username}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="row g-4 align-items-stretch">
                <div className="col-12 col-lg-5 d-flex flex-column">
                    {/* The Balances / Settlements Board */}
                    <div className="splitty-card dashboard-element h-100" style={{ maxWidth: "100%", padding: "2.5rem", boxShadow: "none", height: "100%" }}>
                        <div className="p-0">
                            <h4 className="card-title fw-bold mb-4 splitty-gradient-text d-flex align-items-center">
                                <i className="fa-solid fa-scale-balanced me-2 fs-5" style={{ color: "var(--color-base-orange)" }}></i> Settle Up
                            </h4>
                            
                            {settlements.length === 0 ? (
                                <div className="text-center py-4">
                                    <div className="poopet-icon">
                                        <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                            <defs>
                                                <linearGradient id="poopet-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#c76a2a" />
                                                    <stop offset="100%" stopColor="#BB4D00" />
                                                </linearGradient>
                                            </defs>
                                            <path fill="url(#poopet-gradient)" transform="scale(0.195312 0.195312)" d="M128.997 231.103C129.838 231.323 130.489 232.119 131.135 232.753L249.237 350.171L289.969 390.66C296.019 396.678 305.339 405.382 310.84 411.593C302.8 414.57 293.193 418.737 285.152 421.99L233.311 442.879C214.768 450.383 195.162 458.674 176.575 465.744C152.952 442.756 129.344 418.697 105.921 395.412L86.0653 375.689C82.7001 372.347 78.1396 367.57 74.6561 364.561C75.2835 361.805 79.5876 351.822 80.8036 348.843L94.2193 315.954L116.876 260.418C120.369 251.853 125.095 239.135 128.997 231.103Z"/><path fill="url(#poopet-gradient)" transform="scale(0.195312 0.195312)" d="M252.902 93.0478C258.748 92.5455 261.686 96.3646 265.104 100.499C273.246 110.224 279.035 121.696 282.021 134.022C287.091 154.701 283.989 176.537 273.362 194.986C267.858 204.65 260.033 215.15 254.119 224.887C266.436 237.732 280.455 251.097 293.158 263.739L308.122 278.628C310.642 281.133 314.339 285.013 316.952 287.147C319.25 285.89 322.805 283.334 325.121 281.863C331.346 277.911 337.5 273.648 343.77 269.76C361.813 258.503 383.452 254.502 404.328 258.563C417.927 261.206 430.664 267.161 441.411 275.902C445.147 278.913 450.641 283.086 449.402 288.535C448.484 292.573 443.275 296.065 439.243 294.466C435.858 293.124 432.958 289.738 430.132 287.471C422.618 281.56 413.926 277.323 404.641 275.043C396.843 273.133 388.765 272.636 380.792 273.575C358.042 276.208 347.12 287.456 328.513 298.804L371.86 341.98C373.604 343.731 375.241 345.374 376.676 347.396C385.302 359.557 383.244 374.404 372.864 384.576C366.565 390.029 356.923 393.057 348.994 396.248C341.709 399.147 334.441 402.086 327.189 405.065C324.851 402.972 322.102 400.066 319.849 397.817L307.231 385.263L266.464 344.721L135.666 214.71C136.827 210.722 141.064 201.005 142.915 196.576C145.424 190.576 148.867 181.006 151.649 175.54C152.757 173.351 154.123 171.302 155.718 169.437C160.626 163.762 167.443 160.605 174.881 160.067C180.472 159.62 186.07 160.859 190.951 163.623C196.26 166.667 202.333 173.46 206.873 177.955L229.37 200.314C233.406 204.33 238.357 209.522 242.6 213.181C248.37 202.849 257.498 191.983 262.419 181.066C271.871 160.086 269.835 135.715 257.035 116.594C255.026 113.6 252.335 110.131 249.726 107.596C244.642 102.659 245.562 95.0461 252.902 93.0478Z"/><path fill="url(#poopet-gradient)" transform="scale(0.195312 0.195312)" d="M419.078 329.073C422.857 329.318 427.598 331.638 431.608 332.673C441.01 335.051 450.879 334.855 460.179 332.103C464.717 330.769 469.583 327.319 474.351 330.361C481.481 334.908 476.175 342.647 474.573 348.577C471.747 359.04 472.145 370.661 476.332 380.728C479.009 387.066 478.861 393.362 471.037 395.055C466.652 395.168 463.146 392.887 458.699 391.698C449.225 389.249 439.27 389.363 429.855 392.029C425.196 393.375 419.948 397.088 415.122 393.758C408.17 388.96 414.298 379.76 415.797 373.378C416.835 368.806 417.239 364.111 416.996 359.428C416.801 354.858 415.939 350.341 414.439 346.02C412.927 341.794 410.025 336.437 413.218 332.109C414.711 330.085 416.714 329.473 419.078 329.073Z"/><path fill="url(#poopet-gradient)" transform="scale(0.195312 0.195312)" d="M431.781 94.5674C433.615 94.8152 434.796 95.019 436.426 96.0527C438.095 97.0914 439.264 98.7685 439.663 100.693C439.981 102.164 439.88 103.694 439.373 105.111C438.217 108.418 434.964 110.506 434.079 113.589C432.206 120.107 431.952 124.814 428.148 130.739C424.07 137.06 417.902 141.749 410.72 143.987C408.768 144.594 405.835 145.136 403.782 145.556C398.073 146.726 393.583 150.605 391.963 156.259C391.254 158.733 390.882 161.456 390.161 163.989C389.303 167.005 387.997 169.874 386.287 172.502C380.84 180.809 372.456 185.408 362.977 186.82C357.074 187.7 352.007 191.853 350.39 197.59C349.695 200.059 349.313 202.77 348.615 205.265C347.726 208.403 346.352 211.383 344.543 214.096C337.205 225.099 328.707 226.571 317.278 229.38C314.273 230.118 312.523 233.991 307.447 234.985C303.406 234.951 299.798 232.473 299.081 228.421C297.621 221.271 308.132 215.154 313.83 213.536C320.764 211.567 327.258 211.819 331.462 204.718C333.807 200.756 333.781 196.771 335.16 192.418C336.534 188.064 338.861 184.072 341.972 180.731C346.285 176.091 350.975 173.215 357.14 171.682C362.191 170.426 365.756 170.467 369.87 167.013C375.377 162.389 374.768 157.484 376.629 151.379C377.784 147.59 379.645 144.053 382.113 140.954C386.184 135.827 391.669 132.029 398.006 130.4C404.289 128.785 408.688 128.971 413.339 123.731C416.942 119.672 416.847 114.665 418.39 109.67C419.433 106.345 421.009 103.211 423.055 100.39C425.56 96.9102 427.538 95.2451 431.781 94.5674Z"/><path fill="url(#poopet-gradient)" transform="scale(0.195312 0.195312)" d="M412.667 208.088C417.391 207.79 422.08 209.074 425.993 211.738C431.147 215.271 433.943 217.875 439.967 213.751C441.589 212.641 444.102 211.295 445.935 210.6C452.405 208.204 459.602 208.779 465.61 212.171C467.688 213.361 470.021 215.272 472.1 216.293C474.375 217.218 476.446 217.273 478.738 218.299C483.328 220.354 484.029 225.02 481.821 229.215C480.723 231.301 478.724 232.416 476.399 233.039C467.913 233.614 464.446 230.545 457.951 226.35C452.236 222.659 446.682 229.607 441.176 231.103C434.988 232.785 428.028 232.126 422.37 228.805C420.74 227.872 418.754 225.892 417.328 225.238C414.729 224.166 412.328 224.048 409.751 222.794C405.213 220.585 404.61 215.821 406.921 211.659C408.153 209.443 410.234 208.607 412.667 208.088Z"/><path fill="url(#poopet-gradient)" transform="scale(0.195312 0.195312)" d="M323.781 60.5637C327.552 60.3405 331.506 62.5934 332.439 66.185C334.239 73.11 330.287 79.3422 326.983 84.9299C323.555 91.6843 330.937 95.4743 332.844 101.761C335.082 108.121 334.386 117.102 330.084 122.572C325.192 128.792 329.619 135.029 320.501 137.738C318.787 137.884 317.041 137.653 315.591 136.801C307.046 131.781 312.606 119.709 316.646 113.74C320.28 108.369 315.846 104.522 313.223 100.435C312.106 98.6741 311.261 96.7557 310.714 94.7437C309.292 89.5772 309.854 82.8522 312.32 78.0421C313.344 76.0441 315.087 73.9518 315.94 71.8359C316.941 69.3512 316.786 66.2321 318.222 63.8812C319.56 61.6884 321.47 61.091 323.781 60.5637Z"/><path fill="url(#poopet-gradient)" transform="scale(0.195312 0.195312)" d="M470.898 149.603C477.514 149.041 483.328 153.959 483.874 160.576C484.419 167.193 479.487 172.996 472.868 173.525C466.273 174.052 460.495 169.141 459.952 162.547C459.408 155.952 464.305 150.162 470.898 149.603Z"/><path fill="url(#poopet-gradient)" transform="scale(0.195312 0.195312)" d="M194.668 109.073C201.229 108.365 207.131 113.09 207.876 119.648C208.621 126.205 203.93 132.133 197.377 132.916C190.771 133.706 184.783 128.968 184.032 122.357C183.281 115.746 188.052 109.786 194.668 109.073Z"/><path fill="url(#poopet-gradient)" transform="scale(0.195312 0.195312)" d="M68.1051 380.48C88.7801 400.53 109.413 421.553 129.871 441.881L150.217 462.116C152.356 464.246 158.565 470.163 160.229 472.284C134.998 482.809 109.351 492.69 84.0567 503.081C78.7238 505.272 73.3469 507.391 67.9895 509.52C66.6115 510.068 61.7993 511.519 60.978 512L51.8285 512C49.5963 510.982 47.0579 510.568 44.8659 509.588C38.1934 506.606 32.622 500.832 29.9089 494.046C28.0876 489.549 27.507 483.482 28.4612 478.76C29.3584 474.321 32.0224 468.4 33.8093 464.021L42.097 443.736L58.2204 404.228C61.1965 396.928 64.1434 389.581 67.2241 382.326C67.4954 381.687 67.7865 381.095 68.1051 380.48Z"/><path fill="url(#poopet-gradient)" transform="scale(0.195312 0.195312)" d="M374.761 0L378.736 0C388.093 5.53351 404.556 6.74181 414.825 3.71598C417.534 2.91753 422.194 1.57563 424.531 0L428.523 0C429.826 0.868711 432.255 1.60541 433.246 3.08777C436.739 8.31317 433.603 12.5925 432.082 17.3083C429.047 26.8904 428.728 37.7666 431.613 47.4566C433.303 53.1301 438.084 59.9161 431.412 64.7187C426.694 68.1151 420.952 64.1831 416.115 62.8491C405.501 59.9222 393.868 60.292 383.538 64.2008C380.487 65.3036 377.625 66.5859 374.311 65.7295C368.259 64.1659 367.461 57.9923 369.846 53.0112C370.863 50.8887 371.739 47.9015 372.304 45.6479C374.176 38.1022 374.347 30.2347 372.805 22.6148C371.029 13.3899 363.249 5.89763 374.761 0Z"/></svg>
                                    </div>
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
                                                <span className="badge rounded-pill fs-6 fw-bold" style={{ background: "var(--splitty-gradient)", color: "var(--color-base-light)", boxShadow: "none" }}>
                                                    ${tx.amount.toFixed(2)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                </div>  {/* end left col */}

                <div className="col-12 col-lg-7 dashboard-element d-flex flex-column">
                    <div className="splitty-card h-100" style={{ maxWidth: "100%", padding: "2.5rem", boxShadow: "none", height: "100%" }}>
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                            <h4 className="card-title fw-bold mb-0 splitty-gradient-text d-flex align-items-center">
                                <i className="fa-solid fa-receipt me-2 fs-5" style={{ color: "var(--color-base-orange)" }}></i> Shared Expenses
                            </h4>
                            <button
                                className="btn text-white px-4 d-flex align-items-center justify-content-center"
                                onClick={() => {
                                    setSelectedExpense(null);
                                    setShowAddForm(!showAddForm);
                                }}
                                style={{
                                    borderRadius: "12px",
                                    background: showAddForm && !selectedExpense ? "rgba(255,255,255,0.08)" : "var(--splitty-gradient)",
                                    color: showAddForm && !selectedExpense ? "var(--color-base-cream)" : "var(--color-base-light)",
                                    border: showAddForm && !selectedExpense ? "1px solid rgba(255,255,255,0.1)" : "none",
                                    fontSize: "0.85rem",
                                    fontWeight: "600",
                                    padding: "10px 18px",
                                    boxShadow: "none",
                                    transition: "all 0.3s ease"
                                }}
                                onMouseEnter={e => {
                                    if (!(showAddForm && !selectedExpense)) {
                                        e.currentTarget.style.boxShadow = "0 6px 15px rgba(187, 77, 0, 0.4)";
                                        e.currentTarget.style.transform = "translateY(-1px)";
                                    }
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.transform = "translateY(0)";
                                }}
                            >
                                <i className={`fa-solid ${showAddForm && !selectedExpense ? 'fa-xmark' : 'fa-plus'} me-2`}></i>
                                {showAddForm && !selectedExpense ? "Cancel" : "Add Expense"}
                            </button>
                        </div>

                        {showAddForm ? (
                            <div className="mt-2">
                                <AddExpenseForm
                                    groupId={id}
                                    groupMembers={groupMembersArray}
                                    expenseToEdit={selectedExpense}
                                    onSuccess={() => {
                                        setShowAddForm(false);
                                        setSelectedExpense(null);
                                        loadDashboardData();
                                    }}
                                    onCancel={() => {
                                        setShowAddForm(false);
                                        setSelectedExpense(null);
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="expense-list-container">
                                {expenses.length === 0 ? (
                                <div className="text-center py-5 d-flex flex-column align-items-center">
                                    <i className="fa-solid fa-file-invoice-dollar mb-3" style={{ fontSize: "3.5rem", opacity: 0.25, color: "#FCA434" }}></i>
                                    <p className="fw-semibold mb-1" style={{ color: "#FFE7CD", opacity: 0.7 }}>No expenses yet</p>
                                    <small style={{ color: "#a19b95" }}>Tap "Add New Expense" to log the first one.</small>
                                </div>
                            ) : (
                                <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                                    {expenses.map((entry, idx) => {
                                        const exp = entry.expense || entry;
                                        const participants = entry.participants || [];
                                        const payerUser = users[exp.paid_by];
                                        const payerName = payerUser ? payerUser.username : `User #${exp.paid_by}`;
                                        const dateStr = exp.date
                                            ? new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                            : "";
                                        const splitCount = participants.length || 1;
                                        return (
                                            <li
                                                key={exp.id || idx}
                                                onClick={() => {
                                                    setSelectedExpense(entry);
                                                    setShowAddForm(true);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                style={{
                                                    background: "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                                                    border: "1px solid rgba(255, 255, 255, 0.08)",
                                                    borderRadius: "16px",
                                                    padding: "1.25rem 1.5rem",
                                                    backdropFilter: "blur(12px)",
                                                    cursor: "pointer",
                                                    transition: "all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)"
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.transform = "translateY(-4px)";
                                                    e.currentTarget.style.boxShadow = "0 12px 24px -10px rgba(252, 164, 52, 0.4)";
                                                    e.currentTarget.style.borderColor = "var(--color-base-dark-orange)";
                                                    e.currentTarget.style.background = "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)";
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                    e.currentTarget.style.boxShadow = "none";
                                                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                                                    e.currentTarget.style.background = "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)";
                                                }}
                                            >
                                                <div className="d-flex justify-content-between align-items-start gap-2">
                                                    {/* Left: icon + title + meta */}
                                                    <div className="d-flex gap-3 align-items-center" style={{ minWidth: 0 }}>
                                                        <div style={{
                                                            width: "48px", height: "48px", flexShrink: 0,
                                                            borderRadius: "14px",
                                                            background: "rgba(252, 164, 52, 0.15)",
                                                            border: "1px solid rgba(252, 164, 52, 0.3)",
                                                            display: "flex", alignItems: "center", justifyContent: "center"
                                                        }}>
                                                            <i className="fa-solid fa-coins" style={{ color: "var(--color-base-dark-orange)", fontSize: "1.2rem" }}></i>
                                                        </div>
                                                        <div style={{ minWidth: 0 }}>
                                                            <p className="mb-0 fw-bold text-truncate" style={{ color: "var(--color-base-cream)", fontSize: "1.05rem", letterSpacing: "0.3px" }}>
                                                                {exp.description || exp.title || "Expense"}
                                                            </p>
                                                            <div className="d-flex gap-2 flex-wrap mt-1">
                                                                <small style={{ color: "rgba(255, 231, 205, 0.6)", fontSize: "0.85rem" }}>
                                                                    <i className="fa-solid fa-user me-1" style={{ color: "var(--color-base-light-coral)" }}></i>
                                                                    <span style={{ color: "var(--color-base-light-coral)", fontWeight: "500" }}>{payerName}</span> paid
                                                                </small>
                                                                {dateStr && (
                                                                    <small style={{ color: "rgba(255, 231, 205, 0.6)", fontSize: "0.85rem" }}>
                                                                        <i className="fa-regular fa-calendar me-1"></i>{dateStr}
                                                                    </small>
                                                                )}
                                                                <small style={{ color: "rgba(255, 231, 205, 0.6)", fontSize: "0.85rem" }}>
                                                                    <i className="fa-solid fa-users-line me-1"></i>{splitCount} people
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Right: amount badge */}
                                                    <div className="text-end flex-shrink-0 d-flex flex-column align-items-end gap-1">
                                                        <span
                                                            className="badge rounded-pill fw-bold"
                                                            style={{
                                                                background: "rgba(252, 164, 52, 0.15)",
                                                                color: "var(--color-base-dark-orange)",
                                                                border: "1px solid rgba(252, 164, 52, 0.3)",
                                                                padding: "8px 16px",
                                                                fontSize: "0.95rem"
                                                            }}
                                                        >
                                                            ${parseFloat(exp.amount || 0).toFixed(2)}
                                                        </span>
                                                        <small style={{ color: "var(--color-base-rust)", fontSize: "0.75rem", fontWeight: "600", opacity: 0.8, marginTop: "0.5rem", transition: "color 0.2s" }} className="expense-edit-hint">
                                                            <i className="fa-solid fa-pen-to-square me-1"></i>Edit
                                                        </small>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showInviteModal ? (
                <InviteModal 
                    groupId={id} 
                    groupName={store.groups.find(g => g.id.toString() === id.toString())?.name || "the group"} 
                    onClose={() => setShowInviteModal(false)} 
                />
            ) : null}
        </div>
    );
};

export default GroupDashboard;
