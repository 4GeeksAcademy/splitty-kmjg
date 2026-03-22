import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import SplittyBrand1 from "../logos/SplittyBrand1";
import { useState, memo } from "react";
import { Loading } from "./Loading";

export const Navbar = memo(() => {
    const { store, actions } = useGlobalReducer();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
    const isLoggedIn = !!store.jwt;

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

    // Shared styles
    const glassStyle = {
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(25px)",
        WebkitBackdropFilter: "blur(25px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)"
    };

    const gradientText = {
        background: "var(--splitty-gradient)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
    };

    return (
        <>
            {loading && <Loading />}

            {/* TOP NAVIGATION (Always visible on Desktop, visible on Mobile ONLY IF logged out) */}
            <nav
                className={`w-100 ${isLoggedIn ? "d-none d-md-block" : "d-block"}`}
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1000,
                    padding: "1rem 0",
                    background: "rgba(255, 255, 255, 0.02)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
                }}
            >
                <div className="container px-4 d-flex align-items-center justify-content-between">
                    <Link to="/" className="text-decoration-none">
                        <SplittyBrand1 width="140px" color="var(--color-base-light)" contrast="var(--color-base-dark-orange)" />
                    </Link>

                    {!isAuthPage && (
                        <div className="d-flex align-items-center gap-3">
                            {isLoggedIn ? (
                                <>
                                    <div className="d-flex align-items-center gap-2 px-4"
                                        style={{
                                            ...glassStyle,
                                            borderRadius: "24px",
                                            color: "var(--color-base-cream)",
                                            height: "48px"
                                        }}
                                    >
                                        <i className="bi bi-person-fill fs-5" style={gradientText}></i>
                                        <span style={{ fontSize: "0.95rem", fontWeight: "600", letterSpacing: "0.5px" }}>
                                            {store.user?.username}
                                        </span>
                                    </div>
                                    <button
                                        className="splitty-btn px-4 d-flex align-items-center justify-content-center m-0"
                                        onClick={handleLogout}
                                        style={{ height: "48px", borderRadius: "24px", border: "none" }}
                                    >
                                        {loading ? "..." : "Logout"}
                                    </button>
                                </>
                            ) : (
                                <div className="d-flex align-items-center gap-3">
                                    <Link
                                        to="/login"
                                        className="d-flex align-items-center justify-content-center px-4"
                                        style={{
                                            ...glassStyle,
                                            height: "48px",
                                            borderRadius: "24px",
                                            color: "var(--color-base-cream)",
                                            textDecoration: "none",
                                            fontWeight: "600",
                                            transition: "all 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="splitty-btn px-4 d-flex align-items-center justify-content-center m-0"
                                        style={{ height: "48px", borderRadius: "24px", textDecoration: "none", color: "#fff" }}
                                    >
                                        Sign up
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            {/* BOTTOM NAVIGATION DOCK (Mobile Only, Logged In Only) */}
            {isLoggedIn && !isAuthPage && (
                <>
                <style>{`
                    @media (max-width: 767.98px) {
                        body { padding-bottom: 110px !important; }
                    }
                `}</style>
                <div className="d-md-none position-fixed w-100" style={{ bottom: "2rem", zIndex: 1000, pointerEvents: "none" }}>
                    <div className="d-flex justify-content-center">
                        <div 
                            className="d-flex align-items-center justify-content-around px-2 shadow-lg"
                            style={{
                                ...glassStyle,
                                borderRadius: "999px",
                                width: "90%",
                                maxWidth: "360px",
                                pointerEvents: "auto",
                                height: "72px"
                            }}
                        >
                            {/* Dashboard / Home */}
                            <Link to="/" className="d-flex flex-column align-items-center justify-content-center text-decoration-none"
                                style={{
                                    width: "60px", height: "60px", borderRadius: "50%",
                                    background: location.pathname === "/" ? "rgba(252, 164, 52, 0.15)" : "transparent",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                <i className="bi bi-house-door-fill fs-4" style={location.pathname === "/" ? gradientText : { color: "rgba(255,255,255,0.5)" }}></i>
                                <span style={{ fontSize: "0.65rem", fontWeight: "700", marginTop: "2px", color: location.pathname === "/" ? "var(--color-base-orange)" : "rgba(255,255,255,0.5)" }}>Home</span>
                            </Link>

                            {/* Create Group (Primary Action) */}
                            <Link to="/create-group" className="d-flex flex-column align-items-center justify-content-center text-decoration-none"
                                style={{
                                    width: "56px", height: "56px", borderRadius: "50%",
                                    background: "var(--splitty-gradient)",
                                    boxShadow: "0 8px 24px rgba(252, 164, 52, 0.3)",
                                    transform: "translateY(-12px)"
                                }}
                            >
                                <i className="bi bi-plus-lg fs-2" style={{ color: "#fff" }}></i>
                            </Link>

                            {/* Profile / Logout */}
                            <div className="d-flex flex-column align-items-center justify-content-center text-decoration-none"
                                onClick={handleLogout}
                                style={{
                                    width: "60px", height: "60px", borderRadius: "50%", cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                <i className="bi bi-box-arrow-right fs-4" style={{ color: "rgba(255,255,255,0.5)" }}></i>
                                <span style={{ fontSize: "0.65rem", fontWeight: "700", marginTop: "2px", color: "rgba(255,255,255,0.5)" }}>Logout</span>
                            </div>
                        </div>
                    </div>
                </div>
                </>
            )}
        </>
    );
});

export default Navbar;