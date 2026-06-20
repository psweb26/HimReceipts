import { useState } from 'react';
import { ArrowUpCircle, Building2, CheckCircle2, MapPin } from 'lucide-react';

export default function GrievanceCard({ ticket, onUpvote, onVeto }) {
  const [hasUpvoted, setHasUpvoted] = useState(false);

  // Status mapping leveraging your tailwind index design architecture
  const statusStyles = {
    "Pending": "border-[#D4C5B3] bg-white",
    "Under Verification": "border-sky-200 bg-sky-50/40 text-sky-900",
    "In Progress": "border-[#E29B12] bg-amber-50/20 text-amber-900",
    "Verified Resolved": "border-emerald-200 bg-emerald-50/20 text-emerald-900 shadow-xs",
    "Reopened via Citizen Veto": "border-[#9E1B2C] bg-rose-50/30 text-[#9E1B2C]"
  };

  const handleUpvoteClick = () => {
    if (!hasUpvoted) {
      setHasUpvoted(true);
      if (onUpvote) onUpvote(ticket.ticket_id);
    }
  };

  return (
    <div className={`kathkuni-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${statusStyles[ticket.status] || 'bg-white'}`}>
      <div className="flex flex-col sm:flex-row gap-5">
        
        {/* Upvote Panel Block */}
        <div className="flex sm:flex-col items-center justify-center gap-1.5 bg-[#F5F7FA] px-3 py-2 sm:py-3 rounded-md h-fit self-start border border-[#D4C5B3]">
          <button 
            onClick={handleUpvoteClick}
            disabled={hasUpvoted || ticket.status === 'Verified Resolved'}
            className={`transition-transform active:scale-95 ${hasUpvoted ? 'text-[#9E1B2C]' : 'text-slate-400 hover:text-[#1B3B2B]'}`}
          >
            <ArrowUpCircle className="h-6 w-6 stroke-[2.5]" />
          </button>
          <span className="font-mono text-sm font-black text-[#1B3B2B] tabular-nums">{ticket.upvotes}</span>
        </div>

        {/* Content Panel Block */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1 bg-[#1B3B2B] text-[#F5F7FA] px-2 py-0.5 rounded-sm font-mono text-[9px]">
              LGD #{ticket.lgdCode || 153201}
            </span>
            <span className="flex items-center gap-1 bg-[#F5F7FA] border border-[#D4C5B3] text-slate-600 px-2 py-0.5 rounded-sm">
              <Building2 className="h-3 w-3 text-[#1B3B2B]" /> {ticket.department || "PWD Triage Pool"}
            </span>
            <span className="flex items-center gap-1 bg-[#F5F7FA] border border-[#D4C5B3] text-slate-600 px-2 py-0.5 rounded-sm">
              <MapPin className="h-3 w-3 text-[#9E1B2C]" /> {ticket.district} / {ticket.block} / {ticket.panchayat}
            </span>
            
            {/* Status Custom Badge Ribbon */}
            <span className={`ml-auto font-black px-2 py-0.5 rounded-sm border text-[9px] uppercase tracking-wider ${
              ticket.status === 'Verified Resolved' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' :
              ticket.status === 'Under Verification' ? 'bg-sky-100 border-sky-300 text-sky-800' :
              ticket.status === 'In Progress' ? 'bg-amber-100 border-[#E29B12] text-amber-900 animate-pulse' : 
              ticket.status.includes('Veto') || ticket.status === 'Reopened' ? 'bg-rose-100 border-[#9E1B2C] text-[#9E1B2C]' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}>
              {ticket.status}
            </span>
          </div>

          {/* Core Ticket Content Text */}
          <div>
            <h4 className="text-sm font-bold text-[#1B3B2B] tracking-tight">{ticket.title}</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ticket.description}</p>
          </div>

          {/* Regional Context Tag Badges */}
          <div className="flex gap-2 pt-0.5">
            <span className="text-[10px] bg-white px-2 py-0.5 rounded-sm font-bold text-slate-700 border border-[#D4C5B3] shadow-2xs">
              🏗️ {ticket.infrastructureType}
            </span>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded-sm font-bold text-slate-700 border border-[#D4C5B3] shadow-2xs">
              🏔️ {ticket.terrainRisk}
            </span>
          </div>

          {/* Administrative Closure Actions Block */}
          {ticket.resolutionNotes && (
            <div className="mt-3 bg-[#F5F7FA] rounded-md p-3 border border-[#D4C5B3] space-y-1">
              <p className="text-[9px] font-black uppercase tracking-wider text-[#1B3B2B] flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Administrative Action Closing Logs
              </p>
              <p className="text-xs italic text-slate-700">"{ticket.resolutionNotes}"</p>
            </div>
          )}

          {/* Citizen Veto Command Container Panel */}
          {ticket.status === 'Verified Resolved' && (
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 p-3 bg-rose-50/40 border border-[#D4C5B3] rounded-md animate-in fade-in zoom-in-95">
              <div className="text-left">
                <p className="text-xs font-bold text-[#9E1B2C]">Is this public work repair fully completed on the ground?</p>
                <p className="text-[10px] text-slate-600">If the municipal fix is unsatisfactory, file a verification veto to push it back into evaluation queue lists.</p>
              </div>
              <button
                onClick={() => onVeto && onVeto(ticket.ticket_id)}
                className="w-full sm:w-auto sm:ml-auto px-3 py-1.5 bg-[#9E1B2C] hover:bg-[#801422] text-[#F5F7FA] text-[10px] font-bold rounded-sm shadow-xs transition uppercase tracking-wider shrink-0"
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
