import { useMemo } from "react";
import { MapPin } from "lucide-react";

// SVG coordinate boundaries for active regions
const DISTRICT_PATHS = [
  { id: "Lahaul & Spiti", name: "Lahaul & Spiti", path: "M 90,20 L 165,35 L 175,90 L 125,110 L 75,80 Z" },
  { id: "Kangra", name: "Kangra", path: "M 25,70 L 70,65 L 75,100 L 45,120 L 20,100 Z" },
  { id: "Kullu", name: "Kullu", path: "M 80,85 L 120,115 L 105,150 L 70,130 Z" },
  { id: "Mandi", name: "Mandi", path: "M 50,125 L 70,130 L 85,165 L 45,160 Z" },
  { id: "Shimla", name: "Shimla", path: "M 90,170 L 135,155 L 145,190 L 105,210 Z" }
];

export default function HimachalVectorMap({ selectedDistrict, onSelectDistrict, grievances = [] }) {
  // Compute active complaint load metrics per district
  const loadMetrics = useMemo(() => {
    const counts = {};
    DISTRICT_PATHS.forEach(d => {
      // Handles matching regardless of field id uppercase vs database lowercase strings
      counts[d.id] = grievances.filter(t => t.district?.toLowerCase() === d.id.toLowerCase()).length;
    });
    return counts;
  }, [grievances]);

  // Determine a district's fill color based on selection state and severity/volume load
  const getDistrictFillClass = (isActive, volumeCount) => {
    if (isActive) return "fill-[var(--pahadi-crimson)]"; // Highlighted Selection
    if (volumeCount >= 4) return "fill-[var(--devdar-forest)] hover:opacity-90"; // High Risk / Active Canopy
    if (volumeCount > 0) return "fill-[var(--dry-wool)] hover:opacity-90"; // Moderate Risk Track
    return "fill-slate-200/70 hover:fill-slate-300/80"; // Pristine / Zero active cases
  };

  return (
    /* 1. Transformed to a masonry wood-stone structure card */
    <div className="kathkuni-card bg-white p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-wider text-[var(--kinnaur-marigold)]">
            Geospatial Command Division
          </h4>
          <h3 className="text-sm font-bold text-[var(--devdar-forest)] mt-0.5">
            Regional Territory Map
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
            Select an interactive district path to filter localized telemetry feeds.
          </p>
        </div>
        <div className="h-8 w-8 rounded-sm bg-[#F5F7FA] border border-[#D4C5B3] flex items-center justify-center text-[var(--devdar-forest)] shadow-2xs">
          <MapPin className="h-4 w-4 stroke-[2.5]" />
        </div>
      </div>

      {/* 2. Traditional Weave Geometric Divider Strip Accent */}
      <div className="himachali-weave-divider rounded-xs" />

      {/* 3. Alpine Framed Interactive Map Vector Viewport */}
      <div className="relative w-full h-64 bg-[#F5F7FA] rounded-sm border border-[#D4C5B3] flex items-center justify-center p-2 overflow-hidden">
        <svg viewBox="0 0 200 220" className="w-full h-full drop-shadow-xs select-none">
          {DISTRICT_PATHS.map((dist) => {
            const isActive = selectedDistrict?.toLowerCase() === dist.id.toLowerCase();
            const volumeCount = loadMetrics[dist.id] || 0;
            
            return (
              <g 
                key={dist.id} 
                className="group cursor-pointer" 
                onClick={() => onSelectDistrict && onSelectDistrict(selectedDistrict === dist.id ? "" : dist.id)}
              >
                {/* Visual Vector Polygon Shape with structural white lines resembling mountain boundaries */}
                <path
                  d={dist.path}
                  className={`transition-all duration-200 stroke-2 stroke-[var(--spiti-snow)] ${getDistrictFillClass(isActive, volumeCount)}`}
                />
                
                {/* Text Placement Coordinates */}
                <text
                  x={dist.id === "Lahaul & Spiti" ? 128 : dist.id === "Kangra" ? 42 : dist.id === "Kullu" ? 94 : dist.id === "Mandi" ? 64 : 118}
                  y={dist.id === "Lahaul & Spiti" ? 55 : dist.id === "Kangra" ? 90 : dist.id === "Kullu" ? 115 : dist.id === "Mandi" ? 142 : 182}
                  className={`text-[8px] font-black pointer-events-none tracking-tight transition-colors ${
                    isActive || volumeCount >= 4 ? "fill-[#F5F7FA]" : "fill-slate-700 group-hover:fill-slate-900"
                  }`}
                  textAnchor="middle"
                >
                  {dist.name}
                </text>
                
                {/* Separate volume ticker badge count to maintain typography clarity */}
                {volumeCount > 0 && (
                  <text
                    x={dist.id === "Lahaul & Spiti" ? 128 : dist.id === "Kangra" ? 42 : dist.id === "Kullu" ? 94 : dist.id === "Mandi" ? 64 : 118}
                    y={dist.id === "Lahaul & Spiti" ? 64 : dist.id === "Kangra" ? 98 : dist.id === "Kullu" ? 123 : dist.id === "Mandi" ? 150 : 190}
                    className={`text-[7px] font-mono font-bold pointer-events-none tabular-nums ${
                      isActive || volumeCount >= 4 ? "fill-[var(--kinnaur-marigold)]" : "fill-[var(--pahadi-crimson)] font-extrabold"
                    }`}
                    textAnchor="middle"
                  >
                    ({volumeCount})
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* 4. Traditional Floating HUD Filter Tab */}
        <div className="absolute bottom-2 left-2 bg-[var(--devdar-forest)] text-[#F5F7FA] px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase tracking-wider border border-[#D4C5B3]/30 shadow-sm">
          🏔️ Filter: {selectedDistrict || "All Himachal"}
        </div>
      </div>
    </div>
  );
}
