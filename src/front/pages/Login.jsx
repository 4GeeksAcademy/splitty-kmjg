import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const Login = () => {
  const { dispatch } = useGlobalReducer();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = ({ target }) => {
    const { name, value } = target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      const resp = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || "No se pudo iniciar sesión");
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_email", formData.email);

      dispatch({ type: "SET_JWT", payload: data.access_token });
      dispatch({ type: "SET_USER", payload: { email: formData.email } });

      navigate("/");
    } catch (error) {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="text-center mb-4">
              <h1
                className="fw-bold mb-1"
                style={{
                  fontSize: "2.2rem",
                  color: "#111"
                }}
              >
                Splitty
              </h1>
              <p
                className="mb-0"
                style={{
                  color: "#7a6f67",
                  fontSize: "0.98rem"
                }}
              >
                Divide expenses easily with your group
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label
                  className="form-label fw-semibold"
                  style={{ color: "#2a2a2a" }}
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
                    backgroundColor: "#ffffff"
                  }}
                />
              </div>

              <div className="mb-3">
                <label
                  className="form-label fw-semibold"
                  style={{ color: "#2a2a2a" }}
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
                    backgroundColor: "#ffffff"
                  }}
                />
              </div>

              <div className="d-flex justify-content-end mb-3">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none"
                  style={{
                    color: "#b65a1b",
                    fontWeight: "600",
                    fontSize: "0.92rem"
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div
                  className="alert border-0"
                  style={{
                    backgroundColor: "#ffe5d6",
                    color: "#8a3f12",
                    borderRadius: "14px"
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn w-100 fw-semibold"
                disabled={loading}
                style={{
                  height: "50px",
                  borderRadius: "14px",
                  background: "linear-gradient(90deg, #c76a2a 0%, #9f4713 100%)",
                  color: "#fff",
                  border: "none"
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
                style={{ color: "#b65a1b" }}
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