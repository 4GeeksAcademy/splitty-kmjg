import React, { useState } from "react";

export const ReceiptViewerLightbox = ({ isOpen, onClose, fileUrl, fileType }) => {
    const [isZoomed, setIsZoomed] = useState(false);

    if (!isOpen) return null;

    const toggleZoom = (e) => {
        e.stopPropagation();
        setIsZoomed(!isZoomed);
    };

    const isPdf = fileType === "application/pdf" || (fileUrl && fileUrl.toLowerCase().endsWith(".pdf"));

    return (
        <div 
            className="receipt-lightbox"
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1060,
                background: "rgba(22, 19, 17, 0.95)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                animation: "fadeIn 0.2s ease-out"
            }}
        >
            <div className="d-flex justify-content-between w-100 p-4 position-absolute top-0" style={{ zIndex: 1061 }}>
                <span className="splitty-gradient-text" style={{ fontWeight: 800, fontSize: "1.2rem", letterSpacing: "1px" }}>
                    RECEIPT
                </span>
                <button 
                    type="button" 
                    className="btn-close btn-close-white opacity-75" 
                    onClick={onClose}
                    style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
                ></button>
            </div>

            <div 
                className="lightbox-content"
                style={{
                    width: "100%",
                    height: "80%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px",
                    overflow: isZoomed ? "auto" : "hidden"
                }}
            >
                {isPdf ? (
                    <div className="text-center">
                        <i className="fa-solid fa-file-pdf mb-3" style={{ fontSize: "5rem", color: "var(--color-base-orange)" }}></i>
                        <h4 className="text-white mb-4">PDF Document</h4>
                        <a 
                            href={fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="splitty-btn px-4 text-decoration-none"
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: "inline-block" }}
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square me-2"></i> Open PDF
                        </a>
                    </div>
                ) : (
                    <img 
                        src={fileUrl} 
                        alt="Receipt Full View" 
                        onClick={toggleZoom}
                        style={{
                            maxWidth: isZoomed ? "none" : "100%",
                            maxHeight: isZoomed ? "none" : "100%",
                            width: isZoomed ? "200%" : "auto",
                            objectFit: "contain",
                            transition: "all 0.3s cubic-bezier(0.2, 0, 0, 1)",
                            cursor: isZoomed ? "zoom-out" : "zoom-in",
                            borderRadius: isZoomed ? "0" : "8px",
                            boxShadow: isZoomed ? "none" : "0 10px 40px rgba(0,0,0,0.5)",
                            transformOrigin: "center center"
                        }}
                    />
                )}
            </div>

            {!isPdf && (
                <div className="position-absolute bottom-0 pb-5 text-center w-100" style={{ pointerEvents: "none", zIndex: 1061 }}>
                    <span style={{ 
                        background: "rgba(0,0,0,0.6)", 
                        color: "var(--color-base-cream)", 
                        padding: "8px 16px", 
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        backdropFilter: "blur(4px)"
                    }}>
                        <i className="fa-solid fa-magnifying-glass-plus me-2"></i>
                        Tap to {isZoomed ? "zoom out" : "zoom in"}
                    </span>
                </div>
            )}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ReceiptViewerLightbox;
