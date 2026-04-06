import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import FadeContent from "../components/bits/FadeContent.jsx";

const FriendsPage = () => {
    const { store, actions } = useGlobalReducer();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("friends");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [inviteLink, setInviteLink] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteSending, setInviteSending] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState("");
    const [requestFeedback, setRequestFeedback] = useState("");
    const [sentRequests, setSentRequests] = useState(new Set());
    const [removingFriendId, setRemovingFriendId] = useState(null);
    const [acceptingRequestId, setAcceptingRequestId] = useState(null);
    const [decliningRequestId, setDecliningRequestId] = useState(null);
    const [sendingRequestId, setSendingRequestId] = useState(null);
    const searchTimeout = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        actions.loadFriends();
        actions.loadPendingRequests();
    }, []);

    // GSAP stagger animation for the list
    useEffect(() => {
        if (listRef.current) {
            const cards = listRef.current.querySelectorAll(".friend-card-item");
            if (cards.length > 0) {
                gsap.fromTo(cards,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" }
                );
            }
        }
    }, [store.friends, store.friendRequests, activeTab]);

    // Debounced search
    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            const resp = await actions.searchUsers(query);
            if (resp.ok) {
                setSearchResults(resp.data.users || []);
            }
            setSearching(false);
        }, 300);
    }, [actions]);

    const handleSendRequest = async (userId) => {
        setRequestFeedback("");
        setSendingRequestId(userId);
        const resp = await actions.sendFriendRequest(userId);
        if (resp.ok) {
            setRequestFeedback("Friend request sent! ✓");
            // Mark as sent instead of removing to prevent artificial 'no results'
            setSentRequests(prev => new Set(prev).add(userId));
        } else {
            setRequestFeedback(resp.data?.error || "Failed to send request");
        }
        setSendingRequestId(null);
        setTimeout(() => setRequestFeedback(""), 3000);
    };

    const handleAccept = async (friendshipId) => {
        setAcceptingRequestId(friendshipId);
        await actions.acceptFriendRequest(friendshipId);
        setAcceptingRequestId(null);
    };

    const handleDecline = async (friendshipId) => {
        setDecliningRequestId(friendshipId);
        await actions.declineFriendRequest(friendshipId);
        setDecliningRequestId(null);
    };

    const handleRemoveFriend = async (friendshipId) => {
        setRemovingFriendId(friendshipId);
        await actions.removeFriend(friendshipId);
        setRemovingFriendId(null);
    };

    const handleGenerateLink = async () => {
        setInviteSending(true);
        const resp = await actions.generateFriendInviteLink(inviteEmail || null);
        if (resp.ok) {
            setInviteLink(resp.data.link);
            setInviteSuccess(inviteEmail ? "Invitation sent! ✓" : "Link generated!");
        }
        setInviteSending(false);
        setTimeout(() => setInviteSuccess(""), 4000);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        setInviteSuccess("Link copied! 📋");
        setTimeout(() => setInviteSuccess(""), 2000);
    };

    const pendingCount = store.friendRequests?.received?.length || 0;

    return (
        <div className="py-5">
            <div className="container mt-5">
                {/* Header */}
                <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0}>
                    <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
                        <div>
                            <h1 className="fw-bold mb-1" style={{ color: "var(--color-base-light)", fontSize: "clamp(2rem, 5vw, 2.8rem)" }}>
                                <i className="fas fa-user-group me-3" style={{ color: "var(--color-base-dark-orange)" }}></i>
                                Friends
                            </h1>
                            <p className="mb-0" style={{ color: "var(--color-base-light)", opacity: 0.6, fontSize: "1rem" }}>
                                Manage your friends and share expenses together.
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

                {/* Tabs */}
                <div className="d-flex gap-2 mb-4 mt-4" style={{ overflowX: "auto", paddingBottom: "8px", paddingTop: "8px", paddingRight: "8px" }}>
                    {[
                        { key: "friends", label: "My Friends", icon: "fa-users" },
                        { key: "requests", label: "Requests", icon: "fa-user-clock", badge: pendingCount },
                        { key: "add", label: "Add Friend", icon: "fa-user-plus" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className="btn position-relative"
                            style={{
                                background: activeTab === tab.key
                                    ? "linear-gradient(135deg, var(--color-base-dark-orange), #c76a2a)"
                                    : "rgba(255,255,255,0.05)",
                                color: activeTab === tab.key ? "#fff" : "rgba(255,255,255,0.6)",
                                border: "none",
                                borderRadius: "12px",
                                padding: "10px 20px",
                                fontWeight: "600",
                                fontSize: "0.9rem",
                                whiteSpace: "nowrap",
                                transition: "all 0.3s ease",
                                minHeight: "44px",
                            }}
                        >
                            <i className={`fas ${tab.icon} me-2`}></i>
                            {tab.label}
                            {tab.badge > 0 && (
                                <span style={{
                                    position: "absolute",
                                    top: "-8px",
                                    right: "-8px",
                                    background: "linear-gradient(135deg, var(--color-base-dark-orange), #c76a2a)",
                                    color: "#fff",
                                    borderRadius: "10px",
                                    minWidth: "20px",
                                    height: "20px",
                                    padding: "0 6px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.75rem",
                                    fontWeight: "700",
                                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                                    zIndex: 2
                                }}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div ref={listRef}>
                    {/* MY FRIENDS TAB */}
                    {activeTab === "friends" && (
                        <FadeContent blur={true} duration={800}>
                            {store.friendsLoading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border" role="status" style={{ color: "var(--color-base-dark-orange)" }}>
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : store.friends.length === 0 ? (
                                <div className="text-center py-5 stat-card" style={{ borderRadius: "18px" }}>
                                    <i className="fas fa-user-group mb-3" style={{ fontSize: "3rem", color: "rgba(255,255,255,0.15)" }}></i>
                                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>No friends yet</p>
                                    <button
                                        className="btn mt-2"
                                        onClick={() => setActiveTab("add")}
                                        style={{
                                            background: "linear-gradient(135deg, var(--color-base-dark-orange), #c76a2a)",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "12px",
                                            padding: "10px 24px",
                                            fontWeight: "600"
                                        }}
                                    >
                                        <i className="fas fa-user-plus me-2"></i>Add your first friend
                                    </button>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {store.friends.map((f) => (
                                        <div key={f.friendship_id} className="friend-card-item d-flex align-items-center p-3 stat-card" style={{ borderRadius: "16px" }}>
                                            {/* Avatar */}
                                            <div style={{
                                                width: "48px",
                                                height: "48px",
                                                borderRadius: "50%",
                                                background: "linear-gradient(135deg, var(--color-base-dark-orange), #c76a2a)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "1.2rem",
                                                fontWeight: "700",
                                                color: "#fff",
                                                flexShrink: 0
                                            }}>
                                                {f.friend.username?.[0]?.toUpperCase() || "?"}
                                            </div>
                                            {/* Info */}
                                            <div className="ms-3 flex-grow-1">
                                                <h6 className="mb-0 text-white fw-bold">{f.friend.username}</h6>
                                                <small style={{ color: "rgba(255,255,255,0.4)" }}>{f.friend.email}</small>
                                            </div>
                                            {/* Remove button */}
                                            <button
                                                className="btn btn-sm"
                                                onClick={() => handleRemoveFriend(f.friendship_id)}
                                                disabled={removingFriendId === f.friendship_id}
                                                style={{
                                                    color: "#f87171",
                                                    background: "rgba(248,113,113,0.1)",
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    padding: "8px 12px",
                                                    minHeight: "44px",
                                                    minWidth: "44px"
                                                }}
                                            >
                                                {removingFriendId === f.friendship_id ? (
                                                    <span className="spinner-border spinner-border-sm"></span>
                                                ) : (
                                                    <i className="fas fa-user-minus"></i>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </FadeContent>
                    )}

                    {/* REQUESTS TAB */}
                    {activeTab === "requests" && (
                        <FadeContent blur={true} duration={800}>
                            {/* Received Requests */}
                            {store.friendRequests?.received?.length > 0 && (
                                <>
                                    <h6 className="text-white fw-bold mb-3">
                                        <i className="fas fa-inbox me-2" style={{ color: "var(--color-base-dark-orange)" }}></i>
                                        Received Requests
                                    </h6>
                                    <div className="d-flex flex-column gap-3 mb-4">
                                        {store.friendRequests.received.map((req) => (
                                            <div key={req.id} className="friend-card-item d-flex align-items-center p-3 stat-card" style={{ borderRadius: "16px" }}>
                                                <div style={{
                                                    width: "48px", height: "48px", borderRadius: "50%",
                                                    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "1.2rem", fontWeight: "700", color: "#fff", flexShrink: 0
                                                }}>
                                                    {req.requester.username?.[0]?.toUpperCase() || "?"}
                                                </div>
                                                <div className="ms-3 flex-grow-1">
                                                    <h6 className="mb-0 text-white fw-bold">{req.requester.username}</h6>
                                                    <small style={{ color: "rgba(255,255,255,0.4)" }}>wants to be your friend</small>
                                                </div>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        className="btn btn-sm"
                                                        onClick={() => handleAccept(req.id)}
                                                        disabled={acceptingRequestId === req.id || decliningRequestId === req.id}
                                                        style={{
                                                            background: "rgba(74,222,128,0.15)",
                                                            color: "#4ade80",
                                                            border: "none",
                                                            borderRadius: "10px",
                                                            padding: "8px 14px",
                                                            minHeight: "44px",
                                                            minWidth: "85px",
                                                            fontWeight: "600"
                                                        }}
                                                    >
                                                        {acceptingRequestId === req.id ? (
                                                            <span className="spinner-border spinner-border-sm"></span>
                                                        ) : (
                                                            <><i className="fas fa-check me-1"></i> Accept</>
                                                        )}
                                                    </button>
                                                    <button
                                                        className="btn btn-sm"
                                                        onClick={() => handleDecline(req.id)}
                                                        disabled={acceptingRequestId === req.id || decliningRequestId === req.id}
                                                        style={{
                                                            background: "rgba(248,113,113,0.1)",
                                                            color: "#f87171",
                                                            border: "none",
                                                            borderRadius: "10px",
                                                            padding: "8px 14px",
                                                            minHeight: "44px",
                                                            minWidth: "44px"
                                                        }}
                                                    >
                                                        {decliningRequestId === req.id ? (
                                                            <span className="spinner-border spinner-border-sm"></span>
                                                        ) : (
                                                            <i className="fas fa-times"></i>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Sent Requests */}
                            {store.friendRequests?.sent?.length > 0 && (
                                <>
                                    <h6 className="text-white fw-bold mb-3">
                                        <i className="fas fa-paper-plane me-2" style={{ color: "rgba(255,255,255,0.4)" }}></i>
                                        Sent Requests
                                    </h6>
                                    <div className="d-flex flex-column gap-3">
                                        {store.friendRequests.sent.map((req) => (
                                            <div key={req.id} className="friend-card-item d-flex align-items-center p-3 stat-card" style={{ borderRadius: "16px", opacity: 0.7 }}>
                                                <div style={{
                                                    width: "48px", height: "48px", borderRadius: "50%",
                                                    background: "rgba(255,255,255,0.1)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "1.2rem", fontWeight: "700", color: "rgba(255,255,255,0.5)", flexShrink: 0
                                                }}>
                                                    {req.addressee.username?.[0]?.toUpperCase() || "?"}
                                                </div>
                                                <div className="ms-3 flex-grow-1">
                                                    <h6 className="mb-0 text-white fw-bold">{req.addressee.username}</h6>
                                                    <small style={{ color: "rgba(255,255,255,0.4)" }}>
                                                        <i className="fas fa-clock me-1"></i>Pending
                                                    </small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Empty state */}
                            {(!store.friendRequests?.received?.length && !store.friendRequests?.sent?.length) && (
                                <div className="text-center py-5 stat-card" style={{ borderRadius: "18px" }}>
                                    <i className="fas fa-inbox mb-3" style={{ fontSize: "3rem", color: "rgba(255,255,255,0.15)" }}></i>
                                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>No pending requests</p>
                                </div>
                            )}
                        </FadeContent>
                    )}

                    {/* ADD FRIEND TAB */}
                    {activeTab === "add" && (
                        <FadeContent blur={true} duration={800}>
                            {/* Search section */}
                            <div className="stat-card p-4 mb-4" style={{ borderRadius: "18px" }}>
                                <h6 className="text-white fw-bold mb-3">
                                    <i className="fas fa-search me-2" style={{ color: "var(--color-base-dark-orange)" }}></i>
                                    Search Users
                                </h6>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        placeholder="Search by username or email..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="form-control splitty-input-search"
                                        style={{
                                            background: "rgba(255,255,255,0.06)",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "12px",
                                            color: "#fff",
                                            padding: "14px 16px",
                                            fontSize: "1rem",
                                            minHeight: "48px",
                                        }}
                                    />
                                    {searching && (
                                        <div className="position-absolute" style={{ right: "16px", top: "50%", transform: "translateY(-50%)" }}>
                                            <div className="spinner-border spinner-border-sm" style={{ color: "var(--color-base-dark-orange)" }}></div>
                                        </div>
                                    )}
                                </div>

                                {/* Feedback */}
                                {requestFeedback && (
                                    <div className="mt-3 px-3 py-2" style={{
                                        background: requestFeedback.includes("✓") ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                                        color: requestFeedback.includes("✓") ? "#4ade80" : "#f87171",
                                        borderRadius: "10px",
                                        fontSize: "0.9rem"
                                    }}>
                                        {requestFeedback}
                                    </div>
                                )}

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div className="mt-3 d-flex flex-column gap-2">
                                        {searchResults.map((user) => (
                                            <div key={user.id} className="d-flex align-items-center p-3" style={{
                                                background: "rgba(255,255,255,0.03)",
                                                borderRadius: "12px",
                                            }}>
                                                <div style={{
                                                    width: "40px", height: "40px", borderRadius: "50%",
                                                    background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "1rem", fontWeight: "700", color: "#fff", flexShrink: 0
                                                }}>
                                                    {user.username?.[0]?.toUpperCase() || "?"}
                                                </div>
                                                <div className="ms-3 flex-grow-1">
                                                    <h6 className="mb-0 text-white">{user.username}</h6>
                                                    <small style={{ color: "rgba(255,255,255,0.4)" }}>{user.email}</small>
                                                </div>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => handleSendRequest(user.id)}
                                                    disabled={sentRequests.has(user.id) || sendingRequestId === user.id}
                                                    style={{
                                                        background: sentRequests.has(user.id) 
                                                            ? "rgba(255,255,255,0.1)" 
                                                            : "linear-gradient(135deg, var(--color-base-dark-orange), #c76a2a)",
                                                        color: sentRequests.has(user.id) ? "rgba(255,255,255,0.5)" : "#fff",
                                                        border: "none",
                                                        borderRadius: "10px",
                                                        padding: "8px 16px",
                                                        fontWeight: "600",
                                                        minHeight: "44px",
                                                        minWidth: "80px",
                                                        transition: "all 0.3s ease"
                                                    }}
                                                >
                                                    {sendingRequestId === user.id ? (
                                                        <span className="spinner-border spinner-border-sm"></span>
                                                    ) : sentRequests.has(user.id) ? (
                                                        <><i className="fas fa-check me-1"></i> Sent</>
                                                    ) : (
                                                        <><i className="fas fa-user-plus me-1"></i> Add</>
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* No Results Found */}
                                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                    <div className="mt-3 text-center p-4" style={{
                                        background: "rgba(255,255,255,0.02)",
                                        borderRadius: "12px",
                                        border: "1px dashed rgba(255,255,255,0.1)"
                                    }}>
                                        <i className="fas fa-user-xmark mb-2" style={{ fontSize: "2rem", color: "rgba(255,255,255,0.2)" }}></i>
                                        <p className="mb-0" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
                                            No users found for "{searchQuery}"
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Invite by Link/Email section */}
                            <div className="stat-card p-4" style={{ borderRadius: "18px" }}>
                                <h6 className="text-white fw-bold mb-3">
                                    <i className="fas fa-link me-2" style={{ color: "var(--color-base-dark-orange)" }}></i>
                                    Invite by Link or Email
                                </h6>
                                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", marginBottom: "16px" }}>
                                    Generate a link or send an email invitation to connect.
                                </p>
                                <div className="d-flex gap-2 mb-3">
                                    <input
                                        type="email"
                                        placeholder="Email (optional)"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="form-control flex-grow-1 splitty-input-search"
                                        style={{
                                            background: "rgba(255,255,255,0.06)",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "12px",
                                            color: "#fff",
                                            padding: "12px 16px",
                                            minHeight: "48px",
                                        }}
                                    />
                                    <button
                                        className="btn"
                                        onClick={handleGenerateLink}
                                        disabled={inviteSending}
                                        style={{
                                            background: "linear-gradient(135deg, var(--color-base-dark-orange), #c76a2a)",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "12px",
                                            padding: "12px 20px",
                                            fontWeight: "600",
                                            minHeight: "48px",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        {inviteSending ? (
                                            <span className="spinner-border spinner-border-sm"></span>
                                        ) : (
                                            <><i className="fas fa-paper-plane me-2"></i>{inviteEmail ? "Send" : "Generate"}</>
                                        )}
                                    </button>
                                </div>

                                {/* Generated Link */}
                                {inviteLink && (
                                    <div className="d-flex align-items-center gap-2 p-3" style={{
                                        background: "rgba(74,222,128,0.05)",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(74,222,128,0.15)"
                                    }}>
                                        <input
                                            type="text"
                                            value={inviteLink}
                                            readOnly
                                            className="form-control flex-grow-1"
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: "rgba(255,255,255,0.7)",
                                                fontSize: "0.85rem",
                                                padding: "0"
                                            }}
                                        />
                                        <button
                                            className="btn btn-sm"
                                            onClick={handleCopyLink}
                                            style={{
                                                color: "#4ade80",
                                                background: "rgba(74,222,128,0.15)",
                                                border: "none",
                                                borderRadius: "8px",
                                                padding: "8px 12px",
                                                minHeight: "44px"
                                            }}
                                        >
                                            <i className="fas fa-copy"></i>
                                        </button>
                                    </div>
                                )}

                                {/* Success feedback */}
                                {inviteSuccess && (
                                    <div className="mt-3 text-center" style={{ color: "#4ade80", fontSize: "0.9rem" }}>
                                        {inviteSuccess}
                                    </div>
                                )}
                            </div>
                        </FadeContent>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FriendsPage;
