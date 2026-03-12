import React from "react";
import SplittyLoader from "../animations/SplittyLoader.jsx";

// Simple full‑screen loader that uses the same background gradient as Home.
// It is meant to be rendered while the app or a particular page is fetching
// data. The `<SplittyLoader />` component is placed in the center.
// `fade` prop triggers a brief 100 ms ease‑out opacity transition before
// the loader disappears.
export const Loading = ({ fade = false }) => {
    const gradient =
        "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2c1308 100%)";

    const style = {
        background: gradient,
        opacity: fade ? 0 : 1,
        transition: "opacity 400ms ease-out",
    };

    return (
        <div
            className="d-flex justify-content-center align-items-center min-vh-100"
            style={style}
        >
            <SplittyLoader />
        </div>
    );
};
