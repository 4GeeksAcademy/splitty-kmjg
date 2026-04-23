import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import SplittyBrand2 from "../logos/SplittyBrand2";
import { Loading } from "../components/Loading.jsx";

export const Login = () => {
  const { dispatch, actions } = useGlobalReducer();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotData, setForgotData] = useState({
    showModal: false,
    email: "",
    error: "",
    success: "",
    loading: false
  });
  const [shakeKey, setShakeKey] = useState(0);

  const handleChange = ({ target }) => {
    const { name, value } = target;
    if (error) setError("");
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = formData.email;
    const password = formData.password;

    setError("");
    setLoading(true);

    const result = await actions.login(email, password);

    if (result.ok) {
      navigate("/");
    } else {
      setError("Login failed. Check your credentials or try again later.");
      setShakeKey(k => k + 1);
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotData(prev => ({ ...prev, loading: true, error: "", success: "" }));
    const result = await actions.forgotPassword(forgotData.email);

    if (result.success) {
      setForgotData(prev => ({ ...prev, success: "Check your email for the reset link!", loading: false }));
      setTimeout(() => {
        setForgotData(prev => ({ ...prev, showModal: false }));
      }, 3000);
    } else {
      setForgotData(prev => ({ ...prev, error: result.error, loading: false }));
    }
  };

  if (loading) {
      return <Loading />; 
  }

  return (
    <div className="form-wrapper">
      <div className="splitty-card mx-auto">
            <div className="text-center mb-5 d-flex flex-column align-items-center justify-content-center gap-2">
              <SplittyBrand2 width="50%" color="var(--color-base-light)" contrast="var(--color-base-dark-orange)" />
              <p
                className="mb-0 mt-1"
                style={{
                  color: "var(--color-base-dark-orange)",
                  fontSize: "1.05rem",
                  fontWeight: "500",
                  letterSpacing: "0.5px"
                }}
              >
                Share moments, not math
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="splitty-label">
                  Email
                </label>
                <input
                  type="email"
                  className="splitty-input"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="mb-2">
                <label className="splitty-label">
                  Password
                </label>
                <input
                  type="password"
                  className="splitty-input"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="d-flex justify-content-end mb-4">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => setForgotData(prev => ({ ...prev, showModal: true, email: formData.email }))}
                  style={{
                    color: "var(--color-base-dark-orange)",
                    fontWeight: "500",
                    fontSize: "0.9rem"
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {error ? (
                <div
                  key={shakeKey}
                  role="alert"
                  className="d-flex align-items-center gap-2 mb-4"
                  style={{
                    backgroundColor: "rgba(248, 113, 113, 0.1)",
                    color: "#f87171",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    animation: "splitty-shake 0.4s ease",
                    border: "1px solid rgba(248, 113, 113, 0.2)"
                  }}
                >
                  <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>
                    <i className="bi bi-exclamation-triangle-fill"></i>
                  </span>
                  <span>{error}</span>
                </div>
              ) : null}

              <style>{`
                @keyframes splitty-shake {
                  0%   { transform: translateX(0); }
                  20%  { transform: translateX(-6px); }
                  40%  { transform: translateX(6px); }
                  60%  { transform: translateX(-4px); }
                  80%  { transform: translateX(4px); }
                  100% { transform: translateX(0); }
                }
              `}</style>

              <button
                type="submit"
                className="btn w-100 fw-semibold"
                disabled={loading}
                style={{
                  height: "50px",
                  borderRadius: "14px",
                  background: "var(--splitty-gradient)",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(187, 77, 0, 0.2)"
                }}
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            <div className="text-center mt-4 pt-2">
              <span style={{ color: "rgba(247, 245, 251, 0.7)" }}>
                Don’t have an account?{" "}
              </span>
              <Link
                to="/register"
                className="text-decoration-none fw-semibold"
                style={{
                  color: "var(--color-base-dark-orange)",
                  transition: "opacity 0.2s"
                }}
                onMouseOver={(e) => e.target.style.opacity = "0.8"}
                onMouseOut={(e) => e.target.style.opacity = "1"}
              >
                Sign up
              </Link>
            </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotData.showModal && (
        <div 
          className="modal-overlay d-flex align-items-center justify-content-center"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1050,
            padding: "20px"
          }}
          onClick={() => setForgotData(prev => ({ ...prev, showModal: false }))}
        >
          <div 
            className="splitty-card" 
            style={{ maxWidth: "400px", width: "100%" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
               <h4 style={{ color: "var(--color-base-light)", fontWeight: "600" }}>Reset Password</h4>
               <p style={{ color: "rgba(247, 245, 251, 0.6)", fontSize: "0.9rem" }}>
                 Enter your email to receive a recovery link.
               </p>
            </div>

            {forgotData.success ? (
              <div className="text-center p-3" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", borderRadius: "12px", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#22c55e" }}>
                <i className="bi bi-check-circle-fill me-2"></i>
                {forgotData.success}
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <div className="mb-4">
                  <label className="splitty-label">Email Address</label>
                  <input
                    type="email"
                    className="splitty-input"
                    value={forgotData.email}
                    onChange={e => setForgotData(prev => ({ ...prev, email: e.target.value, error: "" }))}
                    placeholder="name@example.com"
                    required
                  />
                </div>

                {forgotData.error && (
                  <div className="mb-4" style={{ backgroundColor: "rgba(248, 113, 113, 0.1)", borderRadius: "12px", border: "1px solid rgba(248, 113, 113, 0.2)", color: "#f87171", padding: "12px", fontSize: "0.85rem" }}>
                    <i className="bi bi-exclamation-circle me-2"></i>
                    {forgotData.error}
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn w-100"
                    onClick={() => setForgotData(prev => ({ ...prev, showModal: false }))}
                    style={{
                      height: "50px",
                      borderRadius: "14px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn w-100 fw-semibold"
                    disabled={forgotData.loading}
                    style={{
                      height: "50px",
                      borderRadius: "14px",
                      background: "var(--splitty-gradient)",
                      color: "#fff",
                      border: "none"
                    }}
                  >
                    {forgotData.loading ? "Sending..." : "Send Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};