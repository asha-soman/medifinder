import { Outlet } from "react-router-dom";
import Footer from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

export default function PatientLayout() {
  return (
    <>
      <SiteHeader />
      <Outlet />
      <Footer />
    </>
  );
}
