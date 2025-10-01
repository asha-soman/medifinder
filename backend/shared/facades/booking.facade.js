//for teh report:
//combine submodules like searchDoctors, bookAppointment, update, cancel, and getMyAppointments
//behind a single interface.
const appointmentsController = require('../../controllers/appointments.controller');
const { NameSearch, SpecialtySearch, NextAvailableSearch } =
  require('../strategies/booking.search.strategies');

// search doctors & availability
async function searchDoctorsFacade(req, res) {
  const q = req.query || {};
  let strategy;
  if (q.name) strategy = new NameSearch();
  else if (q.specialization) strategy = new SpecialtySearch();
  else strategy = new NextAvailableSearch();

  // query for controller
  req.query = strategy.buildQuery({
    name: q.name,
    specialization: q.specialization,
    date: q.date,
    page: q.page,
    limit: q.limit,
  });

  return appointmentsController.searchDoctors(req, res);
}

// book, update, cancel appointments
const bookAppointmentFacade   = (req, res) => appointmentsController.bookAppointment(req, res);
const updateAppointmentFacade = (req, res) => appointmentsController.updateAppointment(req, res);
const cancelAppointmentFacade = (req, res) => appointmentsController.cancelAppointment(req, res);
const getMyAppointmentsFacade = (req, res) => appointmentsController.getMyAppointments(req, res);

module.exports = {
  searchDoctorsFacade,
  bookAppointmentFacade,
  updateAppointmentFacade,
  cancelAppointmentFacade,
  getMyAppointmentsFacade,
};
