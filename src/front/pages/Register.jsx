import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resending, setResending] = useState(false);
  const [searchParams] = useSearchParams();

  // Auto-verify if code and email are in URL
  useEffect(() => {
    const urlEmail = searchParams.get("email");
    const urlCode = searchParams.get("code");

    if (urlEmail && urlCode && urlCode.length === 6) {
      setFormData(prev => ({ ...prev, email: urlEmail }));
      setVerificationCode(urlCode);
      setIsVerifying(true);
      
      // We need a small timeout to let the state update or just call verify directly
      const autoVerify = async () => {
        setLoading(true);
        const verifyResult = await actions.verifyEmail(urlEmail, urlCode);
        if (verifyResult.ok) {
          setSuccess("Email verified! Redirecting to login...");
          setLoading(false);
          setTimeout(() => navigate("/login"), 2000);
        } else {
          showError(verifyResult.error || "Auto-verification failed. Please check the code manually.");
          setLoading(false);
        }
      };
      autoVerify();
    }
  }, [searchParams]);

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

    if (isVerifying) {
      handleVerify();
      return;
    }

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
      setSuccess("Account created! We've sent a code to your email.");
      setIsVerifying(true);
      setLoading(false);
    } else {
      showError(regResult.error || "Sign up failed. Please check your details and try again.");
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      showError("Please enter the 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);
    const verifyResult = await actions.verifyEmail(formData.email, verificationCode);
    
    if (verifyResult.ok) {
      setSuccess("Email verified! Logging you in...");
      const loginResult = await actions.login(formData.email, formData.password);
      if (loginResult.ok) {
        navigate("/");
      } else {
        showError("Verification successful! But auto-login failed. Please log in manually.");
        setLoading(false);
        setTimeout(() => navigate("/login"), 3000);
      }
    } else {
      showError(verifyResult.error || "Verification failed. Please check the code.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    const res = await actions.resendVerificationCode(formData.email);
    if (res.ok) {
      setSuccess("Code resent successfully!");
      setTimeout(() => setSuccess(""), 5000);
    } else {
      showError(res.error || "Failed to resend code.");
    }
    setResending(false);
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
              {!isVerifying ? (
                <>
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
                </>
              ) : (
                <div className="mb-4 text-center">
                   <p className="mb-3" style={{ color: "rgba(247, 245, 251, 0.7)", fontSize: "0.95rem" }}>
                    We've sent a verification code to <br/>
                    <strong style={{ color: "var(--color-base-light)" }}>{formData.email}</strong>
                  </p>
                  
                  <label className="splitty-label text-start d-block mb-2">
                    6-Digit Code
                  </label>
                  <input
                    type="text"
                    className="splitty-input text-center"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    style={{ 
                      fontSize: "1.5rem", 
                      letterSpacing: "8px",
                      fontWeight: "bold"
                    }}
                    required
                  />
                  
                  <div className="mt-3">
                    <button 
                      type="button" 
                      onClick={handleResend}
                      disabled={resending || loading}
                      className="btn btn-link p-0 text-decoration-none"
                      style={{ 
                        color: "var(--color-base-dark-orange)",
                        fontSize: "0.85rem",
                        fontWeight: "500",
                        opacity: resending ? 0.6 : 1
                      }}
                    >
                      {resending ? "Sending..." : "Didn't receive a code? Resend"}
                    </button>
                  </div>
                </div>
              )}

              {/* Error message */}
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

              {success ? (
                <div
                  role="status"
                  className="d-flex align-items-center gap-2 mb-4"
                  style={{
                    backgroundColor: "rgba(74, 222, 128, 0.1)",
                    color: "#4ade80",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    fontSize: "0.9rem",
                    fontWeight: "500",
                    border: "1px solid rgba(74, 222, 128, 0.2)"
                  }}
                >
                  <span style={{ fontSize: "1.2rem", flexShrink: 0, color: "#4ade80" }}>
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
                {loading ? (isVerifying ? "Verifying..." : "Creating account...") : (isVerifying ? "Verify Email" : "Sign up")}
              </button>
            </form>

            <div className="text-center mt-4 pt-2">
              <span style={{ color: "rgba(247, 245, 251, 0.7)" }}>
                Already have an account?{" "}
              </span>
              <Link
                to="/login"
                className="text-decoration-none fw-semibold"
                style={{
                  color: "var(--color-base-dark-orange)",
                  transition: "opacity 0.2s"
                }}
                onMouseOver={(e) => e.target.style.opacity = "0.8"}
                onMouseOut={(e) => e.target.style.opacity = "1"}
              >
                Login
              </Link>
            </div>
      </div>
    </div>
  );
};