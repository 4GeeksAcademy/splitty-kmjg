import { Outlet, useNavigation } from "react-router-dom/dist";
import ScrollToTop from "../components/ScrollToTop";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Loading } from "./Loading";
import { useEffect, useState, useRef } from "react";
import { AcceptInvite } from "./AcceptInvite";

// Base component that maintains the navbar and footer throughout the page and the scroll to top functionality.
// it also shows the full‑screen <Loading /> when router navigation is in progress.
export const Layout = () => {
    const navigation = useNavigation();

    // showLoader will be true when we want the full‑screen loading view.
    // We force it visible at least 2s on mount and also for every navigation.
    const [showLoader, setShowLoader] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);
    const startTimeRef = useRef(Date.now());

    // helper to hide loader with fade
    const hideWithFade = () => {
        setFadeOut(true);
        setTimeout(() => {
            setShowLoader(false);
            setFadeOut(false);
        }, 100); // match transition duration
    };

    // initial delay on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (navigation.state !== "loading") {
                hideWithFade();
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // handle navigation state changes
    useEffect(() => {
        if (navigation.state === "loading") {
            // navigation started: show loader and record start time
            setShowLoader(true);
            startTimeRef.current = Date.now();
        } else if (showLoader) {
            // navigation finished, but ensure 2s elapsed
            const elapsed = Date.now() - startTimeRef.current;
            const remaining = Math.max(0, 2000 - elapsed);
            const timer = setTimeout(() => hideWithFade(), remaining);
            return () => clearTimeout(timer);
        }
    }, [navigation.state]);

    return (
        <ScrollToTop>
            {showLoader ? (
                <Loading fade={fadeOut} />
            ) : (
                <>
                    <Navbar />
                    <Outlet />
                    <Footer />
                </>
            )}
        </ScrollToTop>
    );
}