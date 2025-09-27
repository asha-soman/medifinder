import { Link } from "react-router-dom";
import "./site-footer.css";

export default function SiteFooter() {
  return (
    <footer className="mf-footer">
      <div className="mf-footer__inner">
        <div className="mf-col">
          <div className="mf-brand">
            <span className="mf-brand__icon">＋</span>
            <span className="mf-brand__text">
              <b>Medi</b>Finder
            </span>
          </div>
          <p className="mf-copy">
            Copyright © {new Date().getFullYear()} Medifinder
            <br />
            All Rights Reserved
          </p>
        </div>

        <div className="mf-col">
          <h4>For Patients</h4>
          <ul>
            <li>
              <Link to="/patient/dashboard">Find a Doctor</Link>
            </li>
            <li>
              <Link to="/patient/dashboard">Manage your appointment</Link>
            </li>
            <li>
              <Link to="/patient/dashboard">Consultation History</Link>
            </li>
          </ul>
        </div>

        <div className="mf-col">
          <h4>For Doctor</h4>
          <ul>
            <li>
              <Link to="/doctor/dashboard">Upcoming Patients</Link>
            </li>
            <li>
              <Link to="/doctor/dashboard">Manage your Schedule</Link>
            </li>
            <li>
              <Link to="/doctor/dashboard">Consultation Records</Link>
            </li>
          </ul>
        </div>

        <div className="mf-col">
          <h4>Contact Us</h4>
          <ul className="mf-contact">
            <li>Phone: (07) 1234 5678</li>
            <li>Fax: (07) 9876 5432</li>
            <li>
              Email:{" "}
              <a href="mailto:contactus@medicare.au">contactus@medicare.au</a>
            </li>
          </ul>
        </div>

        <div className="mf-col">
          <h4>Follow us</h4>
          <ul className="mf-social">
            <li>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                Facebook
              </a>
            </li>
            <li>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
              >
                Twitter
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
