import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "./api";
import styles from "./Signup.module.css";

interface FormState {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

interface FormErrors {
  non_field?: string;
  username?: string[];
  email?: string[];
  password?: string[];
  confirm_password?: string[];
  [key: string]: string | string[] | undefined;
}

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Signup() {
  const [form, setForm] = useState<FormState>({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm]   = useState<boolean>(false);
  const [loading, setLoading]           = useState<boolean>(false);
  const [errors, setErrors]             = useState<FormErrors>({});
  const [success, setSuccess]           = useState<string>("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccess("");

    try {
      await API.post("register/", form);
      setSuccess("Account created! Redirecting to login…");
      setTimeout(() => { navigate("/login"); }, 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: unknown } };
      const data = error.response?.data;
      if (data && typeof data === "object") {
        setErrors(data as FormErrors);
      } else {
        setErrors({ non_field: "Something went wrong. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.glow1} />
      <div className={styles.glow2} />

      <div className={styles.card}>
        <div className={styles.brand}>Clarity</div>
        <div className={styles.subtitle}>Create your account</div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className={styles.form}>
          {errors.non_field && <div className={styles.errorBox}>{errors.non_field}</div>}
          {success && <div className={styles.successBox}>{success}</div>}

          {/* Username */}
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              name="username"
              placeholder="Choose a username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              className={`${styles.input} ${errors.username ? styles.inputError : ""}`}
              required
            />
            {errors.username && <span className={styles.fieldError}>{errors.username[0]}</span>}
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
            />
            {errors.email && <span className={styles.fieldError}>{errors.email[0]}</span>}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                className={`${styles.input} ${styles.inputWithToggle} ${errors.password ? styles.inputError : ""}`}
                required
              />
              <button type="button" className={styles.toggleBtn} onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <span className={styles.fieldError}>{errors.password[0]}</span>}
          </div>

          {/* Confirm Password */}
          <div className={styles.field}>
            <label className={styles.label}>Confirm Password</label>
            <div className={styles.inputWrap}>
              <input
                type={showConfirm ? "text" : "password"}
                name="confirm_password"
                placeholder="Repeat your password"
                value={form.confirm_password}
                onChange={handleChange}
                autoComplete="new-password"
                className={`${styles.input} ${styles.inputWithToggle} ${errors.confirm_password ? styles.inputError : ""}`}
                required
              />
              <button type="button" className={styles.toggleBtn} onClick={() => setShowConfirm((v) => !v)}>
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirm_password && <span className={styles.fieldError}>{errors.confirm_password[0]}</span>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading && <span className={styles.spinner} />}
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div className={styles.divider}><span>already have an account?</span></div>
        <Link to="/login" className={styles.loginLink}>Sign in instead</Link>
      </div>
    </div>
  );
}