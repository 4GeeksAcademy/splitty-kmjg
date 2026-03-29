import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";

/**
 * Component that resets scroll position to (0,0) on every route change.
 * It uses the useLocation hook to detect changes in the URL.
 */
const ScrollToTop = ({ children }) => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return children;
};

ScrollToTop.propTypes = {
    children: PropTypes.any
};

export default ScrollToTop;