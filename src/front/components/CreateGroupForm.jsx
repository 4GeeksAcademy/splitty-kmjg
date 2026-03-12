import React,{useState} from "react";
import useGlobalReducer from '../hooks/useGlobalReducer';
import '../index.css'

export const CreateGroupForm = () => {
    
    const { actions } = useGlobalReducer();
    const [formData, setFormData] = useState({ name: '', category: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.category) {
            setMessage({ type: 'danger', text: 'Por favor, completa todos los campos.' });
            return;
        }

        const response = await actions.createGroup(formData);

        if (response.success) {
            setMessage({ type: 'success', text: '¡Grupo creado con éxito!' });
            setFormData({ name: '', category: '' }); 
        } else {
            setMessage({ type: 'danger', text: response.error || 'Error al crear el grupo' });
        }
    };

    return (
        <div className="form-wrapper">
            <div className="splitty-card">
                <h2 className="splitty-title">Crear Nuevo Grupo</h2>
                
                {message.text && (
                    <div className={`splitty-alert splitty-alert-${message.type}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="name" className="splitty-label">Nombre del Grupo</label>
                        <input
                            type="text"
                            className="splitty-input"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej. Viaje a Londres"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="category" className="splitty-label">Categoría</label>
                        <select
                            className="splitty-input"
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            required
                        >
                            <option value="" disabled>Selecciona una categoría</option>
                            <option value="Viajes">Viajes</option>
                            <option value="Hogar">Hogar</option>
                            <option value="Comida">Comida</option>
                            <option value="Entretenimiento">Entretenimiento</option>
                            <option value="Otros">Otros</option>
                        </select>
                    </div>

                    <button type="submit" className="splitty-btn">
                        Crear Grupo
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupForm