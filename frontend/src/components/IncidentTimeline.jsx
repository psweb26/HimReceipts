import { useState, useEffect, useRef } from "react";
import { ShieldCheck, FileText, Clock3, User, X, Download } from "lucide-react";
import himachalCrest from "../assets/himachal-crest.png";
import { downloadEvidencePDF } from "../utils/downloadEvidencePDF";
import EvidenceReport from "./EvidenceReport";
import reportImg from "../assets/report_img.png";

const getStatusColor = (status) => {
  switch (status) {
    case "Active":
      return "bg-red-100 text-red-700";

    case "Warning":
      return "bg-amber-100 text-amber-700";

    case "Forecast":
      return "bg-blue-100 text-blue-700";

    case "Resolved":
      return "bg-emerald-100 text-emerald-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getTimelineDotColor = (state) => {
  switch (state) {
    case "Active":
      return "bg-red-500";

    case "Warning":
      return "bg-amber-500";

    case "Forecast":
      return "bg-blue-500";

    case "Resolved":
      return "bg-emerald-500";

    default:
      return "bg-slate-500";
  }
};

export default function IncidentTimeline({ data }) {
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = selectedEvidence ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedEvidence]);

  if (!data) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        No incident data available.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Timeline */}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-7 py-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Operational Timeline
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Chronological progression of the incident.
            </p>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-xs font-semibold ${getStatusColor(
              data.incident.current_state,
            )}`}
          >
            {data.incident.current_state}
          </span>
        </div>

        <div className="px-7 py-6">
          <div className="relative ml-3 border-l-[3px] border-slate-200">
            {(data.timeline || []).map((step, idx) => (
              <div
                key={`${step.created_at}-${step.to_state}`}
                className="relative ml-6 pb-8 transition-all duration-300 hover:translate-x-1"
              >
                <div className="absolute -left-[58px] top-0 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-500">
                  {String(idx + 1).padStart(2, "0")}
                </div>

                <span
                  className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white shadow ${getTimelineDotColor(
                    step.to_state,
                  )}`}
                />

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-semibold text-slate-900">
                      {step.to_state}
                    </h4>

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      {step.actor}
                    </span>
                  </div>

                  <p className="leading-relaxed text-slate-700">
                    {step.reason}
                  </p>

                  <p className="text-xs text-slate-400">
                    {step.created_at
                      ? new Date(step.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Unknown time"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-7 py-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Evidence Ledger
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Verified supporting records collected during the incident.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {data.evidence?.length || 0}{" "}
            {(data.evidence?.length || 0) === 1 ? "Record" : "Records"}
          </span>
        </div>

        <div className="space-y-4 p-7">
          {!data.evidence || data.evidence.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-slate-500">No evidence records available.</p>
            </div>
          ) : (
            data.evidence.map((ev) => (
              <div
                key={`${ev.created_at}-${ev.source}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xl font-semibold text-slate-900">
                      {ev.source}
                    </h4>

                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Evidence Source
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedEvidence(ev)}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100"
                  >
                    <ShieldCheck size={16} />
                    REPORT
                  </button>
                </div>

                <p className="mt-5 leading-7 text-slate-700">{ev.summary}</p>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase text-indigo-700">
                    {ev.evidence_type}
                  </span>

                  <span className="text-sm text-slate-500">
                    {ev.created_at
                      ? new Date(ev.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Unknown"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Evidence Modal */}

      {selectedEvidence && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedEvidence(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-4">
                <img
                  src={himachalCrest}
                  alt=""
                  className="h-14 w-14 object-contain"
                />

                <div>
                  <h2 className="text-[28px] font-bold tracking-tight">
                    Evidence Report
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Verified Incident Evidence
                  </p>

                  <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    ✓ Verified Digital Record
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const reportId = `HS-${selectedEvidence.created_at
                      ?.slice(0, 10)
                      .replace(
                        /-/g,
                        "",
                      )}-${String(data.incident.id).padStart(4, "0")}`;

                    downloadEvidencePDF(reportRef, reportId);
                  }}
                  className="
      inline-flex
      items-center
      gap-2
      rounded-xl
      border
      border-slate-300
      bg-white
      px-4
      py-2
      text-sm
      font-medium
      text-slate-700
      transition-all
      duration-300
      hover:bg-slate-50
      hover:shadow-md
    "
                >
                  <Download size={18} />
                  Download PDF
                </button>

                <button
                  onClick={() => setSelectedEvidence(null)}
                  className="
      flex
      h-10
      w-10
      items-center
      justify-center
      rounded-full
      transition-all
      duration-300
      hover:bg-red-50
      hover:text-red-600
      hover:rotate-90
    "
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Body */}

            <div className="relative space-y-4 overflow-hidden px-6 py-5">
              <img
                src={reportImg}
                alt=""
                className="
     absolute
    inset-x-0
    -top-12
    w-full
    h-[115%]
    object-cover
    opacity-[0.12]
    pointer-events-none
    select-none
  "
              />

              {/* Source */}

              <div className="relative z-10 mb-7">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-500" />

                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Source
                  </p>
                </div>

                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  {selectedEvidence.source}
                </h3>
              </div>

              {/* Evidence Type + Report ID */}

              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Evidence Type
                  </p>

                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">
                    <ShieldCheck size={16} />

                    <span className="text-sm font-semibold">
                      Official Report
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Report ID
                  </p>

                  <p className="mt-1 font-mono text-xs text-slate-700">
                    {`HS-${selectedEvidence.created_at
                      ?.slice(0, 10)
                      .replace(
                        /-/g,
                        "",
                      )}-${String(data.incident.id).padStart(4, "0")}`}
                  </p>
                </div>
              </div>

              {/* Summary */}

              <div className="relative z-10">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" />

                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Summary
                  </p>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-slate-700 leading-7">
                    {selectedEvidence.summary}
                  </p>
                </div>
              </div>

              {/* Recorded On */}

              <div className="relative z-10">
                <div className="flex items-center gap-2">
                  <Clock3 size={16} className="text-slate-500" />

                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Recorded On
                  </p>
                </div>

                <p className="mt-2 text-sm font-medium text-slate-700">
                  {selectedEvidence.created_at
                    ? new Date(selectedEvidence.created_at).toLocaleString(
                        "en-IN",
                        {
                          dateStyle: "full",
                          timeStyle: "short",
                        },
                      )
                    : "Unknown"}
                </p>
              </div>
            </div>

            {/* Footer */}

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-center rounded-b-3xl">
              <p className="text-[11px] text-slate-400">
                Digitally generated and verified by
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-600">
                HimSetu • Incident Governance & Resilience Platform
              </p>
            </div>
          </div>
        </div>
      )}
      {selectedEvidence && (
        <div className="fixed -left-[9999px] top-0">
          <EvidenceReport
            ref={reportRef}
            selectedEvidence={selectedEvidence}
            data={data}
          />
        </div>
      )}
    </div>
  );
}
