import { forwardRef } from "react";
import { ShieldCheck, User, FileText, Clock3 } from "lucide-react";

import himachalCrest from "../assets/himachal-crest.png";
import reportWatermark from "../assets/report-watermark.png";
import dummyEvidence from "../assets/dummy_evidence.png";

const PrintableEvidenceReport = forwardRef(
  ({ selectedEvidence, data }, ref) => {
    if (!selectedEvidence) return null;

    const reportId = `HS-${selectedEvidence.created_at
      ?.slice(0, 10)
      .replace(/-/g, "")}-${String(data.incident.id).padStart(4, "0")}`;

    return (
      <div
        ref={ref}
        className="w-[794px] bg-[#FAF7F2] mx-auto flex flex-col p-10 font-sans shadow-2xl"
      >
        <div className="flex-grow space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-start pb-8 border-b border-stone-200 mb-6">
            <div className="flex items-center gap-4">
              <img src={himachalCrest} alt="Crest" className="h-16 w-16" />
              <div>
                <h2 className="text-[32px] font-serif font-bold text-slate-900 leading-none">HimSetu</h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-2">Incident Governance & Resilience Platform</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Report ID</p>
              <p className="font-mono font-black text-slate-900 text-sm mt-0.5">{reportId}</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">EVIDENCE REPORT</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Verified Incident Record</p>
          </div>

          {/* Incident Snapshot */}
          <div className="border border-stone-200 rounded-lg bg-white p-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Incident Snapshot</p>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{data.incident.event_type}</h3>
              <span className="px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-600 border border-red-200">
                  {data.incident.current_state}
              </span>
            </div>
            <div className="border-t border-dashed border-stone-200 my-4" />
            <div className="grid grid-cols-3 gap-8">
              {[{l: "Asset", v: data.asset.name}, {l: "District", v: data.asset.district}, {l: "Asset Type", v: data.asset.asset_type}].map((item, i) => (
                <div key={i}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.l}</p>
                  <p className="font-bold text-slate-900 mt-1">{item.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agency & Evidence Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div className="flex items-center gap-4 p-4 border border-stone-200 rounded-lg bg-white">
                <div className="bg-slate-100 p-3 rounded-lg"><User size={20} className="text-slate-600"/></div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reporting Agency</p>
                    <p className="font-semibold text-slate-900">{selectedEvidence.source}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 p-4 border border-stone-200 rounded-lg bg-white">
                <div className="bg-indigo-50 p-3 rounded-lg"><ShieldCheck size={20} className="text-indigo-600"/></div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evidence Type</p>
                    <p className="font-semibold text-slate-900">Verified Evidence</p>
                </div>
             </div>
          </div>

          {/* Narrative */}
          <div className="border border-stone-200 rounded-lg bg-white p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Incident Narrative</p>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">{selectedEvidence.summary}</p>
          </div>

          {/* Annexure & Metadata */}
          <div className="grid grid-cols-[2fr_1fr] gap-4">
             <div className="border border-stone-200 rounded-lg bg-white p-5">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Annexure A</p>
                    <p className="text-[10px] font-bold text-slate-500">Figure 1</p>
                </div>
                <h3 className="font-bold text-slate-900 mb-3 text-sm">Evidence Photo</h3>
                <img src={dummyEvidence} className="w-full h-40 object-cover rounded-lg border" alt="Evidence" />
                <p className="text-sm font-bold text-slate-900 mt-3">Figure 1. {data.incident.event_type}</p>
                <p className="text-[11px] text-slate-500 mt-1">Photographic evidence of the reported {data.incident.event_type.toLowerCase()} near {data.asset.name}.</p>
             </div>
             
             {/* Metadata with equidistant items and separator lines */}
             <div className="border border-stone-200 rounded-lg bg-white p-5 space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Metadata</h3>
                
                <div className="flex items-center gap-3">
                    <Clock3 size={18} className="text-amber-500"/>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Captured On</p>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{new Date(selectedEvidence.created_at).toLocaleString()}</p>
                    </div>
                </div>
                <hr className="border-stone-100" />
                <div className="flex items-center gap-3">
                    <FileText size={18} className="text-blue-500"/>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Report Generated</p>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{new Date().toLocaleString()}</p>
                    </div>
                </div>
                <hr className="border-stone-100" />
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Verification Status</p>
                    <div className="bg-emerald-50 px-2 py-1 rounded border border-emerald-200 w-fit">
                        <p className="text-[10px] font-black text-emerald-700">VERIFIED</p>
                    </div>
                </div>
             </div>
          </div>
        </div>

        {/* Footer: Moved up using reduced margin-top */}
        <div className="mt-4 border-t border-stone-200 pt-4">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div><p>Generated by</p><p className="text-slate-900 mt-1">HimSetu Incident Governance Platform</p></div>
            <img src={reportWatermark} alt="WM" className="w-40 opacity-[0.45]" />
            <div className="text-right"><p>Document Version</p><p className="text-slate-900 mt-1">v1.0</p></div>
          </div>
        </div>
      </div>
    );
  }
);

export default PrintableEvidenceReport;