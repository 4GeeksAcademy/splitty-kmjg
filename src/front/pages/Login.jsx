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

    const [result] = await Promise.all([
      actions.login(email, password),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);

    if (result.ok) {
      navigate("/");
    } else {
      setError(result.error || "Login failed. Please check your credentials and try again.");
      setShakeKey(k => k + 1);
      setLoading(false);
    }
  };

  if (loading) {
      return <Loading />; 
  }

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center px-3"
      style={{
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2c1308 100%)"
      }}
    >
      <div
        className="w-100"
        style={{
          maxWidth: "440px"
        }}
      >
        <div
          className="card border-0 shadow-lg"
          style={{
            borderRadius: "24px",
            background: "#f8f5f2"
          }}
        >
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4 d-flex align-items-center justify-content-start flex-column gap-1">
              <SplittyBrand2 width="50%" color="var(--color-base-dark)" contrast="var(--color-base-dark-orange)" />
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
                <label
                  className="form-label fw-semibold"
                  style={{ color: "var(--color-base-dark)" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  className="form-control border-0 shadow-sm"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  style={{
                    height: "50px",
                    borderRadius: "14px",
                    backgroundColor: "var(--color-base-light)"
                  }}
                />
              </div>

              <div className="mb-2">
                <label
                  className="form-label fw-semibold"
                  style={{ color: "var(--color-base-dark)" }}
                >
                  Password
                </label>
                <input
                  type="password"
                  className="form-control border-0 shadow-sm"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  style={{
                    height: "50px",
                    borderRadius: "14px",
                    backgroundColor: "var(--color-base-light)"
                  }}
                />
              </div>

              <div className="d-flex justify-content-end mb-4">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none"
                  style={{
                    color: "var(--color-base-dark-orange)",
                    fontWeight: "600",
                    fontSize: "0.92rem"
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div
                  key={shakeKey}
                  role="alert"
                  className="d-flex align-items-center gap-2 border-0 mb-4"
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
              )}

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

            <div className="text-center mt-4">
              <span style={{ color: "#7a6f67" }}>
                Don’t have an account?{" "}
              </span>
              <Link
                to="/register"
                className="text-decoration-none fw-semibold"
                style={{ color: "var(--color-base-dark-orange)" }}
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};