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
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    background: "rgba(22, 19, 17, 0.6)",
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
                                    <div className="d-flex align-items-center gap-2 px-4"
                                        style={{
                                            borderRadius: "24px",
                                            background: "rgba(57, 52, 49, 0.2)",
                                            backdropFilter: "blur(20px)",
                                            WebkitBackdropFilter: "blur(20px)",
                                            color: "var(--color-base-cream)",
                                            display: "flex",
                                            height: "48px"
                                        }}
                                    >
                                        <i className="bi bi-person-fill fs-5"
                                            style={{ color: "var(--color-base-dark-orange)" }}>
                                        </i>
                                        <span
                                            className="d-none d-md-inline"
                                            style={{
                                                color: "var(--color-base-cream)",
                                                fontSize: "0.95rem",
                                                fontWeight: "500"
                                            }}
                                        >
                                            {store.user?.username}
                                        </span>
                                    </div>

                                <button
                                    className="btn px-4 d-flex align-items-center justify-content-center"
                                    onClick={handleLogout}
                                    style={{
                                        background: "var(--splitty-gradient)",
                                        color: "var(--color-base-light)",
                                        border: "none",
                                        borderRadius: "24px",
                                        fontWeight: "700",
                                        fontSize: "0.95rem",
                                        height: "48px",
                                        transition: "transform 0.2s ease, opacity 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.96)"}
                                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                                >
                                    {loading ? "..." : "Logout"}
                                </button>
                            </>
                        ) : (
                            <div className="d-flex gap-2">
                                <Link
                                    to="/login"
                                    className="btn px-4 d-flex align-items-center justify-content-center"
                                    style={{
                                        background: "rgba(57, 52, 49, 0.2)",
                                        backdropFilter: "blur(20px)",
                                        WebkitBackdropFilter: "blur(20px)",
                                        color: "var(--color-base-cream)",
                                        border: "none",
                                        borderRadius: "24px",
                                        fontWeight: "600",
                                        fontSize: "0.95rem",
                                        textDecoration: "none",
                                        height: "48px",
                                        transition: "transform 0.2s ease, background 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(57, 52, 49, 0.3)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(57, 52, 49, 0.2)"}
                                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.96)"}
                                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                                >
                                    Login
                                </Link>

                                <Link
                                    to="/register"
                                    className="btn px-4 d-flex align-items-center justify-content-center"
                                    style={{
                                        background: "var(--splitty-gradient)",
                                        color: "var(--color-base-light)",
                                        border: "none",
                                        borderRadius: "24px",
                                        fontWeight: "700",
                                        fontSize: "0.95rem",
                                        textDecoration: "none",
                                        height: "48px",
                                        transition: "transform 0.2s ease, opacity 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.96)"}
                                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
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