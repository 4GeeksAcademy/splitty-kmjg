import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from 'gsap';
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import FadeContent from '../components/bits/FadeContent.jsx';
import SplitText from '../components/bits/SplitText.jsx';
import CountUp from '../components/bits/CountUp.jsx';
import SplittyLogo from "../logos/SplittyLogo.jsx";


export const Welcome = () => {
    const { store } = useGlobalReducer();
    const cutRef = useRef(null);
    const listRef = useRef(null);
    const progressRef = useRef(null);

    const splits = [
        { name: "Marco paid dinner", type: "Shared equally", price: "$48" },
        { name: "Josue paid gas", type: "Split by percentages", price: "$32" },
        { name: "Gustavo paid snacks", type: "Custom split", price: "$18" }
    ];
    // Array with the info for each feature card
    const featureCards = [
        {
            title: "Groups",
            text: "Create expense groups for trips, rent or daily life.",
            link: "/create-group"
        },
        {
            title: "Balances",
            text: "See who owes what without manual math.",
            link: "#"
        },
        {
            title: "Settle up",
            text: "Keep payments simple and avoid messy debt.",
            link: "#" 
        }
    ];

    // Animation functions
    useEffect(() => {
        // 1. Animation for the "Split" span
        gsap.fromTo(cutRef.current,
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 1.25, ease: 'power3.out', delay: 0.1 }
        );

        // 2. Animation for transactions (Stagger)
        if (listRef.current) {
            const items = listRef.current.querySelectorAll('.transaction-item');
            gsap.fromTo(items,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", stagger: 0.15, delay: 0.8 }
            );
        }

        // 3. Animation for the Progress Bar
        if (progressRef.current) {
            gsap.fromTo(progressRef.current,
                { width: "0%" }, // Starts empty
                {
                    width: "65%", // Fills up to the desired value
                    duration: 1.5,
                    ease: "power2.inOut",
                    delay: 1.4 // Starts after transactions finish
                }
            );
        }
    }, []);

    

    return (
        <div className="min-vh-100 d-flex align-items-start" style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2c1308 100%)" }}>
            <div className="container mt-5 py-5">
                <div className="row align-items-start mt-1 g-5">
                    {/* Left Column */}
                    <div className="col-12 col-lg-6">
                        <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0} className="d-inline-block mb-3 px-3 py-2" style={{ borderRadius: "999px", background: "rgba(255,255,255,0.08)", color: "var(--color-base-light)", fontSize: "1rem", border: "1px solid rgba(255,255,255,0.08)" }}>
                            Smart shared expense tracking
                        </FadeContent>

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
                                    <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0} className="btn" style={{ background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)", color: "var(--color-base-light)", borderRadius: "14px", padding: "12px 24px", fontWeight: "700", border: "none" }}>
                                        Go to app
                                    </FadeContent>
                                </Link>
                            ) : (
                                <>
                                    <Link to="/register" className="text-decoration-none">
                                        <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0} className="btn" style={{ background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)", color: "var(--color-base-light)", borderRadius: "14px", padding: "12px 24px", fontWeight: "700", border: "none" }}>
                                            Get started
                                        </FadeContent>
                                    </Link>
                                    <Link to="/login" className="text-decoration-none">
                                        <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0} className="btn" style={{ background: "transparent", color: "var(--color-base-light)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "14px", padding: "12px 24px", fontWeight: "700" }}>
                                            Log in
                                        </FadeContent>
                                    </Link>
                                </>
                            )}
                        </div>
                        {/* Feature cards */}
                        <div className="row g-3 mt-1">
                            {featureCards.map((card, i) => (
                                <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0} key={i} className="col-12 col-sm-4">

                                    {/* React Router logic here */}
                                    <Link to={card.link} style={{ textDecoration: 'none' }}>
                                        <div
                                            className="p-3 h-100"
                                            style={{
                                                background: "rgba(255,255,255,0.06)",
                                                borderRadius: "18px",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                                cursor: "pointer" 
                                            }}
                                        >
                                            <h3 className="fw-bold mb-1" style={{ color: "var(--color-base-light)", fontSize: "1.4rem" }}>
                                                {card.title}
                                            </h3>
                                            <p className="mb-0" style={{ color: "var(--color-base-light)", fontSize: "0.9rem" }}>
                                                {card.text}
                                            </p>
                                        </div>
                                    </Link>

                                </FadeContent>
                            ))}
                        </div>
                    </div>

                    {/* Right Column (Mockup) */}
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
                                                <SplittyLogo width="6%" color="var(--color-base-dark-orange)" />
                                                {item.name}</div>
                                            <small style={{ color: "var(--color-base-dark-orange)", opacity: "60%", fontWeight: "500" }}>{item.type}</small>
                                        </div>
                                        <div className="fw-bold" style={{ color: "var(--color-base-dark)" }}>{item.price}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Balance Card with Animated Bar */}
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
                                        ref={progressRef} // GSAP Reference
                                        className="progress-bar"
                                        style={{
                                            width: "0%", // Start at 0
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

export default Welcome;