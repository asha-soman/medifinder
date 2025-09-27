import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./layouts/AppLayout";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Everything under AppLayout gets the footer */}
          <Route element={<AppLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              path="/patient/dashboard"
              element={
                <RequireAuth role="patient">
                  <PatientDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/doctor/dashboard"
              element={
                <RequireAuth role="doctor">
                  <DoctorDashboard />
                </RequireAuth>
              }
            />

            <Route path="*" element={<Login />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
