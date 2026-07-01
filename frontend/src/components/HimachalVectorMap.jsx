import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";

// SVG coordinate boundaries for active regions
import HimachalDistricts from "../assets/himachal_districts.svg?react";

const DISTRICT_COLORS = {
  Chamba: "#C8D7F0", // Mist Blue
  Kangra: "#E7C8C2", // Apple Blossom
  Una: "#DDE8C8", // Terrace Green
  Hamirpur: "#EFDDB8", // Wheat Gold
  Bilaspur: "#C9D8D3", // River Stone
  Solan: "#D4E4D2", // Pine Meadow
  Sirmaur: "#D8C8E6", // Lavender Hills
  Shimla: "#E8E1C7", // Heritage Cream
  Kinnaur: "#E7CFC4", // Apricot Clay
  "Lahaul & Spiti": "#D7DDEB", // Glacier Blue
  Mandi: "#DCCFC3", // Cedar Wood
  Kullu: "#EAD8DF", // Rhododendron Pink
};

const DISTRICT_NAME_MAP = {
  LahaulSpiti: "Lahaul & Spiti",
  Hamirpur: "Hamirpur",
  Kangra: "Kangra",
  Shimla: "Shimla",
  Kullu: "Kullu",
  Mandi: "Mandi",
  Chamba: "Chamba",
  Bilaspur: "Bilaspur",
  Una: "Una",
  Solan: "Solan",
  Sirmaur: "Sirmaur",
  Kinnaur: "Kinnaur",
};

export default function HimachalVectorMap({
  selectedDistrict,
  onSelectDistrict,
  grievances = [],
}) {
  const mapContainerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const districtCounts = useMemo(() => {
    const counts = {};

    grievances.forEach((g) => {
      counts[g.district] = (counts[g.district] || 0) + 1;
    });

    return counts;
  }, [grievances]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const svg = mapContainerRef.current.querySelector("svg");
    const districts = svg.querySelectorAll("path[id]");

    let activeDistrict = null;
    districts.forEach((district) => {
      const districtName = DISTRICT_NAME_MAP[district.id] || district.id;

      const count = districtCounts[districtName] || 0;

      let baseColor;

      if (count === 0) baseColor = DISTRICT_COLORS[district.id] || "#EAEAEA";
      else if (count <= 2) baseColor = "#B7E4C7";
      else if (count <= 4) baseColor = "#FFE08A";
      else if (count <= 6) baseColor = "#F6AD55";
      else baseColor = "#F56565";

      district.style.fill = baseColor;
      district.style.stroke = "#718096";
      district.style.strokeWidth = "1";

      district.style.cursor = "pointer";
      district.style.transition =
        "fill .28s ease-in-out, stroke .28s ease-in-out, filter .28s ease-in-out";
      district.style.filter =
        "brightness(1.06) drop-shadow(0 0 6px rgba(80,120,140,.25))";

      district.addEventListener("mouseenter", (e) => {
        district.style.filter = "brightness(1.08) saturate(1.08)";
        district.style.stroke = "#365C68";

        const districtGrievances = grievances.filter(
          (g) => g.district === districtName,
        );

        const rect = mapContainerRef.current.getBoundingClientRect();

        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          district: districtName,
          total: districtGrievances.length,
          critical: districtGrievances.filter((g) => g.priority === "critical")
            .length,
          high: districtGrievances.filter((g) => g.priority === "high").length,
          resolved: districtGrievances.filter((g) => g.status === "resolved")
            .length,
        });
      });

      district.addEventListener("click", () => {
        if (activeDistrict) {
          activeDistrict.style.fill =
            DISTRICT_COLORS[activeDistrict.id] || "#EAEAEA";

          activeDistrict.style.stroke = "#718096";
          activeDistrict.style.strokeWidth = "1";
          activeDistrict.style.filter =
            "brightness(1.06) drop-shadow(0 0 6px rgba(80,120,140,.25))";
        }

        district.style.fill = "#C96A28";
        district.style.stroke = "#8B4513";
        district.style.strokeWidth = "2";
        district.style.filter =
          "brightness(1.08) saturate(1.15) drop-shadow(0 0 10px rgba(201,106,40,.35))";

        activeDistrict = district;

        const clickedDistrict = DISTRICT_NAME_MAP[district.id] || district.id;

        if (selectedDistrict === clickedDistrict) {
          onSelectDistrict?.(null);
        } else {
          onSelectDistrict?.(clickedDistrict);
        }
      });

      district.addEventListener("mouseleave", () => {
        district.style.filter = "brightness(1) saturate(1)";

        if (district !== activeDistrict) {
          district.style.stroke = "#718096";
        }
        setTooltip(null);
      });

      district.addEventListener("mousemove", (e) => {
        const rect = mapContainerRef.current.getBoundingClientRect();

        setTooltip((t) => ({
          ...t,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        }));
      });
    });
  }, [onSelectDistrict, selectedDistrict, districtCounts, grievances]);

  return (
    /* 1. Transformed to a masonry wood-stone structure card */
    <div className="kathkuni-card bg-white p-8 h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--kinnaur-marigold)]">
            GEOSPATIAL COMMAND DIVISION
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--devdar-forest)]">
            Himachal Infrastructure Map
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Monitor citizen reported infrastructure incidents across districts.
            Select a district to filter complaints and view regional activity.
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--devdar-forest)] text-white shadow-sm">
          <MapPin className="h-6 w-6" />
        </div>
      </div>

      {/* 2. Traditional Weave Geometric Divider Strip Accent */}
      <div className="mt-6 mb-6 border-t border-stone-200" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Districts
          </p>
          <h3 className="mt-2 text-2xl font-black">12</h3>
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Reports
          </p>
          <h3 className="mt-2 text-2xl font-black">{grievances.length}</h3>
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Critical
          </p>
          <h3 className="mt-2 text-2xl font-black text-red-600">
            {grievances.filter((g) => g.priority === "critical").length}
          </h3>
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Selected
          </p>
          <h3 className="mt-2 text-lg font-bold">
            {selectedDistrict || "All"}
          </h3>
        </div>
      </div>

      {/* 3. Alpine Framed Interactive Map Vector Viewport */}
      <div className="relative h-[550px] rounded-2xl border border-stone-200 bg-[#F8FAFC] overflow-hidden">
        <div
          ref={mapContainerRef}
          className="flex h-full w-full items-center justify-center p-6"
        >
          <HimachalDistricts className="max-h-full max-w-full transition-all duration-300" />
        </div>

        {/* 4. Traditional Floating HUD Filter Tab */}
        <div className="absolute bottom-5 left-5 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Active Filter
          </p>

          <p className="mt-1 font-bold text-[var(--devdar-forest)]">
            {selectedDistrict || "Entire Himachal Pradesh"}
          </p>
        </div>

        <div className="absolute bottom-5 right-5 rounded-lg bg-white border border-stone-200 p-4 shadow-lg">
          <p className="text-[10px] uppercase tracking-widest font-bold mb-3">
            Incident Density
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600"></span>
              Critical
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              High
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500"></span>
              Normal
            </div>
          </div>
        </div>
        {tooltip && (
          <div
            className="absolute z-50 w-64 rounded-xl border border-stone-200 bg-white/95 backdrop-blur-sm shadow-2xl px-4 py-3 pointer-events-none"
            style={{
              left: tooltip.x + 15,
              top: tooltip.y + 15,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-[var(--devdar-forest)]" />
              <h3 className="font-bold text-[15px] text-[var(--devdar-forest)]">
                {tooltip.district}
              </h3>
            </div>

            <div className="border-t border-stone-200 my-2" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Reports</span>
                <span className="font-semibold">{tooltip.total}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-red-600">Critical</span>
                <span className="font-semibold">{tooltip.critical}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-amber-600">High</span>
                <span className="font-semibold">{tooltip.high}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-green-600">Resolved</span>
                <span className="font-semibold">{tooltip.resolved}</span>
              </div>
            </div>

            <div className="border-t border-stone-200 mt-3 pt-2 text-xs text-slate-500">
              Click to filter district →
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
