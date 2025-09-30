// backend/services/slots.service.js
const Availability  = require('../models/availability.model');
const Appointment   = require('../models/appointment.model');
const User          = require('../models/user.model');
const DoctorProfile = require('../models/doctorProfile.model');

// slice availability into 60 minutes interval
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

async function loadDoctorsAndCount(doctorFilters, sort, skip, limit, forNoDatePage) {
  const userQuery = { role: 'DOCTOR' };
  if (doctorFilters.$or) {
    const rx = doctorFilters.$or.find(x => x.doctorName)?.doctorName
            || doctorFilters.$or.find(x => x.email)?.email;
    if (rx) userQuery.$or = [{ name: rx }, { email: rx }];
  }

  const users = await User.find(userQuery)
    .select('_id name email')
    .lean();

  if (users.length === 0) {
    return { total: 0, doctors: [] };
  }

  const userIds = users.map(u => u._id);
  let profiles = await DoctorProfile.find({ userId: { $in: userIds } })
    .select('userId specialization clinicName contact')
    .lean();

  // specialization filter
  if (doctorFilters.specialization && doctorFilters.specialization !== 'All') {
    const rx = new RegExp(`^${doctorFilters.specialization}$`, 'i');
    profiles = profiles.filter(p => rx.test(p.specialization || ''));
  }

  // Join user + profile
  const userById = new Map(users.map(u => [String(u._id), u]));
  let joined = profiles.map(p => {
    const u = userById.get(String(p.userId));
    if (!u) return null;
    return {
      _id: u._id,
      doctorName: u.name || 'Doctor',
      specialization: p.specialization || '',
      email: u.email || '',
      phone: p.contact || ''
    };
  }).filter(Boolean);

  // Sort by doctorName
  if (sort && sort.doctorName) {
    const dir = sort.doctorName;
    joined.sort((a, b) => {
      const an = (a.doctorName || '').toLowerCase();
      const bn = (b.doctorName || '').toLowerCase();
      return dir > 0 ? an.localeCompare(bn) : bn.localeCompare(an);
    });
  }

  // For the "no date" branch, paginate here.
  // For the "with date" branch paginate after filtering
  if (forNoDatePage) {
    const total = joined.length;
    const paged = joined.slice(skip, skip + limit);
    return { total, doctors: paged, all: joined };
  }

  return { total: joined.length, doctors: joined, all: joined };
}

async function findSlots({ date, specialization, name, page = 1, limit = 5 }) {
  const doctorFilters = {};
  if (specialization && specialization !== 'All') doctorFilters.specialization = specialization;
  if (name) {
    const rx = new RegExp(name.trim(), 'i');
    doctorFilters.$or = [{ doctorName: rx }, { email: rx }];
  }

  const sort = { doctorName: 1 };
  const _page  = Number(page)  || 1;
  const _limit = Number(limit) || 5;
  const skip   = (_page - 1) * _limit;

  // No date filter: paginate doctors as-is
  if (!date) {
    const { total, doctors } = await loadDoctorsAndCount(doctorFilters, sort, skip, _limit, true);

    const items = doctors.map(d => ({
      doctorId:   d._id,
      doctorName: d.doctorName,
      specialization: d.specialization,
      email:      d.email,
      phone:      d.phone,
      availableSlots: [],
    }));

    return {
      page: _page,
      limit: _limit,
      total,
      pages: Math.max(1, Math.ceil(total / _limit)),
      items,
    };
  }

  // Has Date filter present, filter by "with slots" before paginate
  const [Y, M, D] = date.split('-').map(Number);
  const startOfDay = new Date(Y, M - 1, D, 0, 0, 0, 0);
  const endOfDay   = new Date(Y, M - 1, D, 23, 59, 59, 999);

  // Load all doctors
  const { doctors: allDoctors } = await loadDoctorsAndCount(doctorFilters, sort, 0, 0, false);
  const doctorIds = allDoctors.map(d => d._id);
  if (doctorIds.length === 0) {
    return { page: _page, limit: _limit, total: 0, pages: 1, items: [] };
  }

  // fetch availabilities and already-taken hours
  const [avails, appts] = await Promise.all([
    Availability.find({
      doctorId: { $in: doctorIds },
      isBlocked: false,
      start: { $lt: endOfDay },
      end:   { $gt: startOfDay },
    })
      .select('doctorId start end')
      .sort({ doctorId: 1, start: 1 })
      .lean(),
    Appointment.find({
      doctorId: { $in: doctorIds },
      status: { $in: ['BOOKED', 'COMPLETED'] },
      start: { $lt: endOfDay },
      end:   { $gt: startOfDay },
    })
      .select('doctorId start end')
      .lean(),
  ]);

  // avails and booked hours
  const availsByDoctor = new Map();
  const bookedByDoctor = new Map();

  avails.forEach(a => {
    const key = String(a.doctorId);
    if (!availsByDoctor.has(key)) availsByDoctor.set(key, []);
    availsByDoctor.get(key).push({ start: a.start, end: a.end });
  });

  appts.forEach(a => {
    const key = String(a.doctorId);
    if (!bookedByDoctor.has(key)) bookedByDoctor.set(key, new Set());
    const st = new Date(a.start);
    const localHourStart = new Date(
      st.getFullYear(), st.getMonth(), st.getDate(),
      st.getHours(), 0, 0, 0
    ).toISOString();
    bookedByDoctor.get(key).add(localHourStart);
  });

  // compute slots, again, local date, then filter by available
  const allItems = allDoctors.map(d => {
    const key = String(d._id);
    const windows = (availsByDoctor.get(key) || [])
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    let slots = [];

    windows.forEach(w => {
      // Clamp to local day bounds
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
      specialization: d.specialization,
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