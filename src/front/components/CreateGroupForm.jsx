import React,{useState} from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from '../hooks/useGlobalReducer';
import '../index.css'
import FadeContent from "./bits/FadeContent.jsx";

export const CreateGroupForm = () => {
    const navigate = useNavigate();
    const { actions } = useGlobalReducer();
    const [formData, setFormData] = useState({ name: '', category: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: 'loading', text: 'Creating group...' });
        if (!formData.name || !formData.category) {
            setMessage({ type: 'danger', text: 'Please fill in all fields.' });
            setLoading(false);
            return;
        }

        const response = await actions.createGroup(formData);
        setLoading(false);

        if (response.success) {
            setMessage({ type: 'success', text: 'Group created successfully!' });
            setFormData({ name: '', category: '' }); 
            setTimeout(() => {
                navigate('/');
            }, 1500);
        } else {
            setMessage({ type: 'danger', text: response.error || 'Error creating group' });
        };
    };

    return (
        <FadeContent blur={true} duration={1200} easing="ease-out" initialOpacity={0} className="form-wrapper">
            <div className="splitty-card">
                <h2 className="splitty-title">Create New Group</h2>
                
                {message.text && (
                    <div className={`splitty-alert splitty-alert-${message.type}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="name" className="splitty-label">Group Name</label>
                        <input
                            type="text"
                            className="splitty-input"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. London Trip"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="category" className="splitty-label">Category</label>
                        <select
                            className="splitty-input"
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            required
                        >
                            <option value="" disabled>Select a category</option>
                            <option value="Travel">Travel</option>
                            <option value="Home">Home</option>
                            <option value="Food">Food</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <button type="submit" className="splitty-btn" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Group'}
                    </button>
                </form>
            </div>
        </FadeContent>
    );
};

export default CreateGroupForm