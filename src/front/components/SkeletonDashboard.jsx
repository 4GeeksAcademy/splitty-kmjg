import React from "react";

export const SkeletonDashboard = () => {
    return (
        <div className="container py-4 dashboard-element">
            {/* Header Skeleton */}
            <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-4 mb-5">
                <div className="d-flex align-items-center gap-2 order-2 order-md-1 flex-shrink-0">
                    <div className="skeleton-box rounded-pill" style={{ width: "100px", height: "42px" }}></div>
                    <div className="skeleton-box rounded-pill" style={{ width: "140px", height: "42px" }}></div>
                </div>
                <div className="order-1 order-md-2 text-center flex-grow-1 d-flex justify-content-center">
                    <div className="skeleton-box rounded" style={{ width: "250px", height: "45px" }}></div>
                </div>
                <div className="d-none d-md-flex justify-content-end order-3 flex-shrink-0" style={{ minWidth: "250px" }}>
                    <div className="skeleton-box rounded-pill" style={{ width: "120px", height: "40px" }}></div>
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="row g-4 align-items-stretch">
                {/* Left Col (Settle Up) */}
                <div className="col-12 col-lg-5 d-flex flex-column">
                    <div className="splitty-card h-100" style={{ padding: "2.5rem" }}>
                        <div className="skeleton-box rounded mb-4" style={{ width: "150px", height: "28px" }}></div>
                        <div className="d-flex flex-column gap-3 mt-4">
                            <div className="skeleton-box rounded" style={{ width: "100%", height: "60px" }}></div>
                            <div className="skeleton-box rounded" style={{ width: "100%", height: "60px" }}></div>
                            <div className="skeleton-box rounded" style={{ width: "100%", height: "60px" }}></div>
                        </div>
                    </div>
                </div>

                {/* Right Col (Shared Expenses) */}
                <div className="col-12 col-lg-7 d-flex flex-column">
                    <div className="splitty-card h-100" style={{ padding: "2.5rem" }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="skeleton-box rounded" style={{ width: "180px", height: "28px" }}></div>
                            <div className="skeleton-box rounded" style={{ width: "120px", height: "40px" }}></div>
                        </div>
                        <div className="d-flex flex-column gap-3">
                            <div className="skeleton-box rounded" style={{ width: "100%", height: "80px", borderRadius: "16px" }}></div>
                            <div className="skeleton-box rounded" style={{ width: "100%", height: "80px", borderRadius: "16px" }}></div>
                            <div className="skeleton-box rounded" style={{ width: "100%", height: "80px", borderRadius: "16px" }}></div>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
};
