import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import SplittyBrand1 from "../logos/SplittyBrand1";
import { useState } from "react";
import { Loading } from "./Loading";

export const Navbar = () => {
    const { store, actions } = useGlobalReducer();
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
                <div className="container">
                    <Link to="/" className="text-decoration-none">
                        <SplittyBrand1 width="45%" color="var(--color-base-light)" contrast="var(--color-base-dark-orange)" />
                    </Link>

                    {!isAuthPage && (
                        <div className="d-flex align-items-center gap-2">
                            {store.jwt ? (
                                <>
                                    <div className="d-flex align-items-center gap-1 px-3 py-2"
                                        style={{
                                            borderRadius: "999px",
                                            background: "rgba(255,255,255,0.08)",
                                            color: "var(--color-base-light)",
                                            border: "1px solid rgba(255,255,255,0.08)"
                                        }}
                                    >
                                        <i className="bi bi-person-fill fs-3"
                                            style={{ color: "var(--color-base-dark-orange)" }}>
                                        </i>
                                        <span
                                            className="d-none d-md-inline text-center"
                                            style={{
                                                color: "var(--color-base-light)",
                                                fontSize: "1rem"
                                            }}
                                        >
                                            {store.user?.username}
                                        </span>
                                    </div>

                                    <button
                                        className="btn"
                                        onClick={handleLogout}
                                        disabled={loading}
                                        style={{
                                            background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)",
                                            color: "var(--color-base-light)",
                                            border: "none",
                                            borderRadius: "12px",
                                            padding: "8px 18px",
                                            fontWeight: "600"
                                        }}
                                    >
                                        {loading ? "Logging out..." : "Logout"}
                                    </button>
                                </>
                            ) : (
                                <div className="d-flex gap-2">
                                    <Link 
                                        to="/login"
                                        className="btn"
                                        style={{
                                            background: "transparent",
                                            color: "var(--color-base-light)",
                                            border: "1px solid rgba(255,255,255,0.18)",
                                            borderRadius: "12px",
                                            padding: "8px 18px",
                                            fontWeight: "600",
                                            textDecoration: "none"
                                        }}
                                    >
                                        Login
                                    </Link>

                                    <Link 
                                        to="/register"
                                        className="btn"
                                        style={{
                                            background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)",
                                            color: "var(--color-base-light)",
                                            border: "none",
                                            borderRadius: "12px",
                                            padding: "8px 18px",
                                            fontWeight: "600",
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