
import { useState } from "react";
import { loginUser, registerUser } from "./api";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  function changeMode(newMode) {
    setMode(newMode);
    setError("");
    setSuccess("");
    setPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (busy) return;

    setBusy(true);

    try {
      // Forgot Password
      if (mode === "forgot") {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/forgot-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email.trim(),
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to request a password reset."
          );
        }

        setSuccess(
          data.message ||
            "If an account exists for that email, a password-reset link will be sent."
        );
        return;
      }

      // Registration or Login
      let result;

      if (mode === "register") {
        result = await registerUser({
          name: name.trim(),
          email: email.trim(),
          password,
        });
      } else {
        result = await loginUser({
          email: email.trim(),
          password,
        });
      }

      if (!result.access_token || !result.user) {
        throw new Error(
          "The server returned an incomplete login response."
        );
      }

      onLogin(result.user);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">D</div>

          <div>
            <h1>DevNotes</h1>
            <p>Developer workspace</p>
          </div>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">
            {mode === "login"
              ? "WELCOME BACK"
              : mode === "register"
              ? "GET STARTED"
              : "ACCOUNT RECOVERY"}
          </p>

          <h2>
            {mode === "login"
              ? "Sign in to DevNotes"
              : mode === "register"
              ? "Create your account"
              : "Forgot your password?"}
          </h2>

          <p>
            {mode === "login"
              ? "Access your personal developer knowledge base."
              : mode === "register"
              ? "Save your code snippets and ideas in one place."
              : "Enter your registered email and we'll send you a password-reset link."}
          </p>
        </div>

        {mode !== "forgot" && (
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => changeMode("login")}
            >
              Login
            </button>

            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => changeMode("register")}
            >
              Register
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label htmlFor="auth-name">Full name</label>

              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                maxLength={100}
                autoComplete="name"
                required
              />
            </>
          )}

          <label htmlFor="auth-email">Email address</label>

          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            maxLength={255}
            autoComplete="email"
            required
          />

          {mode !== "forgot" && (
            <>
              <label htmlFor="auth-password">Password</label>

              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === "register"
                    ? "At least 8 characters"
                    : "Enter your password"
                }
                minLength={mode === "register" ? 8 : 1}
                maxLength={128}
                autoComplete={
                  mode === "register"
                    ? "new-password"
                    : "current-password"
                }
                required
              />
            </>
          )}

          {mode === "login" && (
            <div style={{ textAlign: "right", marginTop: "-8px" }}>
              <button
                type="button"
                onClick={() => changeMode("forgot")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7955e8",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "4px 0",
                }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              style={{
                padding: "12px",
                margin: "8px 0",
                borderRadius: "10px",
                background: "#ecfdf5",
                color: "#166534",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {success}
            </div>
          )}

          <button
            className="primary-btn auth-submit"
            type="submit"
            disabled={busy || Boolean(success)}
          >
            {busy
              ? "Please wait..."
              : mode === "login"
              ? "Sign in"
              : mode === "register"
              ? "Create account"
              : "Send Reset Link"}
          </button>
        </form>

        {mode === "forgot" ? (
          <p className="auth-switch">
            Remember your password?{" "}
            <button
              type="button"
              onClick={() => changeMode("login")}
            >
              Back to Login
            </button>
          </p>
        ) : (
          <p className="auth-switch">
            {mode === "login"
              ? "New to DevNotes? "
              : "Already have an account? "}

            <button
              type="button"
              onClick={() =>
                changeMode(mode === "login" ? "register" : "login")
              }
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        )}

        <p className="auth-security">
          Your notes are associated with your account.
        </p>
      </section>
    </main>
  );
}
