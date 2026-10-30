import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div><p className="brand" style={{ color: "#fff" }}>Yatra<span>AI</span></p>
            <p className="small">An AI travel companion for every state and union territory of India. Estimates are illustrative, this app cannot make bookings, and the destination list is a seed catalogue rather than all of India.</p></div>
          <div><h4>Discover</h4><ul><li><Link to="/explore">Explore</Link></li><li><Link to="/states">All states</Link></li><li><Link to="/collections">Collections</Link></li><li><Link to="/seasons">By season</Link></li><li><Link to="/weekend">Weekend finder</Link></li></ul></div>
          <div><h4>Plan</h4><ul><li><Link to="/plan">Itinerary builder</Link></li><li><Link to="/chat">AI planner</Link></li><li><Link to="/map">Map</Link></li><li><Link to="/compare">Compare</Link></li></ul></div>
          <div><h4>About</h4><ul><li><Link to="/about">About</Link></li><li><Link to="/help">Help and FAQ</Link></li><li><Link to="/contact">Contact and feedback</Link></li><li><Link to="/privacy">Privacy (draft)</Link></li><li><Link to="/terms">Terms (draft)</Link></li></ul></div>
        </div>
        <p className="xs" style={{ marginTop: "2rem" }}>Photos from Wikimedia Commons under their own licenses, credited on each image.</p>
      </div>
    </footer>
  );
}
