import { useState } from "react";
import { signIn, signUp } from "../api";

export default function AuthScreen({ onAuthenticated, initialError = "" }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (isSignup && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = isSignup
        ? await signUp(email, password)
        : await signIn(email, password);
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmation("");
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <p className="auth-brand">Snapshelf</p>
      <h1 id="auth-title">{isSignup ? "Create your account" : "Welcome back"}</h1>
      <p className="auth-description">
        {isSignup ? "Sign up to start organizing your images." : "Sign in to access your image shelf."}
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
          />
        </label>
        <label className="auth-field">
          Password
          <input
            type="password"
            name="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>
        {isSignup && (
          <label className="auth-field">
            Confirm password
            <input
              type="password"
              name="password-confirmation"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={8}
              required
            />
          </label>
        )}
        {error && <p className="auth-message" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="auth-switch">
        {isSignup ? "Already have an account?" : "New to Snapshelf?"}{" "}
        <button
          type="button"
          onClick={() => changeMode(isSignup ? "login" : "signup")}
        >
          {isSignup ? "Sign in" : "Create an account"}
        </button>
      </p>
    </section>
  );
}
