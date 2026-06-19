import { useState } from 'react';
import { ArrowUpCircle, Building2, CheckCircle2, MapPin } from 'lucide-react';

export default function GrievanceCard({ ticket, onUpvote, onVeto }) {
  const [hasUpvoted, setHasUpvoted] = useState(false);

  const statusStyles = {
    "Pending": "border-[#eae8e0] bg-white",
    "Under Verification": "border-sky-200 bg-sky-50/30 text-sky-900",
    "In Progress": "border-orange-200 bg-orange-50/30 text-orange-900",
    "Verified Resolved": "border-emerald-200 bg-emerald-50/20 text-emerald-900 shadow-sm",
    "Reopened": "border-rose-200 bg-rose-50/30 text-rose-900"
  };

  const handleUpvoteClick = () => {
    if (!hasUpvoted) {
      setHasUpvoted(true);
      if (onUpvote) onUpvote(ticket.ticket_id);
    }
  };

  return (
    <div className={`overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${statusStyles[ticket.status] || 'border-[#eae8e0] bg-white'}`}>
      <div className="flex flex-col sm:flex-row gap-5">
        
        <div className="flex sm:flex-col items-center justify-center gap-1.5 bg-[#f4f3ef] px-3 py-2 sm:py-3 rounded-xl h-fit self-start border border-[#eae8e0]">
          <button 
            onClick={handleUpvoteClick}
            disabled={hasUpvoted || ticket.status === 'Verified Resolved'}
            className={`transition-transform active:scale-95 ${hasUpvoted ? 'text-blue-600' : 'text-gray-400 hover:text-[#1a2332]'}`}
          >
            <ArrowUpCircle className="h-6 w-6 stroke-[2.5]" />
          </button>
          <span className="font-mono text-sm font-black text-[#1a2332] tabular-nums">{ticket.upvotes}</span>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span className="flex items-center gap-1 bg-[#1a2332] text-white px-2 py-0.5 rounded font-mono text-[9px]">
              LGD #{ticket.lgdCode || 153201}
            </span>
            <span className="flex items-center gap-1 bg-gray-50 border border-[#eae8e0] text-zinc-600 px-2 py-0.5 rounded">
              <Building2 className="h-3 w-3" /> {ticket.department || "PWD Triage Pool"}
            </span>
            <span className="flex items-center gap-1 bg-gray-50 border border-[#eae8e0] text-zinc-600 px-2 py-0.5 rounded">
              <MapPin className="h-3 w-3" /> {ticket.district} / {ticket.block} / {ticket.panchayat}
            </span>
            
            <span className={`ml-auto font-black px-2 py-0.5 rounded border text-[9px] uppercase tracking-wider ${
              ticket.status === 'Verified Resolved' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' :
              ticket.status === 'Under Verification' ? 'bg-sky-100 border-sky-300 text-sky-800' :
              ticket.status === 'In Progress' ? 'bg-orange-100 border-orange-300 text-orange-800 animate-pulse' : 
              ticket.status === 'Reopened' ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-gray-100 border-gray-300 text-gray-700'
            }`}>
              {ticket.status}
            </span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#1a2332] tracking-tight">{ticket.title}</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{ticket.description}</p>
          </div>

          <div className="flex gap-2 pt-0.5">
            <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-md font-semibold text-zinc-600 border border-zinc-200/40">
              {ticket.infrastructureType}
            </span>
            <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-md font-semibold text-zinc-600 border border-zinc-200/40">
              {ticket.terrainRisk}
            </span>
          </div>

          {ticket.resolutionNotes && (
            <div className="mt-3 bg-[#f4f3ef]/60 rounded-xl p-3 border border-[#eae8e0] space-y-1">
              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Administrative Action Closing Logs
              </p>
              <p className="text-xs italic text-zinc-600">"{ticket.resolutionNotes}"</p>
            </div>
          )}

          {ticket.status === 'Verified Resolved' && (
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl animate-in fade-in zoom-in-95">
              <div className="text-left">
                <p className="text-xs font-bold text-blue-900">Is this public work repair fully completed on the ground?</p>
                <p className="text-[10px] text-blue-700">If the municipal fix is unsatisfactory, file a verification veto to push it back into evaluation queue lists.</p>
              </div>
              <button
                onClick={() => onVeto && onVeto(ticket.ticket_id)}
                className="w-full sm:w-auto sm:ml-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg shadow-xs transition uppercase tracking-wider shrink-0"
              >
                Trigger Citizen Veto
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
