import { Outlet } from "react-router-dom";
import Navbar from "../components/NavbarPatient";
import Footer from "../components/SiteFooter";

export default function PatientLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}
