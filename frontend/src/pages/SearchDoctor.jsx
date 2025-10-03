// src/pages/SearchDoctor.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import doctorsImg from "../assets/doctors.png";
import { searchDoctors, getSpecialties } from "../api/bookingApi";
import "./SearchDoctor.css";
 
/* ---------- Helpers ---------- */
const todayLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
 
const addDays = (yyyyMmDd, n) => {
  const d = new Date(`${yyyyMmDd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
 
/* treat only clearly-free slots as displayable */
const isFreeSlot = (s) => {
  if (typeof s !== "object" || s === null) return true; // plain ISO string is assumed free
  const booked = s.booked || s.isBooked || s.taken || s.unavailable || s.available === false;
  const st = (s.status || s.state || "").toLowerCase();
  return !booked && !/booked|taken|unavailable|completed|complete|cancel/.test(st);
};
 
/* normalize API search response into UI shape */
const normalizeDoctorsResponse = (data) => {
  const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return list.map((d) => {
    const raw = d.availableSlots ?? d.slots ?? [];
    const slots = (Array.isArray(raw) ? raw : [])
      .filter(isFreeSlot)
      .map((s) => (typeof s === "string" ? s : (s.start || s.startTime || s.iso || "")))
      .filter(Boolean);
    return {
      doctorId: d.doctorUserId || d._id,
      doctorName: d.doctorName,
      specialty: d.specialization ?? d.specialty ?? "",
      slots,
    };
  });
};
 
/* robust doc+slot helpers (for revalidation) */
const findDoctorInResults = (list, doc) => {
  const wantId = doc.doctorId || doc.doctorUserId || doc._id;
  return (
    list.find((d) => {
      const id = d.doctorUserId || d.doctorId || d._id;
      return wantId && id && String(id) === String(wantId);
    }) ||
    list.find((d) => {
      const a = (d.doctorName || d.name || "").toLowerCase();
      const b = (doc.doctorName || doc.name || "").toLowerCase();
      return a && b && a.includes(b);
    }) ||
    null
  );
};
const extractSlots = (docObj) => {
  if (!docObj) return [];
  const raw = docObj.availableSlots ?? docObj.slots ?? [];
  return (Array.isArray(raw) ? raw : [])
    .filter(isFreeSlot)
    .map((s) => (typeof s === "string" ? s : (s?.start || s?.startTime || s?.iso)))
    .filter(Boolean);
};
 
// replace your current findNextAvailableDate with this future-aware version
const findNextAvailableDate = async ({ name, specialty, startDate }) => {
  const normalizedSpec = specialty && specialty !== "All" ? specialty : undefined;
  const maxHorizon = 30;
  const todayStr = todayLocal();
 
  const hasFutureFreeSlot = (dateStr, items) => {
    const nowMs = Date.now();
    return items.some((item) => {
      const raw = item.availableSlots ?? item.slots ?? [];
      const arr = Array.isArray(raw) ? raw : [];
      return arr.some((s) => {
        // free?
        if (!isFreeSlot(s)) return false;
        // extract ISO
        const iso = typeof s === "string" ? s : (s.start || s.startTime || s.iso || "");
        if (!iso) return false;
        // if we're checking today, only count FUTURE times
        if (dateStr === todayStr) return new Date(iso).getTime() > nowMs;
        return true;
      });
    });
  };
 
  for (let i = 0; i <= maxHorizon; i++) {
    const dateStr = addDays(startDate, i);
 
    let page = 1;
    let pages = 1;
    do {
      const data = await searchDoctors({
        name: name?.trim() || undefined,
        specialty: normalizedSpec,
        date: dateStr,
        page,
        limit: 100, // search widely across doctors per day
      });
 
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
 
      if (hasFutureFreeSlot(dateStr, items)) {
        return { dateStr, data: { ...data, items } };
      }
 
      pages = Number(data?.pages || 1);
      page = Number(data?.page || page) + 1;
    } while (page <= pages);
  }
  return null;
};
 
/* revalidate a slot just-in-time */
const validateSlotAvailable = async ({ doctor, slotISO, dateStr }) => {
  const params = {
    doctorUserId: doctor.doctorId || doctor.doctorUserId || doctor._id, // if backend supports this filter
    name: doctor.doctorName || doctor.name,
    specialty: doctor.specialty || doctor.specialization,
    date: dateStr,
    page: 1,
    limit: 100,
  };
  const data = await searchDoctors(params);
  const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  const match = findDoctorInResults(list, doctor);
  const slots = extractSlots(match);
  return slots.includes(slotISO);
};
 
/* ---------- Component ---------- */
export default function SearchDoctor() {
  // filters
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [date, setDate] = useState("");
 
  // data
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [error, setError] = useState("");
 
  // paging
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
 
  // UX: banner & initial behavior
  const [isPristine, setIsPristine] = useState(true);       // true until user touches any filter or searches
  const [autoSelectedDate, setAutoSelectedDate] = useState(""); // earliest date found on pristine load
 
  // selection
  const [selected, setSelected] = useState({ doctorId: null, slotISO: null });
  const [checking, setChecking] = useState(false);
 
  const navigate = useNavigate();
 
  // compute which date (if any) we’re using for queries in this render
  // - pristine: use autoSelectedDate (if found)
  // - after user filters: only use user-picked date (no implicit "today")
  const dateParam = isPristine ? (autoSelectedDate || undefined) : (date || undefined);
  const dayIsToday = dateParam === todayLocal();
 
  /* Load specialties once */
  useEffect(() => {
    (async () => {
      try {
        if (typeof getSpecialties === "function") {
          const list = await getSpecialties();
          const unique = Array.from(new Set(list)).filter(Boolean).sort();
          if (unique.length) {
            setSpecialties(unique);
            return;
          }
        }
        // fallback: derive from doctors list
        const data = await searchDoctors({ page: 1, limit: 1000 });
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const uniqueFromSearch = Array.from(
          new Set(items.map((d) => d.specialization ?? d.specialty).filter(Boolean))
        ).sort();
        setSpecialties(uniqueFromSearch);
      } catch {
        setSpecialties([]);
      }
    })();
  }, []);
 
  /* First load: find the earliest date with availability and show it */
  useEffect(() => {
    (async () => {
      try {
        const start = todayLocal();
        const found = await findNextAvailableDate({ name: "", specialty: "", startDate: start });
        if (found) {
          setAutoSelectedDate(found.dateStr);
          const normalized = normalizeDoctorsResponse(found.data);
          setResults(normalized);  // show the earliest date’s slots immediately
          setPage(Number(found.data?.page || 1));
          setPages(Number(found.data?.pages || 1));
        } else {
          // No availability in horizon — show empty but keep pristine banner off (it will be false only after user action)
          setResults([]);
          setPage(1);
          setPages(1);
        }
      } catch {
        // swallow on initial load
      }
    })();
  }, []);
 
  /* ---------- Event handlers: flip pristine off on any user change ---------- */
  const markNotPristine = () => {
    if (isPristine) {
      setIsPristine(false);
      setAutoSelectedDate(""); // hide banner once user interacts with filters
    }
  };
 
  const onChangeName = (e) => { setName(e.target.value); markNotPristine(); };
  const onChangeSpec = (e) => { setSpecialty(e.target.value); setPage(1); setSelected({ doctorId: null, slotISO: null }); markNotPristine(); };
  const onChangeDate = (e) => { setDate(e.target.value); setPage(1); setSelected({ doctorId: null, slotISO: null }); markNotPristine(); };
 
  /* Fetch a specific page using the current dateParam logic */
  const fetchPage = async (targetPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const normalizedSpec = specialty && specialty !== "All" ? specialty : undefined;
 
      // IMPORTANT: if not pristine and no user date, do NOT pass a date at all
      const queryDate = isPristine ? (autoSelectedDate || undefined) : (date || undefined);
 
      const data = await searchDoctors({
        name: name.trim() || undefined,
        specialty: normalizedSpec,
        ...(queryDate ? { date: queryDate } : {}),
        page: targetPage,
        limit: 5,
      });
 
      const normalized = normalizeDoctorsResponse(data);
      // Only filter out “no slot” doctors when a date is actually applied
      const withDate = !!queryDate;
      setResults(withDate ? normalized.filter((d) => d.slots?.length) : normalized);
      setPage(Number(data?.page || targetPage));
      setPages(Number(data?.pages || 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
 
  const onSearch = async () => {
    setError("");
    setSelected({ doctorId: null, slotISO: null });
 
    // user-triggered search: turn off pristine & banner
    if (isPristine) {
      setIsPristine(false);
      setAutoSelectedDate("");
    }
 
    setLoading(true);
    try {
      const normalizedSpec = specialty && specialty !== "All" ? specialty : undefined;
      const queryDate = date || undefined; // after user filters, do not force any date
 
      const data = await searchDoctors({
        name: name.trim() || undefined,
        specialty: normalizedSpec,
        ...(queryDate ? { date: queryDate } : {}),
        page: 1,
        limit: 5,
      });
 
      const normalized = normalizeDoctorsResponse(data);
      const withDate = !!queryDate;
      const finalList = withDate ? normalized.filter((d) => d.slots?.length) : normalized;
 
      setResults(finalList);
      setPage(Number(data?.page || 1));
      setPages(Number(data?.pages || 1));
 
      if (!finalList.length) {
        // No availability for these filters; we purposely do NOT auto-pick a date anymore.
        setError("No results found with your filters.");
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
 
  const chooseSlot = (doctorId, slotISO) => setSelected({ doctorId, slotISO });
 
  const goToBook = async (doctor) => {
    if (checking) return;
    if (selected.doctorId !== doctor.doctorId || !selected.slotISO) {
      alert("Please select a time slot first.");
      return;
    }
    // must have a dateParam to validate (slots only render when there's a dateParam on pristine, or user provided one)
    const dateForCheck = dateParam;
    if (!dateForCheck) {
      alert("Please pick a date first.");
      return;
    }
 
    try {
      setChecking(true);
      const ok = await validateSlotAvailable({
        doctor,
        slotISO: selected.slotISO,
        dateStr: dateForCheck,
      });
      if (!ok) {
        alert("That time was just taken. Refreshing availability…");
        await fetchPage(page);
        return;
      }
      navigate("/patient/book", { state: { doctor, slotISO: selected.slotISO } });
    } finally {
      setChecking(false);
    }
  };
 
  /* Pagination  */
  const Pagination = () => {
    const totalPages = Math.max(1, Number(pages) || 1);
    const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const WINDOW = 5;
    const start = Math.max(1, Math.min(current - Math.floor(WINDOW / 2), totalPages - WINDOW + 1));
    const end = Math.min(totalPages, start + WINDOW - 1);
 
    const canPrevWindow = start > 1;
    const canNextWindow = end < totalPages;
 
    return (
      <div className="search-page__pagination">
        <button className="search-page__page-link search-page__chev" onClick={() => fetchPage(start - 1)} disabled={!canPrevWindow}>
          «
        </button>
        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((p) => (
          <button key={p} className={`search-page__page-link ${p === current ? "is-active" : ""}`} onClick={() => fetchPage(p)}>
            {p}
          </button>
        ))}
        <button className="search-page__page-link search-page__chev" onClick={() => fetchPage(end + 1)} disabled={!canNextWindow}>
          »
        </button>
      </div>
    );
  };
 
  return (
    <div className="search-page">
      {/* HERO */}
      <section className="hero">
        <img src={doctorsImg} alt="Doctors" className="hero-image" />
        <div className="hero-copy">
          <h1 className="hero-line1">
            Your <span className="accent">Health</span>, Our <span className="accent">Priority</span>.
          </h1>
          <h2 className="hero-line2">
            Connecting <span className="accent">You</span> With Trusted <br />
            Medical Professionals.
          </h2>
          <p className="hero-sub">
            Our commitment is to connect you with trusted medical professionals who deliver exceptional care.
            We make it simple and seamless to find the right doctor and book appointments.
          </p>
        </div>
      </section>
 
      {/* FIND A DOCTOR */}
      <section className="search-card">
        <div className="card-title">Find A Doctor</div>
        <div className="filters-row">
          <input
            className="search-card__input"
            placeholder="Name"
            value={name}
            onChange={onChangeName}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            aria-label="Doctor name"
          />
          <select
            className="search-card__input"
            value={specialty}
            onChange={onChangeSpec}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            aria-label="Specialty"
          >
            <option value="" disabled hidden>Specialty</option>
            <option value="All">All</option>
            {specialties.filter((s) => s && s !== "All").map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type={date ? "date" : "text"}
            className="search-card__input"
            value={date}
            placeholder="Date"
            onFocus={(e) => {
              if (!date) e.target.type = "date";
              e.target.min = todayLocal();
            }}
            onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
            onChange={onChangeDate}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            aria-label="Date"
          />
          <button className="search-card__btn" onClick={onSearch} disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
        {error && <div className="form-error">{error}</div>}
      </section>
 
      {/* Show banner ONLY on pristine first load, not after user filters */}
      {isPristine && autoSelectedDate && (
        <div className="auto-hint">
          Showing next available date:{" "}
          {new Date(`${autoSelectedDate}T00:00:00Z`).toLocaleDateString()}
        </div>
      )}
 
      {/* RESULTS */}
      <section className="results">
        {results.map((doc) => {
          const active = selected.doctorId === doc.doctorId && !!selected.slotISO;
 
          // Hide past times if the applied date is today
          const slotsForDisplay = (doc.slots || []).filter((s) =>
            dayIsToday ? new Date(s).getTime() > Date.now() : true
          );
 
          return (
            <div key={doc.doctorId} className="result-card">
              <div className="left-stack">
                <div className="doc-header">
                  <div className="doctor-name">{doc.doctorName}</div>
                  <div className="doctor-spec">{doc.specialty}</div>
                </div>
                <div className="slot-wrap">
                  {dateParam ? (
                    slotsForDisplay.length ? (
                      slotsForDisplay.map((s) => (
                        <button
                          key={s}
                          onClick={() => chooseSlot(doc.doctorId, s)}
                          className={`slot ${active && selected.slotISO === s ? "slot-active" : ""}`}
                          title={new Date(s).toLocaleString()}
                        >
                          {new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </button>
                      ))
                    ) : (
                      <span className="muted">No slots for this date</span>
                    )
                  ) : (
                    <span className="muted">Pick a date to see availability</span>
                  )}
                </div>
              </div>
 
              <div className="book-col">
                <button className="btn-book" onClick={() => goToBook(doc)} disabled={checking || !dateParam}>
                  {checking ? "Checking…" : "Book"}
                </button>
              </div>
            </div>
          );
        })}
 
        {!loading && results.length === 0 && (
          <div className="muted">No results yet — try searching.</div>
        )}
 
        <Pagination />
      </section>
 
      {/* Stats block kept as-is */}
      <section className="site-stats">
        <h3 className="stats-heading">Building Trust Through Care</h3>
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-number">1,214</div>
            <div className="stat-label">Appointments this Month</div>
          </div>
          <div className="stat">
            <div className="stat-number">3,500</div>
            <div className="stat-label">Registered Patients</div>
          </div>
          <div className="stat">
            <div className="stat-number">356</div>
            <div className="stat-label">Active Doctors</div>
          </div>
          <div className="stat">
            <div className="stat-number">99%</div>
            <div className="stat-label">Booking Success Rate</div>
          </div>
        </div>
        <div className="stats-tagline">Connecting thousands of patients with quality care every month.</div>
      </section>
    </div>
  );
}