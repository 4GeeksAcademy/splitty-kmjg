import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import FadeContent from "../components/bits/FadeContent.jsx";

const AcceptFriendInvite = () => {
    const { store, actions } = useGlobalReducer();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("loading"); // loading, success, error, login_required
    const [message, setMessage] = useState("");
    const [friendName, setFriendName] = useState("");

    const token = searchParams.get("token");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid invitation link. No token found.");
            return;
        }

        if (!store.jwt) {
            setStatus("login_required");
            setMessage("Please log in or create an account to accept this friend invitation.");
            // Store token for after login
            sessionStorage.setItem("pending_friend_token", token);
            return;
        }

        acceptInvite();
    }, [token, store.jwt]);

    const acceptInvite = async () => {
        setStatus("loading");
        const resp = await actions.acceptFriendInvite(token);

        if (resp.ok) {
            setStatus("success");
            setFriendName(resp.data.friend?.username || "your new friend");
            setMessage(resp.data.message || "You are now friends!");
            // Clear stored token
            sessionStorage.removeItem("pending_friend_token");
        } else {
            setStatus("error");
            setMessage(resp.data?.error || resp.data?.message || "Something went wrong");
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh", padding: "20px" }}>
            <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0}>
                <div className="stat-card p-5 text-center" style={{
                    borderRadius: "24px",
                    maxWidth: "480px",
                    width: "100%"
                }}>
                    {status === "loading" && (
                        <>
                            <div className="spinner-border mb-4" role="status" style={{ color: "var(--color-base-dark-orange)", width: "3rem", height: "3rem" }}>
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <h4 className="text-white fw-bold">Accepting invitation...</h4>
                            <p style={{ color: "rgba(255,255,255,0.5)" }}>Please wait</p>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="mb-4" style={{
                                width: "80px", height: "80px", borderRadius: "50%",
                                background: "linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.05))",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                margin: "0 auto"
                            }}>
                                <i className="fas fa-check" style={{ fontSize: "2.5rem", color: "#4ade80" }}></i>
                            </div>
                            <h3 className="text-white fw-bold mb-2">You're now friends! 🎉</h3>
                            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>
                                You and <strong style={{ color: "var(--color-base-dark-orange)" }}>{friendName}</strong> are now connected.
                            </p>
                            <button
                                className="btn mt-3"
                                onClick={() => navigate("/friends")}
                                style={{
                                    background: "linear-gradient(135deg, var(--color-base-dark-orange), #c76a2a)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "12px",
                                    padding: "12px 32px",
                                    fontWeight: "600",
                                    minHeight: "48px"
                                }}
                            >
                                <i className="fas fa-users me-2"></i>View Friends
                            </button>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="mb-4" style={{
                                width: "80px", height: "80px", borderRadius: "50%",
                                background: "rgba(248,113,113,0.15)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                margin: "0 auto"
                            }}>
                                <i className="fas fa-exclamation-triangle" style={{ fontSize: "2.5rem", color: "#f87171" }}></i>
                            </div>
                            <h3 className="text-white fw-bold mb-2">Oops!</h3>
                            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem" }}>{message}</p>
                            <button
                                className="btn mt-3"
                                onClick={() => navigate("/")}
                                style={{
                                    background: "rgba(255,255,255,0.08)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "12px",
                                    padding: "12px 32px",
                                    fontWeight: "600",
                                    minHeight: "48px"
                                }}
                            >
                                Go Home
                            </button>
                        </>
                    )}

                    {status === "login_required" && (
                        <>
                            <div className="mb-4" style={{
                                width: "80px", height: "80px", borderRadius: "50%",
                                background: "linear-gradient(135deg, rgba(252,164,52,0.2), rgba(252,164,52,0.05))",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                margin: "0 auto"
                            }}>
                                <i className="fas fa-user-lock" style={{ fontSize: "2.5rem", color: "var(--color-base-dark-orange)" }}></i>
                            </div>
                            <h3 className="text-white fw-bold mb-2">Login Required</h3>
                            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem" }}>{message}</p>
                            <div className="d-flex gap-3 justify-content-center mt-4">
                                <button
                                    className="btn"
                                    onClick={() => navigate("/login")}
                                    style={{
                                        background: "linear-gradient(135deg, var(--color-base-dark-orange), #c76a2a)",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "12px",
                                        padding: "12px 24px",
                                        fontWeight: "600",
                                        minHeight: "48px"
                                    }}
                                >
                                    Log In
                                </button>
                                <button
                                    className="btn"
                                    onClick={() => navigate("/register")}
                                    style={{
                                        background: "rgba(255,255,255,0.08)",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "12px",
                                        padding: "12px 24px",
                                        fontWeight: "600",
                                        minHeight: "48px"
                                    }}
                                >
                                    Sign Up
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </FadeContent>
        </div>
    );
};

export default AcceptFriendInvite;
