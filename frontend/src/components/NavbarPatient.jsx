// src/components/NavbarPatient.jsx
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "./NavbarPatient.css";

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // plug real auth later
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" aria-label="MediFinder Home">
          <img className="logo" src={logo} alt="MediFinder" />
        </Link>

        <div className="navbar-links">
          <Link to="/patient/search">Find a Doctor</Link>
          <Link to="/patient/my-appointments">My Appointments</Link>
          <Link to="/patient/history">History</Link>
          <Link to="/patient/notifications">Notification</Link>
          <Link to="/patient/profile">Profile</Link>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
