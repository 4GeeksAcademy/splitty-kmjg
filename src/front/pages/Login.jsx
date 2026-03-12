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

  const handleChange = ({ target }) => {
    const { name, value } = target;
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

    const [islogged] = await Promise.all([
      actions.login(email, password),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);

    if (islogged) {
      navigate("/");
    } else {
      alert("Login failed. Please check your credentials and try again.");
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
                  color: "var(--color-base-dark-orange",
                  fontSize: "1rem"
                }}
              >
                Share moments, not math
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
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

              <div className="mb-3">
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

              <div className="d-flex justify-content-end mb-3">
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