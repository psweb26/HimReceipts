// frontend/src/pages/IncidentTest.jsx
import { useEffect, useState } from "react";
import IncidentTimeline from "../components/IncidentTimeline";

export default function IncidentTest() {
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Replace '3' with the incident ID you know exists
    fetch("http://localhost:8000/api/incidents/3")
      .then((res) => res.json())
      .then((data) => {
        setIncident(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch failed:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading Ledger...</div>;
  if (!incident) return <div>Incident not found.</div>;

  return (
    <div className="max-w-2xl mx-auto py-10">
      <IncidentTimeline data={incident} />
    </div>
  );
}