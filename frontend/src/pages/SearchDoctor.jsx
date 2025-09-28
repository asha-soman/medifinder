import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import doctorsImg from "../assets/doctors.png";
import { searchDoctors, getSpecialties } from "../api/bookingApi";
import "./SearchDoctor.css";

/* ---------- Helpers ---------- */
const normalizeDoctorsResponse = (data) => {
  const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return list.map((d) => ({
    doctorId: d.doctorId || d._id,
    doctorName: d.doctorName,
    specialty: d.specialty,
    slots: (d.availableSlots || d.slots || []).map((s) =>
      typeof s === "string" ? s : (s.start || "")
    ),
  }));
};

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

// find next date with available slots
const findNextAvailableDate = async ({ name, specialty, startDate }) => {
  const normalizedSpec = specialty && specialty !== "All" ? specialty : undefined;
  const maxHorizon = 14;
  for (let i = 0; i <= maxHorizon; i++) {
    const dateStr = addDays(startDate, i);
    const data = await searchDoctors({
      name: name?.trim() || undefined,
      specialty: normalizedSpec,
      date: dateStr,
      page: 1,
      limit: 5,
    });
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const hasAnySlots = list.some((item) => (item.availableSlots || []).length > 0);
    if (hasAnySlots) return { dateStr, data };
  }
  return null;
};

const filterBySlotsIfDated = (list, hasDate) =>
  hasDate ? list.filter((d) => Array.isArray(d.slots) && d.slots.length > 0) : list;

/* ---------- Component ---------- */
export default function SearchDoctor() {
  // inputs (left blank so placeholders show)
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

  // UI hint for auto-selected date
  const [autoSelectedDate, setAutoSelectedDate] = useState("");

  // single selection across ALL doctors
  const [selected, setSelected] = useState({ doctorId: null, slotISO: null });

  const navigate = useNavigate();
  const effectiveDate = date || autoSelectedDate || todayLocal();
  const hasDateInEffect = !!(date || autoSelectedDate);

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
        const uniqueFromSearch = Array.from(new Set(items.map((d) => d.specialty)))
          .filter(Boolean)
          .sort();
        setSpecialties(uniqueFromSearch);
      } catch {
        setSpecialties([]);
      }
    })();
  }, []);

  /* Auto-pick next available date (but keep inputs blank so placeholders show) */
  useEffect(() => {
    (async () => {
      try {
        const start = todayLocal();
        const found = await findNextAvailableDate({ name: "", specialty: "", startDate: start });
        if (found) {
          setAutoSelectedDate(found.dateStr);
          const normalized = normalizeDoctorsResponse(found.data);
          setResults(filterBySlotsIfDated(normalized, true));
          setPage(Number(found.data?.page || 1));
          setPages(Number(found.data?.pages || 1));
        } else {
          const data = await searchDoctors({ page: 1, limit: 5 });
          const normalized = normalizeDoctorsResponse(data);
          setResults(filterBySlotsIfDated(normalized, false));
          setPage(Number(data?.page || 1));
          setPages(Number(data?.pages || 1));
        }
      } catch {}
    })();
  }, []);

  const fetchPage = async (targetPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const normalizedSpec = specialty && specialty !== "All" ? specialty : undefined;
      const data = await searchDoctors({
        name: name.trim() || undefined,
        specialty: normalizedSpec,
        date: effectiveDate,
        page: targetPage,
        limit: 5,
      });
      const normalized = normalizeDoctorsResponse(data);
      setResults(filterBySlotsIfDated(normalized, hasDateInEffect));
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
    setLoading(true);
    setSelected({ doctorId: null, slotISO: null });
    try {
      const normalizedSpec = specialty && specialty !== "All" ? specialty : undefined;
      const data = await searchDoctors({
        name: name.trim() || undefined,
        specialty: normalizedSpec,
        date: effectiveDate,
        page: 1,
        limit: 5,
      });

      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const hasAnySlots = list.some((item) => (item.availableSlots || []).length > 0);

      if (hasAnySlots) {
        const normalized = normalizeDoctorsResponse(data);
        setResults(filterBySlotsIfDated(normalized, hasDateInEffect));
        setPage(Number(data?.page || 1));
        setPages(Number(data?.pages || 1));
        setAutoSelectedDate("");
      } else {
        const found = await findNextAvailableDate({ name, specialty, startDate: effectiveDate });
        if (found) {
          setAutoSelectedDate(found.dateStr);
          const normalizedFound = normalizeDoctorsResponse(found.data);
          setResults(filterBySlotsIfDated(normalizedFound, true));
          setPage(Number(found.data?.page || 1));
          setPages(Number(found.data?.pages || 1));
        } else {
          setResults([]);
          setPages(1);
          setPage(1);
          setError("No availability found in the next 14 days.");
        }
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const chooseSlot = (doctorId, slotISO) => setSelected({ doctorId, slotISO });

  const goToBook = (doctor) => {
    if (selected.doctorId !== doctor.doctorId || !selected.slotISO) {
      alert("Please select a time slot first.");
      return;
    }
    navigate("/patient/book", { state: { doctor, slotISO: selected.slotISO } });
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
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            aria-label="Doctor name"
          />

          {/* Specialty with placeholder + All */}
          <select
            className="search-card__input"
            value={specialty}
            onChange={(e) => {
              setSpecialty(e.target.value);
              setPage(1);
              setSelected({ doctorId: null, slotISO: null });
            }}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            aria-label="Specialty"
          >
            <option value="" disabled hidden>Specialty</option>
            <option value="All">All</option>
            {specialties
              .filter((s) => s && s !== "All")
              .map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
          </select>

          {/* Date with placeholder using text->date trick */}
          <input
            type={date ? "date" : "text"}
            className="search-card__input"
            value={date}
            placeholder="Date"
            onFocus={(e) => {
              if (!date) e.target.type = "date";
              e.target.min = todayLocal();
            }}
            onBlur={(e) => {
              if (!e.target.value) e.target.type = "text";
            }}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
              setSelected({ doctorId: null, slotISO: null });
            }}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            aria-label="Date"
          />

          <button className="search-card__btn" onClick={onSearch} disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
        {error && <div className="form-error">{error}</div>}
      </section>

      {/* Right-aligned hint under the card */}
      {autoSelectedDate && (
        <div className="auto-hint">
          Showing next available date: {new Date(`${autoSelectedDate}T00:00:00Z`).toLocaleDateString()}
        </div>
      )}

      {/* RESULTS */}
      <section className="results">
        {results.map((doc) => {
          const active = selected.doctorId === doc.doctorId && !!selected.slotISO;
          return (
            <div key={doc.doctorId} className="result-card">
              <div className="left-stack">
                <div className="doc-header">
                  <div className="doctor-name">{doc.doctorName}</div>
                  <div className="doctor-spec">{doc.specialty}</div>
                </div>
                <div className="slot-wrap">
                  {(date || autoSelectedDate) ? (
                    doc.slots?.length ? (
                      doc.slots.map((s) => (
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
                <button className="btn-book" onClick={() => goToBook(doc)}>Book</button>
              </div>
            </div>
          );
        })}

        {!loading && results.length === 0 && <div className="muted">No results yet — try searching.</div>}

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
//sample