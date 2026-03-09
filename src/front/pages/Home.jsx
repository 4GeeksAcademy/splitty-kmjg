import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from 'gsap';
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import FadeContent from '../components/bits/FadeContent.jsx';
import SplitText from '../components/bits/SplitText.jsx';
import CountUp from '../components/bits/CountUp.jsx';
import SplittyLoader from "../animations/SplittyLoader.jsx";
import SplittyLogo from "../logos/SplittyLogo.jsx";
import SplittyBrand2 from "../logos/SplittyBrand2.jsx";

export const Home = () => {
	const { store } = useGlobalReducer();
	const cutRef = useRef(null);
	const listRef = useRef(null);
	const progressRef = useRef(null);

	const splits = [
		{ name: "Marco paid dinner", type: "Shared equally", price: "$48" },
		{ name: "Josue paid gas", type: "Split by percentages", price: "$32" },
		{ name: "Gustavo paid snacks", type: "Custom split", price: "$18" }
	];

	// Funciones de las animacions
	useEffect(() => {
		// 1. Animación del span "Split"
		gsap.fromTo(cutRef.current,
			{ opacity: 0, y: 40 },
			{ opacity: 1, y: 0, duration: 1.25, ease: 'power3.out', delay: 0.1 }
		);

		// 2. Animación de las transacciones (Stagger)
		if (listRef.current) {
			const items = listRef.current.querySelectorAll('.transaction-item');
			gsap.fromTo(items,
				{ opacity: 0, y: 20 },
				{ opacity: 1, y: 0, duration: 0.8, ease: "power2.out", stagger: 0.15, delay: 0.8 }
			);
		}

		// 3. Animación de la Barra de Progreso
		if (progressRef.current) {
			gsap.fromTo(progressRef.current,
				{ width: "0%" }, // Empieza vacía
				{
					width: "65%", // Se llena hasta el valor deseado
					duration: 1.5,
					ease: "power2.inOut",
					delay: 1.4 // Empieza después de que las transacciones terminen
				}
			);
		}
	}, []);

	return (
		<div className="min-vh-100 d-flex align-items-center" style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2c1308 100%)" }}>
			<div className="container py-5">
				<div className="row align-items-center g-5">
					{/* Columna Izquierda */}
					<div className="col-12 col-lg-6">
						<span className="d-inline-block mb-3 px-3 py-2" style={{ borderRadius: "999px", background: "rgba(255,255,255,0.08)", color: "var(--color-base-light)", fontSize: "0.9rem", border: "1px solid rgba(255,255,255,0.08)" }}>
							Smart shared expense tracking
						</span>

						<h1 className="fw-bold mb-3" style={{ color: "var(--color-base-light)", fontSize: "clamp(2.4rem, 6vw, 4.6rem)", lineHeight: "1.05", position: "relative" }}>
							<span ref={cutRef} className="cut-text d-inline-block" data-text="Split" style={{ verticalAlign: "middle", marginRight: "0.2rem" }}>
								Split
							</span>{" "}
							<SplitText text="expenses" delay={150} />
							<br />
							<SplitText text="without the chaos" delay={100} />
						</h1>

						{/* ... resto del contenido de texto y botones ... */}
						<div className="d-flex flex-wrap gap-3 mb-4">
							{store.jwt ? (
								<Link to="/" className="text-decoration-none">
									<button className="btn" style={{ background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)", color: "var(--color-base-light)", borderRadius: "14px", padding: "12px 24px", fontWeight: "700", border: "none" }}>
										Go to app
									</button>
								</Link>
							) : (
								<>
									<Link to="/register" className="text-decoration-none">
										<button className="btn" style={{ background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)", color: "var(--color-base-light)", borderRadius: "14px", padding: "12px 24px", fontWeight: "700", border: "none" }}>
											Get started
										</button>
									</Link>
									<Link to="/login" className="text-decoration-none">
										<button className="btn" style={{ background: "transparent", color: "var(--color-base-light)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "14px", padding: "12px 24px", fontWeight: "700" }}>
											Log in
										</button>
									</Link>
								</>
							)}
						</div>

						<div className="row g-3 mt-1">
							{["Groups", "Balances", "Settle up"].map((title, i) => (
								<div key={i} className="col-12 col-sm-4">
									<div className="p-3 h-100" style={{ background: "rgba(255,255,255,0.06)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.06)" }}>
										<h3 className="fw-bold mb-1" style={{ color: "var(--color-base-light)", fontSize: "1.4rem" }}>{title}</h3>
										<p className="mb-0" style={{ color: "var(--color-base-light)", fontSize: "0.9rem" }}>
											{i === 0 && "Create expense groups for trips, rent or daily life."}
											{i === 1 && "See who owes what without manual math."}
											{i === 2 && "Keep payments simple and avoid messy debt."}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Columna Derecha (Mockup) */}
					<FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0} className="col-12 col-lg-6">
						<div className="p-4 p-md-5 shadow-lg" style={{ background: "var(--color-base-light)", borderRadius: "28px" }}>
							<div className="d-flex justify-content-between align-items-center mb-4">
								<div>
									<h2 className="fw-bold mb-1" style={{ color: "var(--color-base-dark)", fontSize: "1.8rem" }}>Weekend Trip</h2>
									<p className="mb-0" style={{ color: "var(--color-base-light)" }}>4 members · 12 expenses</p>
								</div>
								<div className="px-3 py-2" style={{ borderRadius: "999px", background: "#f2e4d9", color: "var(--color-base-dark-orange", fontWeight: "700" }}>Active</div>
							</div>

							<div className="mb-3" ref={listRef}>
								{splits.map((item, index) => (
									<div key={index} className="transaction-item d-flex justify-content-between align-items-center p-3 mb-2 shadow" style={{ background: "var(--color-base-light)", borderRadius: "16px", opacity: 0 }}>
										<div>
											<div className="fw-semibold d-flex align-items-center justify-content-start fs-5 text-center" style={{ color: "var(--color-base-dark)" }}>
												<SplittyLogo width="6%" color="var(--color-base-dark-orange)"/>
												{item.name}</div>
											<small style={{ color: "var(--color-base-dark-orange)", opacity: "60%", fontWeight: "500" }}>{item.type}</small>
										</div>
										<div className="fw-bold" style={{ color: "var(--color-base-dark)" }}>{item.price}</div>
									</div>
								))}
							</div>

							{/* Card de Balance con Barra Animada */}
							<div className="p-4" style={{ background: "linear-gradient(90deg, #1c1c1c 0%, #2a1a12 100%)", borderRadius: "20px" }}>
								<div className="d-flex justify-content-between align-items-center mb-2">
									<span style={{ color: "var(--color-base-light)" }}>Your balance</span>
									<span style={{ color: "var(--color-base-light)", fontWeight: "700" }}>You owe $
										<CountUp from={0}
										to={14}
										separator=","
										direction="up"
										duration={1}
										className="count-up-text"
										startCounting={false}
										/>
									</span>
									
								</div>
								<div className="progress" style={{ height: "10px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
									<div
										ref={progressRef} // Referencia GSAP
										className="progress-bar"
										style={{
											width: "0%", // Empezamos en 0
											background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 50%)",
											height: "100%"
										}}
									/>
								</div>
								<small className="d-block mt-2" style={{ color: "var(--color-base-light)" }}>Track balances in real time.</small>
							</div>
						</div>
					</FadeContent>
				</div>
			</div>
		</div>
	);
};