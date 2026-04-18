import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import SplittyBrand2 from "../logos/SplittyBrand2";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    const { actions } = useGlobalReducer();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Invalid or missing token.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        const result = await actions.resetPassword(token, password);

        if (result.ok) {
            setSuccess(true);
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        } else {
            setError(result.data?.msg || "Error resetting password.");
        }
        setLoading(false);
    };

    return (
        <div className="form-wrapper">
            <div className="splitty-card mx-auto">
                <div className="text-center mb-5">
                    <SplittyBrand2 width="50%" color="var(--color-base-light)" contrast="var(--color-base-dark-orange)" />
                    <h2 className="mt-4" style={{ color: "var(--color-base-light)", fontWeight: "600" }}>
                        New Password
                    </h2>
                    <p style={{ color: "rgba(247, 245, 251, 0.6)", fontSize: "0.9rem" }}>
                        Enter your new access credentials
                    </p>
                </div>

                {!token && (
                    <div className="mb-4" style={{
                        backgroundColor: "rgba(248, 113, 113, 0.1)",
                        color: "#f87171",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        fontSize: "0.9rem",
                        border: "1px solid rgba(248, 113, 113, 0.2)"
                    }}>
                        Invalid or expired link. Please request a new one from the login screen.
                    </div>
                )}

                {success ? (
                    <div className="text-center p-4" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", borderRadius: "16px", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                        <div style={{ fontSize: "3rem", color: "#22c55e" }} className="mb-3">
                            <i className="bi bi-check-circle-fill"></i>
                        </div>
                        <h4 style={{ color: "#22c55e", fontWeight: "600" }}>Success!</h4>
                        <p style={{ color: "rgba(247, 245, 251, 0.8)", marginBottom: "0" }}>
                            Your password has been updated. You will be redirected to login in a few seconds.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="splitty-label">New Password</label>
                            <input
                                type="password"
                                className="splitty-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Robust password"
                                required
                                disabled={!token}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="splitty-label">Confirm Password</label>
                            <input
                                type="password"
                                className="splitty-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat your password"
                                required
                                disabled={!token}
                            />
                        </div>

                        {error && (
                            <div className="mb-4" style={{
                                backgroundColor: "rgba(248, 113, 113, 0.1)",
                                color: "#f87171",
                                borderRadius: "12px",
                                padding: "12px 16px",
                                fontSize: "0.9rem",
                                border: "1px solid rgba(248, 113, 113, 0.2)"
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn w-100 fw-semibold"
                            disabled={loading || !token}
                            style={{
                                height: "50px",
                                borderRadius: "14px",
                                background: "var(--splitty-gradient)",
                                color: "#fff",
                                border: "none"
                            }}
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
