import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import SplittyBrand2 from "../logos/SplittyBrand2";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { Loading } from "../components/Loading.jsx";

export const Register = () => {
  const navigate = useNavigate();
  const { dispatch, actions } = useGlobalReducer();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleChange = ({ target }) => {
    const { name, value } = target;
    if (error) setError("");
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const showError = (msg) => {
    setError(msg);
    setShakeKey(k => k + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password, username } = formData;

    // Client-side validation
    if (username.trim().length < 2) {
      showError("Username must be at least 2 characters.");
      return;
    }
    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    setError("");
    setLoading(true);
    const regResult = await actions.register(email, password, username);
    if (regResult.ok) {
      const [loginResult] = await Promise.all([
        actions.login(email, password),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      if (loginResult.ok) {
        navigate("/");
      } else {
        showError("Account created! But auto-login failed — please log in manually.");
        setLoading(false);
        navigate("/login");
      }
    } else {
      showError(regResult.error || "Sign up failed. Please check your details and try again.");
      setLoading(false);
    }
  };

  if (loading) {
      return <Loading />; 
  }

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center px-3 my-5"
      style={{
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2c1308 100%)"
      }}
    >
      <div className="splitty-card mx-auto">
            <div className="text-center mb-4 d-flex align-items-center justify-content-start flex-column gap-1">
              <SplittyBrand2 width="50%" color="var(--color-base-light)" contrast="var(--color-base-dark-orange)" />
              <p
                className="mb-0"
                style={{
                  color: "var(--color-base-dark-orange)",
                  fontSize: "1rem"
                }}
              >
                Share moments, not math
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="splitty-label">
                  Username
                </label>
                <input
                  type="text"
                  className="splitty-input"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  required
                />
              </div>

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

              <div className="mb-4">
                <label className="splitty-label">
                  Password
                </label>
                <input
                  type="password"
                  className="splitty-input"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  required
                />
              </div>

              {/* Error message */}
              {error ? (
                <div
                  key={shakeKey}
                  role="alert"
                  className="d-flex align-items-center gap-2 mb-4"
                  style={{
                    backgroundColor: "#FFE7CD",
                    color: "#BB6D2D",
                    borderRadius: "14px",
                    padding: "12px 16px",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    lineHeight: "1.4",
                    animation: "splitty-shake 0.4s ease",
                    border: "1px solid rgba(187, 109, 45, 0.4)"
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

              {success ? (
                <div
                  role="status"
                  className="d-flex align-items-center gap-2 mb-4"
                  style={{
                    backgroundColor: "#e6f7ee",
                    color: "#1f6b35",
                    borderRadius: "14px",
                    padding: "12px 16px",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    lineHeight: "1.4",
                    border: "1px solid #a8e0bd"
                  }}
                >
                  <span style={{ fontSize: "1.2rem", flexShrink: 0, color: "#1f6b35" }}>
                    <i className="bi bi-check-circle-fill"></i>
                  </span>
                  <span>{success}</span>
                </div>
              ) : null}

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
                {loading ? "Creating account..." : "Sign up"}
              </button>
            </form>

            <div className="text-center mt-4">
              <span style={{ color: "rgba(247, 245, 251, 0.7)" }}>
                Already have an account?{" "}
              </span>
              <Link
                to="/login"
                className="text-decoration-none fw-semibold"
                style={{ color: "var(--color-base-dark-orange)" }}
              >
                Login
              </Link>
            </div>
      </div>
    </div>
  );
};