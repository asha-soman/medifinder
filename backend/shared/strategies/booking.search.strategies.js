// backend/shared/strategies/booking.search.strategies.js
class SearchStrategy { buildQuery(_) { throw new Error('implement buildQuery'); } }

class NameSearch extends SearchStrategy {
  buildQuery({ name, specialty, date, page, limit }) {
    return { name, specialty, date, page, limit };
  }
}

class SpecialtySearch extends SearchStrategy {
  buildQuery({ name, specialty, date, page, limit }) {
    return { name, specialty, date, page, limit };
  }
}

class NextAvailableSearch extends SearchStrategy {
  buildQuery({ name, specialty, date, page, limit }) {
    return {
      name,
      specialty,
      date: date || new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      page,
      limit,
    };
  }
}

module.exports = { NameSearch, SpecialtySearch, NextAvailableSearch };
