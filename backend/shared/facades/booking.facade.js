// backend/shared/facades/booking.facade.js
const appointmentsController = require('../../controllers/appointments.controller');
const { NameSearch, SpecialtySearch, NextAvailableSearch } =
  require('../strategies/booking.search.strategies');

// search doctors & availability
async function searchDoctorsFacade(req, res) {
  const q = req.query || {};
  let strategy;
  if (q.name) strategy = new NameSearch();
  else if (q.specialty) strategy = new SpecialtySearch();
  else strategy = new NextAvailableSearch();

  req.query = strategy.buildQuery(q); // keep param names your controller expects
  return appointmentsController.searchDoctors(req, res);
}

// book, update, cancel appointments
const bookAppointmentFacade     = (req, res) => appointmentsController.bookAppointment(req, res);
const updateAppointmentFacade   = (req, res) => appointmentsController.updateAppointment(req, res);
const cancelAppointmentFacade   = (req, res) => appointmentsController.cancelAppointment(req, res);
const getMyAppointmentsFacade   = (req, res) => appointmentsController.getMyAppointments(req, res);

module.exports = {
  searchDoctorsFacade,
  bookAppointmentFacade,
  updateAppointmentFacade,
  cancelAppointmentFacade,
  getMyAppointmentsFacade,
};
