import { Sparkles } from "lucide-react";

export default function IdentityMosaic({ assets, onSelectAsset }) {
  if (!assets.length) {
    return (
      <div className="mt-5 grid min-h-44 place-items-center rounded-2xl border border-dashed border-[var(--him-stone)] bg-white/50 p-8 text-center shadow-[var(--glass-shadow)] backdrop-blur-md">
        <div>
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-[var(--him-stone)] bg-[var(--him-stone-soft)]/70 text-slate-400 shadow-sm">
            <Sparkles className="h-5 w-5 text-[var(--him-crimson)]" />
          </div>
          <p className="mt-3 text-xs font-black text-slate-800 uppercase tracking-wide">
            No Cultural Pillars Found Matching Query
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Your search phrase did not match any of the 28 registered ledger fields or deep specifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <button
          key={asset.id}
          onClick={() => onSelectAsset(asset)}
          type="button"
          className="glass-mosaic-card text-left"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-3xl filter drop-shadow-2xs select-none">{asset.icon}</span>
              <span className="rounded-full border border-[var(--him-stone)] bg-white/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-700 backdrop-blur-sm">
                {asset.sub_items ? `${asset.sub_items.length} Elements` : "Static Vector"}
              </span>
            </div>
            <h3 className="font-heading text-base font-semibold text-[var(--him-pine)] tracking-tight">
              {asset.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{asset.description}</p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/30 pt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--him-crimson)]">
            <span>Open Mosaic Deck</span>
            <span className="rounded border border-[var(--him-stone)] bg-white/60 px-1.5 py-0.5 font-mono text-[9px] lowercase tracking-normal text-slate-500">
              {asset.id}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
