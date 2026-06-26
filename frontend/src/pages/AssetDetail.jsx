import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`http://localhost:8000/api/assets/${id}`).then((r) => r.json()),
      fetch(`http://localhost:8000/api/assets/${id}/incidents`).then((r) => r.json()),
    ])
      .then(([assetData, incidentData]) => {
        setAsset(assetData);
        setIncidents(incidentData.incidents || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-center text-slate-500">Loading Registry...</div>;
  if (!asset) return <div className="p-10 text-center text-red-500">Asset not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{asset.name}</h1>
        <div className="flex gap-4 mt-2 text-sm text-slate-500">
          <span className="bg-slate-100 px-2 py-1 rounded">{asset.asset_type}</span>
          <span className="font-medium text-slate-700">District: {asset.district}</span>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4">Incident Ledger</h2>
        {incidents.length === 0 ? (
          <div className="bg-slate-50 p-6 rounded-xl border border-dashed text-center text-slate-500">
            No active incidents reported for this asset.
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.incident_id}
                onClick={() => navigate(`/incidents/${incident.incident_id}`)}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all"
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-slate-800">{incident.event_type}</p>
                  <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium">
                    {incident.current_state}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">ID: {incident.incident_id}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}