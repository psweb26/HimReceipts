import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import IncidentTimeline from "../components/IncidentTimeline";
import {
  MapPin,
  FileText,
  Clock3,
  TriangleAlert,
  FileCheck2,
  Map,
} from "lucide-react";

const getStatusClasses = (status) => {
  switch (status) {
    case "Active":
      return "bg-red-50 text-red-700 border-red-100";

    case "Warning":
      return "bg-amber-50 text-amber-700 border-amber-100";

    case "Forecast":
      return "bg-blue-50 text-blue-700 border-blue-100";

    case "Resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";

    default:
      return "bg-slate-50 text-slate-700 border-slate-100";
  }
};

function MetricCard({ icon, title, value }) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1
hover:border-slate-300
hover:shadow-xl"
    >
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">
          {title}
        </p>
      </div>

      <p className="mt-5 text-[22px] font-bold leading-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

export default function IncidentPage() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const openMap = () => {
    window.open(
      `https://www.google.com/maps?q=${data.asset.lat},${data.asset.lon}`,
      "_blank",
    );
  };

  useEffect(() => {
    fetch(`http://localhost:8000/api/incidents/${id}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error("Failed to load incident");
        }
        return r.json();
      })
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, [id]);

  if (error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  if (!data) {
    return (
      <div className="p-10 text-center text-slate-500">Loading Incident...</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 space-y-10">
      {/* Executive Header */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 shadow-md p-7">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                {data.asset.name}
              </h1>

              <span
                className={`inline-flex items-center rounded-full border px-5 py-2 text-sm font-semibold ${getStatusClasses(
                  data.incident.current_state,
                )}`}
              >
                {data.incident.current_state}
              </span>
            </div>

            <p className="mt-3 text-lg text-slate-500">
              {data.asset.asset_type} • {data.asset.district} District
            </p>
          </div>

          <button
            type="button"
            onClick={openMap}
            title="GIS map integration coming soon"
            className="
group
inline-flex
items-center
gap-2
rounded-xl
border
border-slate-300
bg-white
px-5
py-3
text-sm
font-medium
text-slate-700
shadow-sm
transition-all
duration-300
hover:bg-slate-50
hover:shadow-md
"
          >
            <Map
              size={18}
              className="transition-transform duration-300 group-hover:rotate-6"
            />
            View on Map
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-7 pt-6 border-t border-slate-200">
          <MetricCard
            icon={<TriangleAlert size={18} className="text-red-500" />}
            title="Incident Type"
            value={
              <div className="space-y-2">
                <div className="text-xl font-bold">
                  {data.incident.event_type}
                </div>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>

                  <span className="text-sm font-medium text-red-700">
                    High Priority
                  </span>
                </div>
              </div>
            }
          />

          <MetricCard
            icon={<FileText size={18} className="text-indigo-500" />}
            title="Evidence Records"
            value={
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                  <FileCheck2 size={18} className="text-indigo-600" />
                </div>

                <div>
                  <p className="text-2xl font-bold leading-none text-slate-900">
                    {data.summary.evidence_count}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Verified Reports
                  </p>
                </div>
              </div>
            }
          />

          <MetricCard
            icon={<Clock3 size={18} className="text-amber-500" />}
            title="Last Updated"
            value={
              <div className="leading-tight">
                <div>
                  {`${new Date(data.summary.last_updated).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                    },
                  )} '${String(
                    new Date(data.summary.last_updated).getFullYear(),
                  ).slice(-2)}`}
                </div>

                <div className="mt-1 text-base font-semibold text-slate-600">
                  {new Date(data.summary.last_updated).toLocaleTimeString(
                    "en-IN",
                    {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    },
                  )}
                </div>
              </div>
            }
          />

          <MetricCard
            icon={<MapPin size={18} className="text-emerald-500" />}
            title="Coordinates"
            value={
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500">
                    Lat
                  </span>

                  <span className="font-semibold text-slate-900">
                    {data.asset.lat.toFixed(3)}° N
                  </span>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500">
                    Lon
                  </span>

                  <span className="font-semibold text-slate-900">
                    {data.asset.lon.toFixed(3)}° E
                  </span>
                </div>
              </div>
            }
          />
        </div>
      </div>

      {/* Incident Narrative */}
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-xl overflow-hidden">
        <div className="px-8 py-7 border-b border-slate-200 bg-gradient-to-r from-slate-100 via-white to-slate-50">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {data.incident.event_type}
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-500">
            Operational timeline, audit history and supporting evidence.
          </p>
        </div>

        <div className="p-8">
          <IncidentTimeline data={data} />
        </div>
      </section>
    </div>
  );
}
