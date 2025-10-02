import { Link } from "react-router-dom";
import "./site-footer.css";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-container container-fluid">
        <div className="footer-brand">
          <span className="footer-logo" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 32 32" role="img" aria-label="MediFinder logo">
              <rect x="13" y="6" width="6" height="20" rx="1.5" fill="#173e59" />
              <rect x="6" y="13" width="20" height="6" rx="1.5" fill="#173e59" />
            </svg>
          </span>
          <span className="footer-brand-text">
            <span className="footer-brand-medi">Medi</span>Finder
          </span>

          <div className="footer-copy">
            <div>Copyright © {new Date().getFullYear()} MediFinder</div>
            <div>All Rights Reserved</div>
          </div>
        </div>

        <div className="footer-col">
          <h6 className="footer-title">For Patients</h6>
          <ul className="footer-links">
            <li><Link to="/patient/dashboard" className="footer-link">Find a Doctor</Link></li>
            <li><Link to="/patient/dashboard" className="footer-link">Manage your appointment</Link></li>
            <li><Link to="/patient/dashboard" className="footer-link">Consultation History</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h6 className="footer-title">For Doctor</h6>
          <ul className="footer-links">
            <li><Link to="/doctor/dashboard" className="footer-link">Upcoming Patients</Link></li>
            <li><Link to="/doctor/dashboard" className="footer-link">Manage your Schedule</Link></li>
            <li><Link to="/doctor/dashboard" className="footer-link">Consultation Records</Link></li>
          </ul>
        </div>

        <div className="footer-col footer-col-contact">
          <h6 className="footer-title">Contact Us</h6>
          <ul className="footer-contact">
            <li><span className="footer-contact-label">Phone:</span> <a className="footer-link" href="tel:+61712345678">(07) 1234 5678</a></li>
            <li><span className="footer-contact-label">Fax:</span> (07) 9876 5432</li>
            <li><span className="footer-contact-label">Email:</span> <a className="footer-link" href="mailto:contactus@medicare.au">contactus@medicare.au</a></li>
          </ul>
        </div>

        <div className="footer-col footer-col-social">
          <h6 className="footer-title">Follow us</h6>
          <ul className="footer-social">
            <li>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="footer-social-btn"
              >
                <i className="bi bi-facebook"></i><span>Facebook</span>
              </a>
            </li>
            <li>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="footer-social-btn"
              >
                <i className="bi bi-twitter"></i><span>Twitter</span>
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="footer-social-btn"
              >
                <i className="bi bi-instagram"></i><span>Instagram</span>
              </a>
            </li>
            <li>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="footer-social-btn"
              >
                <i className="bi bi-linkedin"></i><span>LinkedIn</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
