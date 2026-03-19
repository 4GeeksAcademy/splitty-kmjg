import React from "react";
// Assumes InviteModal is located in components folder, standardizing path:
import { InviteModal } from "./InviteModal.jsx";

export const GroupDetails = ({ group }) => {
    // Safety check just in case group is not loaded yet
    if (!group) return null;

    return (
        <div className="container mt-4 dashboard-element">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="fw-bold mb-0 splitty-gradient-text" style={{ fontSize: "2rem" }}>
                    {group.name}
                </h1>
                
                {/* Button that opens the invite modal */}
                <button 
                    className="splitty-btn-sm d-flex align-items-center" 
                    data-bs-toggle="modal" 
                    data-bs-target="#inviteModal"
                    style={{ padding: "8px 20px", fontSize: "0.9rem" }}
                >
                    <i className="fa-solid fa-user-plus me-2"></i> 
                    Invite Friend
                </button>
            </div>

            {/* ... members list or other group detail data ... */}
            <div className="splitty-card w-100 p-4 mb-4">
                <h4 className="fw-bold mb-3 splitty-gradient-text d-flex align-items-center">
                    <i className="fa-solid fa-users me-2 text-warning fs-5"></i> Group Members
                </h4>
                <p style={{ color: "var(--color-base-cream)" }}>
                    {/* Placeholder for member listing logic */}
                    The list of participating members will appear here.
                </p>
            </div>

            {/* RENDER MODAL AT THE END (outside of main layout flow) */}
            <InviteModal groupId={group.id} groupName={group.name} />
        </div>
    );
};

export default GroupDetails;