import { useState } from 'react';
import { MapPin, Upload } from 'lucide-react';
import { HIMACHAL_ADMIN_HIERARCHY, TERRAIN_RISKS, INFRASTRUCTURE_TYPES } from '../utils/himachalRegions';

export default function GrievanceForm({ onSubmission, backendUrl }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dist, setDist] = useState("Kullu");
  const [block, setBlock] = useState("Bhuntar");
  const [panchayat, setPanchayat] = useState("Sainj");
  const [infra, setInfra] = useState("Connecting Bailey Bridge");
  const [risk, setRisk] = useState("Flash Flood Khud Proximity");
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState("");

  const blockOptions = Object.keys(HIMACHAL_ADMIN_HIERARCHY[dist] || {});
  const panchayatOptions = HIMACHAL_ADMIN_HIERARCHY[dist]?.[block] || [];

  const handleCommit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !desc.trim()) return;

    const bodyFormData = new FormData();
    bodyFormData.append("title", title.trim());
    bodyFormData.append("description", desc.trim());
    bodyFormData.append("district", dist);
    bodyFormData.append("block", block);
    bodyFormData.append("panchayat", panchayat);
    bodyFormData.append("terrainRisk", risk);
    bodyFormData.append("infrastructureType", infra);
    bodyFormData.append("administrative_unit", `Office of Municipal Council, ${block}`);
    bodyFormData.append("lgd_code", "153201");
    if (coords) {
      bodyFormData.append("latitude", coords.lat);
      bodyFormData.append("longitude", coords.lng);
    }

    try {
      const res = await fetch(`${backendUrl}/api/grievances`, { method: "POST", body: bodyFormData });
      if (res.ok) {
        setTitle(""); setDesc(""); setCoords(null);
        if (onSubmission) onSubmission();
      } else {
        setError("Database constraints verification failed.");
      }
    } catch {
      setError("Network bridge connection failure.");
    }
  };

  return (
    <form onSubmit={handleCommit} className="bg-white rounded-2xl border border-[#eae8e0] p-5 space-y-4 shadow-sm h-fit">
      <div>
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">File Infrastructure Grievance</h3>
        <p className="text-xs text-gray-400">Anchor situational hazard reports directly into local agency workflows.</p>
      </div>
      
      <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
        <span>Incident Summary Header</span>
        <input type="text" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Summary profile title..." className="w-full rounded-lg border border-[#eae8e0] bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none mt-1 focus:border-[#1a2332]" required />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
          <span>District Focus</span>
          <select value={dist} onChange={(e)=>{setDist(e.target.value); const b = Object.keys(HIMACHAL_ADMIN_HIERARCHY[e.target.value])[0]; setBlock(b); setPanchayat(HIMACHAL_ADMIN_HIERARCHY[e.target.value][b][0]);}} className="w-full rounded-lg border border-[#eae8e0] bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none mt-1 focus:border-[#1a2332]">
            {Object.keys(HIMACHAL_ADMIN_HIERARCHY).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
          <span>Block Unit</span>
          <select value={block} onChange={(e)=>{setBlock(e.target.value); setPanchayat(HIMACHAL_ADMIN_HIERARCHY[dist][e.target.value][0]);}} className="w-full rounded-lg border border-[#eae8e0] bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none mt-1 focus:border-[#1a2332]">
            {blockOptions.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
        <span>Ward / Gram Panchayat Boundary</span>
        <select value={panchayat} onChange={(e)=>setPanchayat(e.target.value)} className="w-full rounded-lg border border-[#eae8e0] bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none mt-1 focus:border-[#1a2332]">
          {panchayatOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
          <span>Infrastructure Link</span>
          <select value={infra} onChange={(e)=>setInfra(e.target.value)} className="w-full rounded-lg border border-[#eae8e0] bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none mt-1 focus:border-[#1a2332]">
            {INFRASTRUCTURE_TYPES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
          <span>Terrain Danger Vector</span>
          <select value={risk} onChange={(e)=>setRisk(e.target.value)} className="w-full rounded-lg border border-[#eae8e0] bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none mt-1 focus:border-[#1a2332]">
            {TERRAIN_RISKS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
        <span>Geospatial Index (GPS Embed)</span>
        <button type="button" onClick={()=>setCoords({lat:"31.7087", lng:"76.9320"})} className="flex items-center justify-center gap-2 border border-dashed border-[#eae8e0] bg-[#f4f3ef]/50 p-2.5 rounded-xl text-xs font-bold text-zinc-600 w-full mt-1 hover:bg-[#f4f3ef] transition">
          <MapPin className="h-4 w-4" /> {coords ? `Locked Node: 31.7087°N` : "Tap to Secure Geographical Pin Lock"}
        </button>
      </label>

      <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
        <span>Descriptive Diagnostic Logs</span>
        <textarea value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Provide descriptive structural flaw details..." className="w-full rounded-lg border border-[#eae8e0] bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none mt-1 min-h-20 resize-none focus:border-[#1a2332]" required />
      </label>

      <label className="grid gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
        <span>Photographic Evidence Log</span>
        <div className="border border-dashed border-[#eae8e0] p-3 rounded-xl text-center relative hover:bg-zinc-50 transition cursor-pointer mt-1">
          <input type="file" disabled className="absolute inset-0 opacity-0 cursor-not-allowed" />
          <Upload className="h-4 w-4 text-zinc-400 mx-auto mb-1" />
          <p className="text-[10px] text-zinc-500 font-semibold">Camera capture streaming ready</p>
        </div>
      </label>

      {error && <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 p-2 rounded-lg">{error}</div>}

      <button type="submit" className="w-full bg-[#1a2332] text-white p-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#233044] transition shadow-xs">
        Transmit Grievance Summary
      </button>
    </form>
  );
}