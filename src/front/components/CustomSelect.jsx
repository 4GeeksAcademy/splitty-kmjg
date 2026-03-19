import React, { useState, useRef, useEffect } from "react";

const CustomSelect = ({ options, value, onChange, placeholder, className, style, innerClass }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value) || (value ? null : options[0]);

    return (
        <div className={`position-relative ${className || ''}`} ref={containerRef} style={style}>
            <div 
                className={`splitty-input d-flex justify-content-between align-items-center mb-0 cursor-pointer ${innerClass || ''}`}
                style={{ cursor: "pointer", ...style }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="text-truncate">
                   {selectedOption ? selectedOption.label : <span className="opacity-50">{placeholder}</span>}
                </div>
                <i className="fa-solid fa-chevron-down opacity-50 ms-2" style={{ fontSize: "0.8rem", transition: "transform 0.3s", transform: isOpen ? "rotate(180deg)" : "none" }}></i>
            </div>
            
            {isOpen && (
                <div 
                    className="splitty-custom-select-list position-absolute start-0 w-100 z-3" 
                    style={{ top: "100%", marginTop: "8px" }}
                >
                    {options.map((opt) => (
                        <div 
                            key={opt.value}
                            className={`splitty-custom-select-option ${value === opt.value ? 'selected' : ''} ${opt.disabled ? 'opacity-50 disabled' : ''}`}
                            onClick={() => {
                                if (!opt.disabled) {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
