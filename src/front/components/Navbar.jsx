import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import SplittyBrand1 from "../logos/SplittyBrand1";
import { useState } from "react";
import { Loading } from "./Loading";

export const Navbar = () => {
    const { store, dispatch, actions } = useGlobalReducer();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    const isAuthPage =
        location.pathname === "/login" || location.pathname === "/register";

    const handleLogout = async () => {
        setLoading(true);
        const logout = await actions.logout();
        if (logout) {
            navigate("/login");
        } else {
            alert("Logout failed. Please try again.");
        }
        setLoading(false);
    };

    return (
        <>
            {loading && <Loading />}
            <nav
                className="navbar navbar-expand-lg"
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1000,
                    backdropFilter: "blur(10px)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    backgroundColor: "transparent",
                    padding: "1rem 0"
                }}
            >
                <div className="container px-4">
                    <Link to="/" className="text-decoration-none flex-grow-1 flex-md-grow-0">
                        <SplittyBrand1 width="140px" color="var(--color-base-light)" contrast="var(--color-base-dark-orange)" />
                    </Link>

                    {!isAuthPage && (
                        <div className="d-flex align-items-center gap-2 gap-md-3">
                            {store.jwt ? (
                                <>
                                    <div className="d-flex align-items-center gap-2 px-3 py-2"
                                        style={{
                                            borderRadius: "999px",
                                            background: "rgba(255,255,255,0.08)",
                                            color: "var(--color-base-light)",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            display: "flex"
                                        }}
                                    >
                                        <i className="bi bi-person-fill fs-5"
                                            style={{ color: "var(--color-base-dark-orange)" }}>
                                        </i>
                                        <span
                                            className="d-none d-md-inline"
                                            style={{
                                                color: "var(--color-base-light)",
                                                fontSize: "0.95rem",
                                                fontWeight: "500"
                                            }}
                                        >
                                            {store.user?.username}
                                        </span>
                                    </div>

                                <button
                                    className="btn px-3 py-2"
                                    onClick={handleLogout}
                                    style={{
                                        background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)",
                                        color: "var(--color-base-light)",
                                        border: "none",
                                        borderRadius: "12px",
                                        fontWeight: "600",
                                        fontSize: "0.9rem"
                                    }}
                                >
                                    {loading ? "..." : "Logout"}
                                </button>
                            </>
                        ) : (
                            <div className="d-flex gap-2">
                                <Link
                                    to="/login"
                                    className="btn px-3 py-2"
                                    style={{
                                        background: "transparent",
                                        color: "var(--color-base-light)",
                                        border: "1px solid rgba(255,255,255,0.18)",
                                        borderRadius: "12px",
                                        fontWeight: "600",
                                        fontSize: "0.9rem",
                                        textDecoration: "none"
                                    }}
                                >
                                    Login
                                </Link>

                                <Link
                                    to="/register"
                                    className="btn px-3 py-2"
                                    style={{
                                        background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)",
                                        color: "var(--color-base-light)",
                                        border: "none",
                                        borderRadius: "12px",
                                        fontWeight: "600",
                                        fontSize: "0.9rem",
                                        textDecoration: "none"
                                    }}
                                >
                                    Sign up
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
        </>
    );
};