import { Outlet } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export default function AppLayout({ withHeader = true }) {
  return (
    <>
      {withHeader && <SiteHeader />}
      <Outlet />
      <SiteFooter />
    </>
  );
}
