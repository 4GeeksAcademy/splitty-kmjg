import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    ci: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setSuccess("");
    setLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      const resp = await fetch(`${backendUrl}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || "No se pudo crear la cuenta");
        return;
      }

      setSuccess("Cuenta creada correctamente. Ahora inicia sesión.");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
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
                Create your account and start splitting smarter
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: "#2a2a2a" }}>
                  Username
                </label>
                <input
                  type="text"
                  className="form-control border-0 shadow-sm"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  required
                  style={{
                    height: "50px",
                    borderRadius: "14px",
                    backgroundColor: "#ffffff"
                  }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: "#2a2a2a" }}>
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
                <label className="form-label fw-semibold" style={{ color: "#2a2a2a" }}>
                  Password
                </label>
                <input
                  type="password"
                  className="form-control border-0 shadow-sm"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  required
                  style={{
                    height: "50px",
                    borderRadius: "14px",
                    backgroundColor: "#ffffff"
                  }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: "#2a2a2a" }}>
                  CI
                </label>
                <input
                  type="text"
                  className="form-control border-0 shadow-sm"
                  name="ci"
                  value={formData.ci}
                  onChange={handleChange}
                  placeholder="Enter your CI"
                  required
                  style={{
                    height: "50px",
                    borderRadius: "14px",
                    backgroundColor: "#ffffff"
                  }}
                />
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

              {success && (
                <div
                  className="alert border-0"
                  style={{
                    backgroundColor: "#e6f6ea",
                    color: "#1f6b35",
                    borderRadius: "14px"
                  }}
                >
                  {success}
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
                {loading ? "Creating account..." : "Sign up"}
              </button>
            </form>

            <div className="text-center mt-4">
              <span style={{ color: "#7a6f67" }}>
                Already have an account?{" "}
              </span>
              <Link
                to="/login"
                className="text-decoration-none fw-semibold"
                style={{ color: "#b65a1b" }}
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};