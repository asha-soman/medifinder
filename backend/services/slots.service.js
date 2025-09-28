// backend/services/slots.service.js
const Availability = require('../models/availability.model');
const Appointment  = require('../models/appointment.model');
const Doctor       = require('../models/doctor.model');

/* slice availability into 60 minutes interval*/
function sliceHourly(start, end) {
  const out = [];
  const s = new Date(start);
  const e = new Date(end);

  // local time
  s.setMinutes(0, 0, 0);

  while (s < e) {
    const slotStart = new Date(s);
    const slotEnd   = new Date(s.getTime() + 60 * 60 * 1000);
    if (slotEnd <= e) out.push({ start: slotStart, end: slotEnd });
    s.setHours(s.getHours() + 1); // advance 1 local hour
  }
  return out;
}

async function findSlots({ date, specialty, name, page = 1, limit = 5 }) {
  const doctorFilters = {};
  if (specialty && specialty !== 'All') doctorFilters.specialty = specialty;
  if (name) {
    const rx = new RegExp(name.trim(), 'i');
    doctorFilters.$or = [{ doctorName: rx }, { email: rx }];
  }

  const sort = { doctorName: 1 };
  const _page  = Number(page)  || 1;
  const _limit = Number(limit) || 5;
  const skip   = (_page - 1) * _limit;

  // No date filter, this will paginate doctors as-is
  if (!date) {
    const [totalDoctors, doctors] = await Promise.all([
      Doctor.countDocuments(doctorFilters),
      Doctor.find(doctorFilters)
        .sort(sort)
        .skip(skip)
        .limit(_limit)
        .select('doctorName specialty email phone')
        .lean(),
    ]);

    const items = doctors.map(d => ({
      doctorId:   d._id,
      doctorName: d.doctorName,
      specialty:  d.specialty,
      email:      d.email,
      phone:      d.phone,
      availableSlots: [], // will not computing slots without a date
    }));

    return {
      page: _page,
      limit: _limit,
      total: totalDoctors,
      pages: Math.max(1, Math.ceil(totalDoctors / _limit)),
      items,
    };
  }

  // Has Date filter present -> filter by "with slots" before paginate
  // Again, bound in local time
  const [Y, M, D] = date.split('-').map(Number);
  const startOfDay = new Date(Y, M - 1, D, 0, 0, 0, 0);
  const endOfDay   = new Date(Y, M - 1, D, 23, 59, 59, 999);

  // sort doctors to compute availability
  const allDoctors = await Doctor.find(doctorFilters)
    .sort(sort)
    .select('doctorName specialty email phone')
    .lean();

  const doctorIds = allDoctors.map(d => d._id);
  if (doctorIds.length === 0) {
    return { page: _page, limit: _limit, total: 0, pages: 1, items: [] };
  }

  // fetch availabilities
  const [avails, appts] = await Promise.all([
    Availability.find({
      doctorId: { $in: doctorIds },
      isBlocked: false,
      start: { $lt: endOfDay },
      end:   { $gt: startOfDay },
    })
      .select('doctorId start end')
      .sort({ doctorId: 1, start: 1 }) // sort in right order
      .lean(),
    Appointment.find({
      doctorId: { $in: doctorIds },
      status: 'BOOKED',
      start: { $lt: endOfDay },
      end:   { $gt: startOfDay },
    })
      .select('doctorId start end')
      .lean(),
  ]);

  // avails and booked hours
  const availsByDoctor = new Map(); // doctorId >>[{start, end}]
  const bookedByDoctor = new Map(); // doctorId >> Set(hour in local hour)

  avails.forEach(a => {
    const key = String(a.doctorId);
    if (!availsByDoctor.has(key)) availsByDoctor.set(key, []);
    availsByDoctor.get(key).push({ start: a.start, end: a.end });
  });

  appts.forEach(a => {
    const key = String(a.doctorId);
    if (!bookedByDoctor.has(key)) bookedByDoctor.set(key, new Set());
    const st = new Date(a.start);
    // build a local "hour key": year, month, day, **local hour**, :00
    const localHourStart = new Date(
      st.getFullYear(), st.getMonth(), st.getDate(),
      st.getHours(), 0, 0, 0
    ).toISOString();
    bookedByDoctor.get(key).add(localHourStart);
  });

  // build items for ALL doctors, compute slots, again, local date, then filter by "has any slots"
  const allItems = allDoctors.map(d => {
    const key = String(d._id);
    const windows = (availsByDoctor.get(key) || [])
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    let slots = [];

    windows.forEach(w => {
      // Clamp to **local** day bounds
      const ws = new Date(Math.max(new Date(w.start).getTime(), startOfDay.getTime()));
      const we = new Date(Math.min(new Date(w.end).getTime(),   endOfDay.getTime()));
      if (ws < we) slots.push(...sliceHourly(ws, we));
    });

    // Exclude booked hours - no duplication
    const taken = bookedByDoctor.get(key) || new Set();
    slots = slots.filter(s => {
      const st = new Date(s.start);
      const localHourKey = new Date(
        st.getFullYear(), st.getMonth(), st.getDate(),
        st.getHours(), 0, 0, 0
      ).toISOString();
      return !taken.has(localHourKey);
    });

    // Show earliest available date
    slots.sort((a, b) => new Date(a.start) - new Date(b.start));

    return {
      doctorId:   d._id,
      doctorName: d.doctorName,
      specialty:  d.specialty,
      email:      d.email,
      phone:      d.phone,
      availableSlots: slots, // [{start, end}]
    };
  });

  // show only doctors that have slots
  const hasSlots = allItems.filter(i => i.availableSlots && i.availableSlots.length > 0);

  // pagination
  const total = hasSlots.length;
  const pages = Math.max(1, Math.ceil(total / _limit));
  const pageStart = (_page - 1) * _limit;
  const items = hasSlots.slice(pageStart, pageStart + _limit);

  return {
    page: _page,
    limit: _limit,
    total,
    pages,
    items,
  };
}

module.exports = { findSlots };
