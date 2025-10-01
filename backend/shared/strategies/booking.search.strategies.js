//Note: for design pattern part of the report, i made this exp:
//This is for searching doctors based on parameters like name, specialization, and date
//Also autofills teh date with the current date.

class SearchStrategy { buildQuery(_) { throw new Error('implement buildQuery'); } }

class NameSearch extends SearchStrategy {
  buildQuery({ name, specialization, date, page, limit }) {
    return { name, specialization, date, page, limit };
  }
}

class SpecialtySearch extends SearchStrategy { // (name kept for backward-compat)
  buildQuery({ name, specialization, date, page, limit }) {
    return { name, specialization, date, page, limit };
  }
}

class NextAvailableSearch extends SearchStrategy {
  buildQuery({ name, specialization, date, page, limit }) {
    return {
      name,
      specialization,
      date: date || new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      page,
      limit,
    };
  }
}

module.exports = { NameSearch, SpecialtySearch, NextAvailableSearch };

