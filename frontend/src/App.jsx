import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./layouts/AppLayout";
import PatientLayout from "./layouts/PatientLayout";



// public pages and dashboard (did not change anything with the logic)
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Landing from "./pages/Landing";
import DoctorProfile from "./pages/DoctorProfile";
import PatientProfile from "./pages/PatientProfile";
import History from "./pages/History";
import Notification from "./pages/Notification";




// patient booking pages
import SearchDoctor from "./pages/SearchDoctor";
import BookAppointment from "./pages/BookAppointment";
import MyAppointments from "./pages/MyAppointments";


// doctor availability pages
import DoctorAvailability from "./pages/DoctorAvailability";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/doctor/profile"
              element={
                <RequireAuth role="doctor">
                  <DoctorProfile />
                </RequireAuth>
              }
            />
            <Route
              path="/patient/profile"
              element={
                <RequireAuth role="patient">
                  <PatientProfile />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Login />} />
          </Route>

          {/** Patient Booking Section- */}
          <Route
            element={
              <RequireAuth role="patient">
                <PatientLayout /> {/* pulls the layout for patients */}
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/patient/search" replace />} />
            <Route path="/patient/search" element={<SearchDoctor />} />
            <Route path="/patient/book" element={<BookAppointment />} />
            <Route path="/patient/my-appointments" element={<MyAppointments />} />
            <Route path="/patient/history" element={<History />} />
            <Route path="/patient/notifications" element={<Notification />} />
          </Route>
          <Route
            path="/doctor/availability"
            element={
              <RequireAuth role="doctor">
                <DoctorAvailability />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
