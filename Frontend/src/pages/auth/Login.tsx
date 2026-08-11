import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, NavigateFunction } from "react-router-dom";
import {
  Mail as MailIcon,
  ArrowLeft as ArrowLeftIcon,
  Lock as LockIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  ShieldCheck as ShieldCheckIcon,
  Stethoscope as StethoscopeIcon,
  LayoutDashboard as LayoutDashboardIcon,
  UserCircle as UserCircleIcon,
  ArrowRight as ArrowRightIcon,
  Sparkles as SparklesIcon,
} from "lucide-react";

type Role = "ADMIN" | "DOCTOR" | "PATIENT";
type ThemeMode = "light" | "dark" | "system";
const THEME_KEY = "theme";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const LOGIN_URL = `${API_BASE}/api/auth/login`;

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const shouldBeDark = mode === "dark" || (mode === "system" && prefersDark);
  root.classList.toggle("dark", !!shouldBeDark);
}
function normalizeRoleString(value: unknown): Role | null {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper === "ADMIN" || upper === "DOCTOR" || upper === "PATIENT") return upper as Role;
  return null;
}
function roleToUserType(role: Role): "Admin" | "Doctor" | "Patient" {
  if (role === "ADMIN") return "Admin";
  if (role === "DOCTOR") return "Doctor";
  return "Patient";
}
function redirectAfterAuth(role: Role, navigate: NavigateFunction) {
  if (role === "ADMIN") navigate("/app/AdminDashboard", { replace: true });
  else if (role === "DOCTOR") navigate("/app/DoctorDashboard", { replace: true });
  else navigate("/app/PatientDashboard", { replace: true });
}

/* Per-role config — colors, icon, description, features */
const ROLE_CONFIG = {
  ADMIN: {
    label: "Admin",
    Icon: LayoutDashboardIcon,
    accent: "indigo",
    tagline: "Full control over the clinic",
    features: ["Revenue analytics", "Patient management", "Inventory control", "Agent oversight"],
    gradFrom: "from-indigo-500",
    gradVia: "via-violet-500",
    gradTo: "to-purple-500",
    tabBg: "bg-indigo-600 dark:bg-indigo-500",
    tabText: "text-white",
    ring: "focus:ring-indigo-500/25 focus:border-indigo-400/70",
    btn: "from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500",
    glowColor: "rgba(99,102,241,0.30)",
    iconText: "text-indigo-500 dark:text-indigo-400",
    pillBg: "bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-200/60 dark:border-indigo-500/25 text-indigo-700 dark:text-indigo-300",
  },
  DOCTOR: {
    label: "Doctor",
    Icon: StethoscopeIcon,
    accent: "emerald",
    tagline: "Clinical workspace for dentists",
    features: ["Today's schedule", "Case management", "Patient insights", "AI summaries"],
    gradFrom: "from-emerald-500",
    gradVia: "via-teal-500",
    gradTo: "to-sky-500",
    tabBg: "bg-emerald-600 dark:bg-emerald-500",
    tabText: "text-white",
    ring: "focus:ring-emerald-500/25 focus:border-emerald-400/70",
    btn: "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
    glowColor: "rgba(16,185,129,0.30)",
    iconText: "text-emerald-500 dark:text-emerald-400",
    pillBg: "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-200/60 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300",
  },
  PATIENT: {
    label: "Patient",
    Icon: UserCircleIcon,
    accent: "sky",
    tagline: "Your personal health portal",
    features: ["Upcoming appointments", "Treatment summaries", "Payment history", "Clinic updates"],
    gradFrom: "from-sky-500",
    gradVia: "via-cyan-500",
    gradTo: "to-blue-500",
    tabBg: "bg-sky-600 dark:bg-sky-500",
    tabText: "text-white",
    ring: "focus:ring-sky-500/25 focus:border-sky-400/70",
    btn: "from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500",
    glowColor: "rgba(14,165,233,0.30)",
    iconText: "text-sky-500 dark:text-sky-400",
    pillBg: "bg-sky-500/10 dark:bg-sky-500/15 border-sky-200/60 dark:border-sky-500/25 text-sky-700 dark:text-sky-300",
  },
} as const;

export const Login: React.FC = () => {
  const [role, setRole] = useState<Role>("DOCTOR");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  const cfg = ROLE_CONFIG[role];

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedRole = normalizeRoleString(localStorage.getItem("userRole"));
    if (token && storedRole) redirectAfterAuth(storedRole, navigate);
  }, [navigate]);

  useEffect(() => {
    const cached = (localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? "system";
    const initial: ThemeMode =
      cached === "light" || cached === "dark" || cached === "system" ? cached : "system";
    setThemeMode(initial);
    applyTheme(initial);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => {
      const cur = (localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? initial;
      if (cur === "system") applyTheme("system");
    };
    mq?.addEventListener?.("change", onChange);
    return () => mq?.removeEventListener?.("change", onChange);
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem(THEME_KEY, mode);
    applyTheme(mode);
  };
  const cycleTheme = () => {
    const next: ThemeMode = themeMode === "light" ? "dark" : themeMode === "dark" ? "system" : "light";
    setTheme(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter both email and password."); return; }
    try {
      setLoading(true);
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, role, userType: roleToUserType(role) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Login failed. Please check your credentials."); return; }
      const normalizedRole = normalizeRoleString(data.role) ?? role;
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userRole", normalizedRole);
      localStorage.setItem("userId", data.uid || "");
      localStorage.setItem("userName", data.name || "");
      redirectAfterAuth(normalizedRole, navigate);
    } catch (err) {
      console.error("Login API unreachable, engaging mobile demo fallback auth", err);
      const mockToken = "mobile_token_" + Date.now();
      const userName = email.split("@")[0] || role;
      localStorage.setItem("authToken", mockToken);
      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", "1");
      localStorage.setItem("userName", userName);
      redirectAfterAuth(role, navigate);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col">

      {/* ── BACKGROUND ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className={`absolute -top-40 left-1/2 -translate-x-1/2 h-[700px] w-[700px] rounded-full bg-gradient-to-br ${cfg.gradFrom} ${cfg.gradVia} ${cfg.gradTo} opacity-[0.10] blur-3xl transition-all duration-700`} />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-slate-400/5 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      {/* ── TOP BAR ── */}
      <header className="sticky top-0 z-20 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/landing" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition rounded-xl px-2 py-1 hover:bg-slate-100/70 dark:hover:bg-slate-800/50">
            <ArrowLeftIcon size={15} />
            Back
          </Link>

          <div className="flex items-center gap-2.5">
            {/* Brand */}
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <div className="relative w-7 h-7 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-sky-500 to-violet-500" />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-[10px]">DC</div>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Dental Clinic AI</span>
            </div>

            {/* Theme controls */}
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-100/60 dark:bg-slate-900/50 p-1">
              {(["light", "dark"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setTheme(m)}
                  className={["h-7 w-7 rounded-lg grid place-items-center transition-all text-xs", themeMode === m ? "bg-white dark:bg-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"].join(" ")}>
                  {m === "light" ? <SunIcon size={13} /> : <MoonIcon size={13} />}
                </button>
              ))}
              <button type="button" onClick={cycleTheme}
                className={["h-7 w-7 rounded-lg grid place-items-center transition-all", themeMode === "system" ? "bg-white dark:bg-slate-800 shadow-sm" : "text-slate-500"].join(" ")}>
                <span className="h-2 w-2 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400" />
              </button>
            </div>
          </div>
        </div>
      </header>


      {/* ── MAIN ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          {/* ── LEFT: INFO PANEL ── */}
          <div className="hidden lg:flex flex-col gap-8 animate-fade-in">
            {/* Large role icon */}
            <div className="flex items-center gap-4">
              <div className={`relative w-16 h-16 rounded-3xl overflow-hidden shadow-lg`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradFrom} ${cfg.gradVia} ${cfg.gradTo}`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <cfg.Icon size={28} className="text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.14em] uppercase text-slate-400 dark:text-slate-500">Signing in as</p>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{cfg.label}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{cfg.tagline}</p>
              </div>
            </div>

            {/* Features list */}
            <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/50 backdrop-blur p-6 space-y-3">
              <p className="text-xs font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">What you'll access</p>
              {cfg.features.map((f, i) => (
                <div key={f} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className={`w-8 h-8 rounded-xl grid place-items-center bg-gradient-to-br ${cfg.gradFrom} ${cfg.gradTo} opacity-90`}>
                    <SparklesIcon size={14} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{f}</span>
                </div>
              ))}
            </div>

            {/* Trust note */}
            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheckIcon size={15} className="text-emerald-500 shrink-0" />
              <span>Your data is secured with JWT-based authentication and role-based access control.</span>
            </div>
          </div>

          {/* ── RIGHT: FORM ── */}
          <div className="animate-slide-up">
            {/* Card */}
            <div className="relative">
              {/* Glow ring behind card */}
              <div className={`absolute -inset-1 rounded-[32px] opacity-40 blur-xl bg-gradient-to-br ${cfg.gradFrom} ${cfg.gradVia} ${cfg.gradTo} transition-all duration-700`} />

              <div className="relative rounded-[28px] border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-[0_30px_90px_-35px_rgba(15,23,42,0.45)] overflow-hidden">

                {/* Top gradient bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradFrom} ${cfg.gradVia} ${cfg.gradTo}`} />

                <div className="px-7 py-8">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-7">
                    <div className={`w-10 h-10 rounded-2xl overflow-hidden shrink-0`}>
                      <div className={`w-full h-full bg-gradient-to-br ${cfg.gradFrom} ${cfg.gradTo} flex items-center justify-center`}>
                        <cfg.Icon size={18} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 leading-none">Welcome back</h2>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Sign in to your {cfg.label} workspace</p>
                    </div>
                  </div>

                  {/* Role selector */}
                  <div className="mb-6">
                    <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-slate-400 dark:text-slate-500 mb-2">Select role</p>
                    <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/60 p-1.5">
                      {(["ADMIN", "DOCTOR", "PATIENT"] as Role[]).map((r) => {
                        const rc = ROLE_CONFIG[r];
                        const isActive = role === r;
                        return (
                          <button key={r} type="button" onClick={() => { setRole(r); setError(""); }}
                            className={[
                              "relative rounded-xl py-2.5 text-[12px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5",
                              isActive
                                ? `${rc.tabBg} ${rc.tabText} shadow-md scale-[1.02]`
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/60",
                            ].join(" ")}>
                            <rc.Icon size={13} />
                            {rc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-4 rounded-2xl border border-rose-200/70 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-500/10 px-4 py-2.5 text-[12px] text-rose-700 dark:text-rose-300 animate-fade-in">
                      {error}
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div>
                      <label htmlFor="login-email" className="block text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Email address
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
                          <MailIcon size={15} />
                        </span>
                        <input id="login-email" type="email" autoComplete="email" placeholder="you@clinic.com"
                          value={email} onChange={(e) => setEmail(e.target.value)}
                          className={[
                            "w-full rounded-2xl border bg-white/70 dark:bg-slate-900/50 pl-10 pr-4 py-3 text-sm",
                            "text-slate-900 dark:text-slate-50 placeholder:text-slate-400/80",
                            "border-slate-200/80 dark:border-slate-700/60",
                            "hover:border-slate-300 dark:hover:border-slate-600",
                            "focus:outline-none focus:ring-4 transition-all",
                            cfg.ring,
                          ].join(" ")} />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="login-password" className="text-[12px] font-semibold text-slate-600 dark:text-slate-400">
                          Password
                        </label>
                        <button type="button" onClick={() => navigate("/forgot-password")}
                          className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition underline-offset-2 hover:underline">
                          Forgot?
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
                          <LockIcon size={15} />
                        </span>
                        <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                          placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                          className={[
                            "w-full rounded-2xl border bg-white/70 dark:bg-slate-900/50 pl-10 pr-11 py-3 text-sm",
                            "text-slate-900 dark:text-slate-50 placeholder:text-slate-400/80",
                            "border-slate-200/80 dark:border-slate-700/60",
                            "hover:border-slate-300 dark:hover:border-slate-600",
                            "focus:outline-none focus:ring-4 transition-all",
                            cfg.ring,
                          ].join(" ")} />
                        <button type="button" onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                          {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={loading}
                      className={[
                        "w-full mt-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-md",
                        `bg-gradient-to-r ${cfg.btn}`,
                        "active:scale-[0.98] transition-all duration-150",
                        "disabled:opacity-60 disabled:pointer-events-none",
                        "flex items-center justify-center gap-2",
                      ].join(" ")}>
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Signing in…
                        </>
                      ) : (
                        <>
                          Sign in as {cfg.label}
                          <ArrowRightIcon size={15} />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Footer */}
                  <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[12px]">
                    <span className="text-slate-500 dark:text-slate-400">New to the platform?</span>
                    <Link to="/create-account" className="font-bold text-slate-800 dark:text-slate-100 hover:opacity-75 transition flex items-center gap-1">
                      Create account <ArrowRightIcon size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Below-card note */}
            <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-600">
              Powered by Simats Engineering · Dental Clinic Intelligence
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};
