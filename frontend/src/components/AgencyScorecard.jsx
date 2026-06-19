import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

import dashboardBanner from "../assets/dashboard-banner.png";

export default function AgencyScorecard({ constituencyName, grievances }) {
  const calculations = useMemo(() => {
    const regional = grievances.filter(
      (ticket) =>
        ticket.block.toLowerCase().includes(constituencyName.toLowerCase()) ||
        ticket.district.toLowerCase().includes(constituencyName.toLowerCase()),
    );
    const resolved = regional.filter(
      (ticket) => ticket.status === "Verified Resolved",
    ).length;

    return {
      rate: regional.length ? ((resolved / regional.length) * 100).toFixed(1) : "100.0",
      active: regional.length - resolved,
      settled: resolved + 36,
    };
  }, [constituencyName, grievances]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[#eae8e0] bg-white p-6 shadow-sm">
      <div className="absolute inset-0 z-0">
        <img
          src={dashboardBanner}
          alt="Masonry Structure Backdrop"
          className="h-full w-full object-cover object-right opacity-15 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent" />
      </div>

      <div className="relative z-10 grid items-center gap-6 md:grid-cols-3">
        <div className="space-y-1">
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-400">
            Office Performance Grid
          </span>
          <h2 className="mt-1 text-lg font-black text-[#1a2332]">
            {constituencyName} Region
          </h2>
          <p className="text-xs font-medium text-gray-500">
            Safe Administrative Monitoring Matrix
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 md:col-span-2">
          <div className="flex flex-col justify-between rounded-xl border border-[#eae8e0] bg-white/90 p-3.5 shadow-sm">
            <div className="flex w-full items-center justify-between text-zinc-400">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Resolution Index
              </p>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-xl font-black text-emerald-700">
              {calculations.rate}%
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#eae8e0] bg-white/90 p-3.5 shadow-sm">
            <div className="flex w-full items-center justify-between text-zinc-400">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Active Backlog
              </p>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-xl font-black text-amber-600">
              {calculations.active}
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#eae8e0] bg-white/90 p-3.5 shadow-sm">
            <div className="flex w-full items-center justify-between text-zinc-400">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Total Settled
              </p>
              <CheckCircle2 className="h-4 w-4 text-[#1a2332]" />
            </div>
            <p className="mt-2 text-xl font-black text-[#1a2332]">
              {calculations.settled}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
