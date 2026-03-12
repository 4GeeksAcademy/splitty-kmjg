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

  const handleChange = ({ target }) => {
    const { name, value } = target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password, username } = formData;

    setError("");
    setLoading(true);
    const isregistered = await actions.register(email, password, username);
    if (isregistered) {
      const [islogged] = await Promise.all([
      actions.login(email, password),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);
      if (islogged) {
        navigate("/");
      } else {
        alert("Signup successful but login failed.");
        setLoading(false);
        navigate("/login");
      }
    } else {
      alert("Signup failed. Please check your credentials and try again.");
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
            background: "var(--color-base-light)"
          }}
        >
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4 d-flex align-items-center justify-content-start flex-column gap-1">
              <SplittyBrand2 width="50%" color="var(--color-base-dark)" contrast="var(--color-base-dark-orange)" />
              <p
                className="mb-0"
                style={{
                  color: "var(--color-base-dark-orange",
                  fontSize: "1rem"
                }}
              >
                Share moments, not math
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: "var(--color-base-dark)" }}>
                  Username
                </label>
                <input
                  type="text"
                  className="form-control border-0 shadow"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  required
                  style={{
                    height: "50px",
                    borderRadius: "14px",
                    backgroundColor: "var(--color-base-light)"
                  }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: "var(--color-base-dark)" }}>
                  Email
                </label>
                <input
                  type="email"
                  className="form-control border-0 shadow"
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

              <div className="mb-4">
                <label className="form-label fw-semibold" style={{ color: "var(--color-base-dark)" }}>
                  Password
                </label>
                <input
                  type="password"
                  className="form-control border-0 shadow"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  required
                  style={{
                    height: "50px",
                    borderRadius: "14px",
                    backgroundColor: "var(--color-base-light)"
                  }}
                />
              </div>

              {/* Error message */}
              {error && (
                <div
                  className="alert border-0"
                  style={{
                    backgroundColor: "#eb13132c",
                    color: "var(--color-base-dark)",
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
                    backgroundColor: "var(--color-base-light)",
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
                  background: "linear-gradient(90deg, #c76a2a 0%, var(--color-base-dark-orange) 100%)",
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
                style={{ color: "var(--color-base-dark-orange)" }}
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