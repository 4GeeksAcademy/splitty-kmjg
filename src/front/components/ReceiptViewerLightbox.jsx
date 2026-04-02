import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

export const ReceiptViewerLightbox = ({ isOpen, onClose, fileUrl, fileType }) => {
    const [isZoomed, setIsZoomed] = useState(false);

    const handleClose = useCallback(() => {
        gsap.to(".receipt-lightbox-container", { opacity: 0, scale: 0.95, y: 20, duration: 0.3, ease: "power2.in" });
        gsap.to(".receipt-lightbox-overlay", { opacity: 0, duration: 0.3, onComplete: onClose });
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            setIsZoomed(false); // Reset zoom when opening
            gsap.fromTo(".receipt-lightbox-overlay", { opacity: 0 }, { opacity: 1, duration: 0.3 });
            gsap.fromTo(".receipt-lightbox-container", 
                { opacity: 0, scale: 0.95, y: 20 }, 
                { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "power2.out" }
            );

            const handleEsc = (e) => {
                if (e.key === "Escape") handleClose();
            };
            window.addEventListener("keydown", handleEsc);
            // Disable body scroll when open
            document.body.style.overflow = "hidden";
            
            return () => {
                window.removeEventListener("keydown", handleEsc);
                document.body.style.overflow = "auto";
            };
        }
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    const toggleZoom = (e) => {
        e.stopPropagation();
        setIsZoomed(!isZoomed);
    };

    const isPdf = fileType === "application/pdf" || (fileUrl && fileUrl.toLowerCase().endsWith(".pdf"));

    const modalContent = (
        <div 
            className="receipt-lightbox-overlay"
            onClick={handleClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(0, 0, 0, 0.15)",
                backdropFilter: "blur(25px)",
                WebkitBackdropFilter: "blur(25px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px"
            }}
        >
            <div 
                className="receipt-lightbox-container w-100 h-100 d-flex flex-column align-items-center justify-content-center position-relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="d-flex justify-content-between w-100 p-3 position-absolute top-0 start-0" style={{ zIndex: 1061 }}>
                    <span className="splitty-gradient-text" style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: "1px" }}>
                        RECEIPT
                    </span>
                    <button 
                        type="button" 
                        className="bg-transparent border-0 text-white p-2" 
                        onClick={handleClose}
                        style={{ 
                            fontSize: "1.5rem", 
                            opacity: 0.8,
                            transition: "all 0.2s ease",
                            cursor: "pointer"
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.opacity = "1";
                            e.currentTarget.style.transform = "scale(1.1)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.opacity = "0.8";
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div 
                    className="lightbox-content-wrapper w-100 d-flex align-items-center justify-content-center"
                    style={{
                        height: "85%",
                        padding: "20px",
                        overflow: isZoomed ? "auto" : "visible"
                    }}
                >
                    {isPdf ? (
                        <div style={{ width: "95vw", height: "80vh", display: "flex", flexDirection: "column", gap: "10px" }}>
                             <div style={{ flex: 1, background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
                                <iframe 
                                     src={fileUrl} 
                                     style={{ width: "100%", height: "100%", border: "none" }} 
                                     title="PDF Receipt Content"
                                />
                             </div>
                             <div className="text-center">
                                 <a 
                                    href={fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="splitty-btn px-4 text-decoration-none"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ display: "inline-block" }}
                                 >
                                    <i className="fa-solid fa-arrow-up-right-from-square me-2"></i> Open in New Tab
                                 </a>
                             </div>
                        </div>
                    ) : (
                        <div 
                            style={{ 
                                position: "relative",
                                width: isZoomed ? "100%" : "auto",
                                height: isZoomed ? "100%" : "auto",
                                textAlign: "center"
                            }}
                        >
                            <img 
                                src={fileUrl} 
                                alt="Receipt Full View" 
                                onClick={toggleZoom}
                                style={{
                                    maxWidth: isZoomed ? "none" : "90vw",
                                    maxHeight: isZoomed ? "none" : "75vh",
                                    width: isZoomed ? "auto" : "auto",
                                    objectFit: "contain",
                                    transition: "all 0.4s cubic-bezier(0.2, 0, 0, 1)",
                                    cursor: isZoomed ? "zoom-out" : "zoom-in",
                                    borderRadius: isZoomed ? "0" : "20px",
                                    boxShadow: isZoomed ? "none" : "0 30px 60px -12px rgba(0, 0, 0, 0.6)",
                                    transformOrigin: "center center",
                                    border: isZoomed ? "none" : "1px solid rgba(255,255,255,0.1)"
                                }}
                            />
                        </div>
                    )}
                </div>

                {!isPdf && (
                    <div className="mt-4 text-center" style={{ pointerEvents: "none", zIndex: 1061 }}>
                        <span style={{ 
                            background: "rgba(0,0,0,0.4)", 
                            color: "var(--color-base-cream)", 
                            padding: "8px 24px", 
                            borderRadius: "20px",
                            fontSize: "0.85rem",
                            backdropFilter: "blur(15px)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            fontWeight: "600",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                        }}>
                            <i className="fa-solid fa-magnifying-glass-plus me-2"></i>
                            Tap image to {isZoomed ? "zoom out" : "zoom in"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ReceiptViewerLightbox;


