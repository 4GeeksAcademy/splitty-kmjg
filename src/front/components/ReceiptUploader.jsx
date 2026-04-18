import React, { useState, useRef } from "react";

export const ReceiptUploader = ({ onChange, onPreviewClick }) => {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileProcess = (file) => {
        if (file) {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setFileType(file.type);
            
            if (onChange) {
                onChange(file, url);
            }
        }
    };

    const handleFileChange = (e) => {
        handleFileProcess(e.target.files[0]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileProcess(e.dataTransfer.files[0]);
        }
    };

    const handleContainerClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="mb-4">
            <label className="splitty-label splitty-gradient-text" style={{ fontWeight: 700 }}>Receipt (Optional)</label>
            <div 
                className={`receipt-uploader-container ${isDragging ? 'dragging' : ''}`}
                onClick={handleContainerClick}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    background: isDragging ? "rgba(252, 164, 52, 0.15)" : (previewUrl ? "rgba(252, 164, 52, 0.05)" : "rgba(255, 255, 255, 0.03)"),
                    border: isDragging ? "2px dashed rgba(252, 164, 52, 0.8)" : (previewUrl ? "1px solid rgba(252, 164, 52, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)"),
                    borderRadius: "16px",
                    padding: previewUrl && !isDragging ? "8px" : "24px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "120px",
                    boxShadow: isDragging ? "0 0 25px rgba(252, 164, 52, 0.2) inset" : (previewUrl ? "0 0 20px rgba(252, 164, 52, 0.1)" : "none"),
                    transform: isDragging ? "scale(0.98)" : "scale(1)"
                }}
            >
                <input 
                    type="file"
                    accept="image/jpeg, image/png, application/pdf"
                    className="d-none"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
                
                {previewUrl ? (
                    fileType === "application/pdf" ? (
                        <div style={{ width: "100%", height: "160px", borderRadius: "12px", overflow: "hidden", position: "relative", background: "white" }}>
                            {/* Real PDF preview using iframe */}
                            <iframe 
                                src={previewUrl} 
                                style={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }} 
                                title="Receipt Preview"
                            />
                             <div 
                                style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onPreviewClick) onPreviewClick(previewUrl, fileType);
                                }}
                             >
                                 <i className="fa-solid fa-expand text-white"></i>
                             </div>
                             <div 
                                style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)", display: "flex", alignItems: "flex-end", padding: "10px", pointerEvents: "none" }}
                             >
                                 <button 
                                    className="btn p-0 border-0 text-white" 
                                    style={{ fontSize: "0.8rem", fontWeight: "600", pointerEvents: "auto" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleContainerClick();
                                    }}
                                 >
                                    <i className="fa-solid fa-file-pdf me-1"></i> PDF Attached (Tap to change)
                                 </button>
                             </div>
                         </div>
                    ) : (
                         <div style={{ width: "100%", height: "160px", borderRadius: "12px", overflow: "hidden", position: "relative" }}>
                             <img 
                                src={previewUrl} 
                                alt="Receipt Preview" 
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onPreviewClick) onPreviewClick(previewUrl, fileType);
                                }}
                             />
                             <div 
                                style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onPreviewClick) onPreviewClick(previewUrl, fileType);
                                }}
                             >
                                 <i className="fa-solid fa-expand text-white"></i>
                             </div>
                             <div 
                                style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)", display: "flex", alignItems: "flex-end", padding: "10px", pointerEvents: "none" }}
                             >
                                 <button 
                                    className="btn p-0 border-0 text-white" 
                                    style={{ fontSize: "0.8rem", fontWeight: "600", pointerEvents: "auto" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleContainerClick();
                                    }}
                                 >
                                    <i className="fa-solid fa-camera me-1"></i> Tap to change
                                 </button>
                             </div>
                         </div>
                    )
                ) : (
                    <>
                        <div className="mb-3" style={{ position: "relative" }}>
                             {/* AI Magic Badge */}
                             <div 
                                style={{
                                    position: "absolute",
                                    top: "-35px",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    background: "var(--splitty-gradient)",
                                    color: "white",
                                    padding: "4px 12px",
                                    borderRadius: "12px",
                                    fontSize: "0.7rem",
                                    fontWeight: "800",
                                    letterSpacing: "1px",
                                    textTransform: "uppercase",
                                    boxShadow: "0 4px 12px rgba(252, 164, 52, 0.4)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    zIndex: 10,
                                    whiteSpace: "nowrap"
                                }}
                             >
                                 <i className="fa-solid fa-wand-magic-sparkles"></i>
                                 AI Magic Enabled
                             </div>

                             <div style={{
                                width: "48px", height: "48px", borderRadius: "50%",
                                background: "rgba(252, 164, 52, 0.15)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                margin: "0 auto 12px"
                            }}>
                                <i className="fa-solid fa-receipt" style={{ fontSize: "1.2rem", color: "var(--color-base-orange)" }}></i>
                            </div>
                        </div>
                        <span style={{ fontSize: "0.95rem", color: "var(--color-base-cream)", fontWeight: "600", margin: "0" }}>
                            Upload Receipt to Auto-Fill
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-base-orange)", marginTop: "4px", fontWeight: "500" }}>
                            Splitty AI will read description, total and items for you! ✨
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReceiptUploader;
