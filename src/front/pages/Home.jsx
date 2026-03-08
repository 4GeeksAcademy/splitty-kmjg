import React from "react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export const Home = () => {
	const { store } = useGlobalReducer();

	return (
		<div
			className="min-vh-100 d-flex align-items-center"
			style={{
				background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2c1308 100%)"
			}}
		>
			<div className="container py-5">
				<div className="row align-items-center g-5">
					<div className="col-12 col-lg-6">
						<span
							className="d-inline-block mb-3 px-3 py-2"
							style={{
								borderRadius: "999px",
								background: "rgba(255,255,255,0.08)",
								color: "#f1e7df",
								fontSize: "0.9rem",
								border: "1px solid rgba(255,255,255,0.08)"
							}}
						>
							Smart shared expense tracking
						</span>

						<h1
							className="fw-bold mb-3"
							style={{
								color: "#f8f5f2",
								fontSize: "clamp(2.4rem, 6vw, 4.6rem)",
								lineHeight: "1.05"
							}}
						>
							Split expenses
							<br />
							without the chaos
						</h1>

						<p
							className="mb-4"
							style={{
								color: "#d7cfc8",
								fontSize: "1.08rem",
								maxWidth: "560px",
								lineHeight: "1.7"
							}}
						>
							Splitty helps friends, roommates and travel groups track shared
							expenses, calculate balances, and settle debts in a simple way.
						</p>

						<div className="d-flex flex-wrap gap-3 mb-4">
							{store.jwt ? (
								<Link to="/" className="text-decoration-none">
									<button
										className="btn"
										style={{
											background:
												"linear-gradient(90deg, #c76a2a 0%, #9f4713 100%)",
											color: "#fff",
											border: "none",
											borderRadius: "14px",
											padding: "12px 24px",
											fontWeight: "700"
										}}
									>
										Go to app
									</button>
								</Link>
							) : (
								<>
									<Link to="/register" className="text-decoration-none">
										<button
											className="btn"
											style={{
												background:
													"linear-gradient(90deg, #c76a2a 0%, #9f4713 100%)",
												color: "#fff",
												border: "none",
												borderRadius: "14px",
												padding: "12px 24px",
												fontWeight: "700"
											}}
										>
											Get started
										</button>
									</Link>

									<Link to="/login" className="text-decoration-none">
										<button
											className="btn"
											style={{
												background: "transparent",
												color: "#f8f5f2",
												border: "1px solid rgba(255,255,255,0.18)",
												borderRadius: "14px",
												padding: "12px 24px",
												fontWeight: "700"
											}}
										>
											Log in
										</button>
									</Link>
								</>
							)}
						</div>

						<div className="row g-3 mt-1">
							<div className="col-12 col-sm-4">
								<div
									className="p-3 h-100"
									style={{
										background: "rgba(255,255,255,0.06)",
										borderRadius: "18px",
										border: "1px solid rgba(255,255,255,0.06)"
									}}
								>
									<h3 className="fw-bold mb-1" style={{ color: "#f8f5f2", fontSize: "1.4rem" }}>
										Groups
									</h3>
									<p className="mb-0" style={{ color: "#cfc6bf" }}>
										Create expense groups for trips, rent, events or daily life.
									</p>
								</div>
							</div>

							<div className="col-12 col-sm-4">
								<div
									className="p-3 h-100"
									style={{
										background: "rgba(255,255,255,0.06)",
										borderRadius: "18px",
										border: "1px solid rgba(255,255,255,0.06)"
									}}
								>
									<h3 className="fw-bold mb-1" style={{ color: "#f8f5f2", fontSize: "1.4rem" }}>
										Balances
									</h3>
									<p className="mb-0" style={{ color: "#cfc6bf" }}>
										See who owes what without doing manual math.
									</p>
								</div>
							</div>

							<div className="col-12 col-sm-4">
								<div
									className="p-3 h-100"
									style={{
										background: "rgba(255,255,255,0.06)",
										borderRadius: "18px",
										border: "1px solid rgba(255,255,255,0.06)"
									}}
								>
									<h3 className="fw-bold mb-1" style={{ color: "#f8f5f2", fontSize: "1.4rem" }}>
										Settle up
									</h3>
									<p className="mb-0" style={{ color: "#cfc6bf" }}>
										Keep payments simple and avoid messy debt chains.
									</p>
								</div>
							</div>
						</div>
					</div>

					<div className="col-12 col-lg-6">
						<div
							className="p-4 p-md-5 shadow-lg"
							style={{
								background: "#f8f5f2",
								borderRadius: "28px"
							}}
						>
							<div className="d-flex justify-content-between align-items-center mb-4">
								<div>
									<h2 className="fw-bold mb-1" style={{ color: "#111", fontSize: "1.8rem" }}>
										Weekend Trip
									</h2>
									<p className="mb-0" style={{ color: "#7a6f67" }}>
										4 members · 12 expenses
									</p>
								</div>
								<div
									className="px-3 py-2"
									style={{
										borderRadius: "999px",
										background: "#f2e4d9",
										color: "#9f4713",
										fontWeight: "700"
									}}
								>
									Active
								</div>
							</div>

							<div className="mb-3">
								<div className="d-flex justify-content-between align-items-center p-3 mb-2" style={{ background: "#fff", borderRadius: "16px" }}>
									<div>
										<div className="fw-semibold" style={{ color: "#202020" }}>Marco paid dinner</div>
										<small style={{ color: "#7a6f67" }}>Shared equally</small>
									</div>
									<div className="fw-bold" style={{ color: "#111" }}>$48</div>
								</div>

								<div className="d-flex justify-content-between align-items-center p-3 mb-2" style={{ background: "#fff", borderRadius: "16px" }}>
									<div>
										<div className="fw-semibold" style={{ color: "#202020" }}>Josue paid gas</div>
										<small style={{ color: "#7a6f67" }}>Split by percentages</small>
									</div>
									<div className="fw-bold" style={{ color: "#111" }}>$32</div>
								</div>

								<div className="d-flex justify-content-between align-items-center p-3" style={{ background: "#fff", borderRadius: "16px" }}>
									<div>
										<div className="fw-semibold" style={{ color: "#202020" }}>Gustavo paid snacks</div>
										<small style={{ color: "#7a6f67" }}>Custom split</small>
									</div>
									<div className="fw-bold" style={{ color: "#111" }}>$18</div>
								</div>
							</div>

							<div
								className="p-4"
								style={{
									background: "linear-gradient(90deg, #1c1c1c 0%, #2a1a12 100%)",
									borderRadius: "20px"
								}}
							>
								<div className="d-flex justify-content-between align-items-center mb-2">
									<span style={{ color: "#d9cfc8" }}>Your balance</span>
									<span style={{ color: "#fff", fontWeight: "700" }}>
										You owe $14
									</span>
								</div>
								<div className="progress" style={{ height: "10px", background: "rgba(255,255,255,0.1)", borderRadius: "999px" }}>
									<div
										className="progress-bar"
										style={{
											width: "65%",
											background: "linear-gradient(90deg, #c76a2a 0%, #9f4713 100%)"
										}}
									></div>
								</div>
								<small className="d-block mt-2" style={{ color: "#c9bfb7" }}>
									Track balances in real time and settle faster.
								</small>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};