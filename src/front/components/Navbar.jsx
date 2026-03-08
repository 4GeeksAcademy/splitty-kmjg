import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const Navbar = () => {
	const { store, dispatch } = useGlobalReducer();
	const navigate = useNavigate();
	const location = useLocation();

	const isAuthPage =
		location.pathname === "/login" || location.pathname === "/register";

	const handleLogout = async () => {
		try {
			const token = store.jwt || localStorage.getItem("token");
			const backendUrl = import.meta.env.VITE_BACKEND_URL;

			if (token) {
				await fetch(`${backendUrl}/api/logout`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`
					}
				});
			}
		} catch (error) {
			console.error("Error al cerrar sesión:", error);
		} finally {
			localStorage.removeItem("token");
			localStorage.removeItem("user_email");
			dispatch({ type: "UNSET_USER" });
			navigate("/login");
		}
	};

	return (
		<nav
			className="navbar navbar-expand-lg px-3 px-md-4"
			style={{
				background: "rgba(15, 15, 15, 0.92)",
				backdropFilter: "blur(10px)",
				borderBottom: "1px solid rgba(255,255,255,0.08)"
			}}
		>
			<div className="container">
				<Link to="/" className="text-decoration-none">
					<span
						className="navbar-brand mb-0 fw-bold"
						style={{
							color: "#f8f5f2",
							fontSize: "1.6rem",
							letterSpacing: "0.5px"
						}}
					>
						Splitty
					</span>
				</Link>

				{!isAuthPage && (
					<div className="d-flex align-items-center gap-2">
						{store.jwt ? (
							<>
								<span
									className="d-none d-md-inline"
									style={{
										color: "#d7cfc8",
										fontSize: "0.95rem"
									}}
								>
									{store.user?.email}
								</span>

								<button
									className="btn"
									onClick={handleLogout}
									style={{
										background: "linear-gradient(90deg, #c76a2a 0%, #9f4713 100%)",
										color: "#fff",
										border: "none",
										borderRadius: "12px",
										padding: "8px 18px",
										fontWeight: "600"
									}}
								>
									Logout
								</button>
							</>
						) : (
							<div className="d-flex gap-2">
								<Link to="/login">
									<button
										className="btn"
										style={{
											background: "transparent",
											color: "#f8f5f2",
											border: "1px solid rgba(255,255,255,0.18)",
											borderRadius: "12px",
											padding: "8px 18px",
											fontWeight: "600"
										}}
									>
										Login
									</button>
								</Link>

								<Link to="/register">
									<button
										className="btn"
										style={{
											background: "linear-gradient(90deg, #c76a2a 0%, #9f4713 100%)",
											color: "#fff",
											border: "none",
											borderRadius: "12px",
											padding: "8px 18px",
											fontWeight: "600"
										}}
									>
										Sign up
									</button>
								</Link>
							</div>
						)}
					</div>
				)}
			</div>
		</nav>
	);
};