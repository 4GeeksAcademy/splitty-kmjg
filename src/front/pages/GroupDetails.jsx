import { InviteModal } from "../component/InviteModal.jsx";

// ... dentro del componente de tu página:
return (
    <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center">
            <h1>{group.name}</h1>
            
            {/* ESTE ES EL BOTÓN QUE ABRE EL MODAL */}
            <button 
                className="btn btn-outline-success" 
                data-bs-toggle="modal" 
                data-bs-target="#inviteModal"
            >
                <i className="fas fa-user-plus"></i> Invitar Amigo
            </button>
        </div>

        {/* ... lista de miembros ... */}

        {/* RENDERIZAMOS EL MODAL AL FINAL (fuera del flujo principal) */}
        <InviteModal groupId={group.id} groupName={group.name} />
    </div>
);