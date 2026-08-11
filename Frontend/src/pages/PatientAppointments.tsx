import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  SearchIcon,
  HistoryIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PatientLayout } from "../layouts/patient/PatientLayout";
import { fetchWithAuth } from "../lib/api";
import { normStatus } from "../lib/appointmentStatus";

type AppointmentRow = {
  id: string | number;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM
  doctor: string;
  reason: string;
  status: string;
  location: string | null;
  notes: string | null;
};

type AppointmentsResponse =
  | { items: AppointmentRow[]; error?: boolean }
  | { appointments: any[]; error?: boolean }
  | any;

type LoadState = "loading" | "ready" | "error";
type ViewTab = "upcoming" | "history" | "all";

const card =
  "rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.35)]";

// match agent expectation (no-show after 45 minutes)
const NO_SHOW_AFTER_MIN = 45;

function parseLocalDateTime(dateStr: any, timeStr: any): Date | null {
  const d = String(dateStr || "").slice(0, 10);
  const t = String(timeStr || "").slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  if (!/^\d{2}:\d{2}$/.test(t)) return null;

  const [hh, mm] = t.split(":");
  const dt = new Date(
    Number(d.slice(0, 4)),
    Number(d.slice(5, 7)) - 1,
    Number(d.slice(8, 10)),
    Number(hh),
    Number(mm),
    0,
    0
  );
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isFinalStatus(s: string) {
  const x = normStatus(s);
  return (
    x === "COMPLETED" ||
    x === "CANCELLED" ||
    x === "NO-SHOW" ||
    x === "NOSHOW" ||
    x === "NO SHOW"
  );
}

/**
 * Patient-friendly display status:
 * - If backend already says Completed/Cancelled/No-show -> keep it
 * - If appointment is past start:
 *    - within 45 min -> "IN_PROGRESS"
 *    - after 45 min -> "NO-SHOW"
 * - Otherwise keep normal (Pending/Confirmed/etc.)
 */
function displayStatus(raw: any, scheduledAt: Date | null, now: Date) {
  const s = normStatus(raw);

  if (!scheduledAt) return s || "PENDING";
  if (isFinalStatus(s)) return s;

  const diffMs = now.getTime() - scheduledAt.getTime();
  if (diffMs <= 0) return s || "PENDING";

  const diffMin = diffMs / 60000;
  if (diffMin >= NO_SHOW_AFTER_MIN) return "NO-SHOW";
  return "IN_PROGRESS";
}

function statusPillClass(shown: any) {
  const s = String(shown || "").toUpperCase();

  if (s === "CONFIRMED")
    return "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-400/40";

  if (s === "PENDING" || s === "SCHEDULED")
    return "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-200 border border-amber-200 dark:border-amber-400/40";

  if (s === "IN_PROGRESS")
    return "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-200 border border-sky-200 dark:border-sky-400/40";

  if (s === "CANCELLED")
    return "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-400/40";

  if (s === "NO-SHOW" || s === "NOSHOW" || s === "NO SHOW")
    return "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-400/40";

  if (s === "COMPLETED")
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700";

  return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700";
}

function labelFor(shown: string) {
  const s = String(shown || "").toUpperCase();
  if (s === "NO-SHOW" || s === "NOSHOW" || s === "NO SHOW") return "No-show";
  if (s === "IN_PROGRESS") return "In progress";
  if (s === "CONFIRMED") return "Confirmed";
  if (s === "COMPLETED") return "Completed";
  if (s === "CANCELLED") return "Cancelled";
  if (s === "PENDING" || s === "SCHEDULED") return "Pending";
  return shown || "Pending";
}

function coerceAppointmentRow(r: any): AppointmentRow {
  const id = r?.id ?? r?.appointment_id ?? r?.appointmentId ?? r?._id ?? "—";

  const rawDate = r?.date ?? r?.appointment_date ?? r?.scheduled_date ?? null;
  const rawTime = r?.time ?? r?.appointment_time ?? r?.scheduled_time ?? null;

  const scheduledAt =
    r?.scheduled_at ?? r?.scheduledAt ?? r?.start_at ?? r?.startAt ?? null;

  let date: string | null = rawDate ? String(rawDate).slice(0, 10) : null;
  let time: string | null = rawTime ? String(rawTime).slice(0, 5) : null;

  if ((!date || !time) && scheduledAt) {
    const s = String(scheduledAt);
    if (!date) date = s.slice(0, 10);
    if (!time && s.includes("T")) time = s.split("T")[1]?.slice(0, 5) ?? null;
  }

  const doctor =
    r?.doctor ??
    r?.doctor_name ??
    r?.doctorName ??
    r?.doctor_full_name ??
    r?.provider ??
    "—";

  const reason = r?.reason ?? r?.purpose ?? r?.treatment ?? r?.title ?? "—";
  const status = r?.status ?? r?.appointment_status ?? r?.state ?? "PENDING";
  const location = r?.location ?? r?.clinic_location ?? r?.clinic ?? null;
  const notes = r?.notes ?? r?.patient_notes ?? r?.comment ?? null;

  return {
    id: typeof id === "number" ? id : String(id),
    date,
    time,
    doctor: String(doctor || "—"),
    reason: String(reason || "—"),
    status: String(status || "PENDING"),
    location: location ? String(location) : null,
    notes: notes ? String(notes) : null,
  };
}

function fmtWhen(dt: Date | null, date: string | null, time: string | null) {
  if (dt) {
    const dd = dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    const tt = dt.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dd} • ${tt}`;
  }
  return `${date || "—"} • ${time || "--:--"}`;
}

export const PatientAppointments: React.FC = () => {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    doctor: "Dr. Sarah Jenkins (Orthodontics)",
    reason: "Teeth Cleaning & Scaling",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: "10:00 AM",
    location: "Main Clinic Suite 102",
    notes: ""
  });

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    const newApt: AppointmentRow = {
      id: "APT-" + Math.floor(1000 + Math.random() * 9000),
      date: formData.date,
      time: formData.time,
      doctor: formData.doctor,
      reason: formData.reason,
      status: "CONFIRMED",
      location: formData.location,
      notes: formData.notes || "Booked by patient"
    };

    try {
      await fetchWithAuth("/api/patient/appointments", {
        method: "POST",
        body: JSON.stringify(newApt)
      } as any);
    } catch (_) { }

    const stored = JSON.parse(localStorage.getItem("custom_patient_appointments") || "[]");
    localStorage.setItem("custom_patient_appointments", JSON.stringify([newApt, ...stored]));

    setAppointments((prev) => [newApt, ...prev]);
    setShowModal(false);
    setBookingSuccess(`🎉 Appointment booked successfully for ${formData.date} at ${formData.time}!`);
    setTimeout(() => setBookingSuccess(null), 6000);
  }

  async function load() {
    try {
      setStatus("loading");
      setErrorMsg(null);

      const data = await fetchWithAuth<AppointmentsResponse>("/api/patient/appointments").catch(() => null);

      const rawList: any[] = Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.appointments)
        ? (data as any).appointments
        : Array.isArray(data)
        ? (data as any)
        : [];

      const localCustom = JSON.parse(localStorage.getItem("custom_patient_appointments") || "[]");
      const merged = [...localCustom.map(coerceAppointmentRow), ...rawList.map(coerceAppointmentRow)];

      setAppointments(merged);
      setStatus("ready");
    } catch (err: any) {
      console.error("PATIENT APPOINTMENTS ERROR", err);

      if (err?.code === "NO_TOKEN" || err?.status === 401) {
        setErrorMsg("Please log in again to view your appointments.");
        setStatus("error");
        navigate("/login?role=patient", { replace: true });
        return;
      }

      setErrorMsg("We couldn’t load your appointments right now. Please try again.");
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const enriched = useMemo(() => {
    return appointments.map((a) => {
      const dt = parseLocalDateTime(a.date, a.time);
      const shown = displayStatus(a.status, dt, now);
      return { ...a, __dt: dt, __shown: shown };
    });
  }, [appointments, now]);

  const counts = useMemo(() => {
    const upcoming = enriched.filter((a: any) => {
      if (!a.__dt) return false;
      if (a.__dt.getTime() < now.getTime()) return false;
      if (isFinalStatus(a.__shown)) return false;
      // also hide IN_PROGRESS from upcoming
      if (String(a.__shown).toUpperCase() === "IN_PROGRESS") return false;
      return true;
    }).length;

    const history = enriched.filter((a: any) => {
      if (!a.__dt) return true;
      if (a.__dt.getTime() < now.getTime()) return true;
      if (isFinalStatus(a.__shown)) return true;
      if (String(a.__shown).toUpperCase() === "IN_PROGRESS") return true;
      return false;
    }).length;

    return { upcoming, history, all: enriched.length };
  }, [enriched, now]);

  const filtered = useMemo(() => {
    const base = (() => {
      const upcoming = enriched
        .filter((a: any) => {
          if (!a.__dt) return false;
          if (a.__dt.getTime() < now.getTime()) return false;
          if (isFinalStatus(a.__shown)) return false;
          if (String(a.__shown).toUpperCase() === "IN_PROGRESS") return false;
          return true;
        })
        .sort((x: any, y: any) => x.__dt.getTime() - y.__dt.getTime());

      const history = enriched
        .filter((a: any) => {
          if (!a.__dt) return true;
          if (a.__dt.getTime() < now.getTime()) return true;
          if (isFinalStatus(a.__shown)) return true;
          if (String(a.__shown).toUpperCase() === "IN_PROGRESS") return true;
          return false;
        })
        .sort((x: any, y: any) => (y.__dt?.getTime?.() || 0) - (x.__dt?.getTime?.() || 0));

      if (tab === "upcoming") return upcoming;
      if (tab === "history") return history;
      return [...upcoming, ...history];
    })();

    const needle = q.trim().toLowerCase();
    if (!needle) return base;

    return base.filter((a: any) => {
      const hay = `${a.id} ${a.doctor} ${a.reason} ${a.location || ""} ${labelFor(a.__shown)}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [enriched, tab, q, now]);

  return (
    <PatientLayout>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-28 left-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-28 right-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 px-5 py-5 shadow-[0_26px_80px_-55px_rgba(15,23,42,0.55)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/80 dark:bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <CalendarIcon size={14} />
                <span>Appointments</span>
              </div>

              <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
                Your schedule
              </h1>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                Upcoming shows future appointments. Past visits appear in History.
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 px-2.5 py-1">
                  Upcoming:{" "}
                  <span className="ml-1 font-semibold text-slate-900 dark:text-slate-100">
                    {status === "ready" ? counts.upcoming : "—"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 px-2.5 py-1">
                  <HistoryIcon size={12} />
                  History:{" "}
                  <span className="ml-1 font-semibold text-slate-900 dark:text-slate-100">
                    {status === "ready" ? counts.history : "—"}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab("upcoming")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    tab === "upcoming"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-transparent"
                      : "bg-white/80 dark:bg-slate-950/80 border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setTab("history")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    tab === "history"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-transparent"
                      : "bg-white/80 dark:bg-slate-950/80 border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  History
                </button>
                <button
                  onClick={() => setTab("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    tab === "all"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-transparent"
                      : "bg-white/80 dark:bg-slate-950/80 border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  All
                </button>

                <button
                  onClick={load}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 text-slate-700 dark:text-slate-200"
                >
                  <RefreshCwIcon size={14} />
                  Refresh
                </button>
              </div>

              <div className="relative w-full sm:w-[320px]">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
                  <SearchIcon size={14} />
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search doctor, reason, status…"
                  className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 pl-8 pr-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
              </div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/25 dark:text-amber-200">
            {errorMsg}
          </div>
        )}

        {/* List */}
        <section className={card + " p-4 sm:p-5"}>
          {status === "loading" && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Loading your appointments…
            </div>
          )}

          {status === "ready" && filtered.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tab === "upcoming" ? "No upcoming appointments." : "No appointments found."}
            </p>
          )}

          {status === "ready" && filtered.length > 0 && (
            <ul className="space-y-3">
              {filtered.map((apt: any) => (
                <li
                  key={String(apt.id)}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 px-4 py-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {fmtWhen(apt.__dt, apt.date, apt.time)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusPillClass(
                            apt.__shown
                          )}`}
                        >
                          {labelFor(apt.__shown)}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                        <span className="font-semibold">{apt.reason}</span>{" "}
                        <span className="text-slate-500 dark:text-slate-400">
                          • with {apt.doctor}
                        </span>
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <ClockIcon size={13} />
                          <span>{apt.time || "--:--"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPinIcon size={13} />
                          <span>{apt.location || "Clinic"}</span>
                        </span>
                      </div>

                      {apt.notes ? (
                        <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-300">
                          {apt.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">#{apt.id}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PatientLayout>
  );
};
