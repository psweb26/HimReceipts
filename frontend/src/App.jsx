import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowBigUp,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudLightning,
  Flame,
  FileText,
  Gauge,
  ImagePlus,
  Loader2,
  Map,
  Radio,
  RefreshCcw,
  Send,
  ShieldAlert,
  Siren,
  Sparkles,
  TimerReset,
  UserRound,
  X,
  XCircle,
  ThumbsUp,
} from "lucide-react";

import himachalCrest from "./assets/himachal-crest.png";

const ACTIVE_VIEW_STORAGE_KEY = "hp-municipal-active-view";
const UPVOTE_CRITICAL_THRESHOLD = 30;
const FLASH_FLOOD_RISK = "Flash Flood Khud Proximity";
const CLOCK_INTERVAL_MS = 60_000;
const APP_CLOCK_STARTED_AT_MS = new Date().getTime();

const views = [
  {
    id: "civic",
    label: "जन पुकार",
    subtitle: "Civic Accountability Core",
    description: "Community infrastructure oversight & social prioritization",
    icon: UserRound,
  },
  {
    id: "telemetry",
    label: "हिमाचली संवाद",
    subtitle: "Live Telemetry & Communication",
    description: "Weather alerts & transit network monitoring",
    icon: Activity,
  },
  {
    id: "heritage",
    label: "हमारी विरासत",
    subtitle: "The Cultural Canvas",
    description: "Regional traditions & identity anchoring",
    icon: Sparkles,
  },
];

const hpLocationMatrix = [
  {
    district: "Kullu",
    blocks: [
      { block: "Anni", panchayats: ["Draman", "Kungash", "Lajheri"] },
      { block: "Bhuntar", panchayats: ["Bari", "Sainj", "Jari"] },
      { block: "Nirmand", panchayats: ["Arsu", "Deem", "Bagi Sarahan"] },
    ],
  },
  {
    district: "Mandi",
    blocks: [
      { block: "Seraj", panchayats: ["Bali Chowki", "Thunag", "Janjehli"] },
      { block: "Drang", panchayats: ["Katindhi", "Pali", "Uhal"] },
      { block: "Balh", panchayats: ["Kummi", "Gagal", "Ratti"] },
    ],
  },
  {
    district: "Shimla",
    blocks: [
      { block: "Rohru", panchayats: ["Chirgaon", "Samoli", "Pujarli"] },
      { block: "Mashobra", panchayats: ["Baldeyan", "Bhont", "Dhalli"] },
      { block: "Theog", panchayats: ["Matiana", "Kiari", "Deha"] },
    ],
  },
  {
    district: "Kangra",
    blocks: [
      { block: "Baijnath", panchayats: ["Paprola", "Bir", "Kothi Kohar"] },
      { block: "Dharamshala", panchayats: ["Rakkar", "Tang Narwana", "Sidhpur"] },
      { block: "Nurpur", panchayats: ["Rehan", "Sadwan", "Bassa Waziran"] },
    ],
  },
  {
    district: "Lahaul & Spiti",
    blocks: [
      { block: "Keylong", panchayats: ["Sissu", "Gondhla", "Jispa"] },
      { block: "Kaza", panchayats: ["Kibber", "Langza", "Tabo"] },
      { block: "Udaipur", panchayats: ["Triloknath", "Miyar", "Tindi"] },
    ],
  },
];

const terrainRisks = [
  "Landslide Vulnerable Link",
  "Flash Flood Khud Proximity",
  "High-Alpine Alpine Track",
  "Standard Rural Road",
];

const infrastructureTypes = [
  "Connecting Bailey Bridge",
  "Drinking Water Line",
  "NH Highway Link",
  "Power Grid Substation",
];

const infrastructureDepartment = {
  "Connecting Bailey Bridge": "Public Works Department",
  "Drinking Water Line": "Jal Shakti Vibhag",
  "NH Highway Link": "National Highways Wing",
  "Power Grid Substation": "HPSEBL Operations",
};

const priorityTone = {
  critical: "border-rose-300/60 bg-gradient-to-br from-rose-100/80 to-rose-50/60 text-rose-900",
  high: "border-amber-300/60 bg-gradient-to-br from-amber-100/80 to-amber-50/60 text-amber-900",
  medium: "border-sky-300/50 bg-gradient-to-br from-sky-100/70 to-sky-50/50 text-sky-900",
  low: "border-emerald-300/50 bg-gradient-to-br from-emerald-100/70 to-emerald-50/50 text-emerald-900",
};

const statusTone = {
  Pending: "border-amber-300/50 bg-gradient-to-br from-amber-100/60 to-amber-50/50 text-amber-900",
  "Under Verification": "border-sky-300/50 bg-gradient-to-br from-sky-100/60 to-sky-50/50 text-sky-900",
  "Verified Resolved": "border-emerald-300/50 bg-gradient-to-br from-emerald-100/60 to-emerald-50/50 text-emerald-900",
};

const priorityLabel = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const inputClass =
  "w-full rounded-xl border border-[#eae8e0] bg-white/80 backdrop-blur px-4 py-3 text-sm " +
  "text-zinc-900 outline-none transition placeholder:text-zinc-400 " +
  "focus:border-[#1a2332] focus:bg-white focus:ring-4 focus:ring-[#1a2332]/10 shadow-sm";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const initialGrievances = [
  createSeedGrievance({
    id: "HP-MON-2401",
    title: "Bailey bridge deck plates buckling near Sainj market",
    description:
      "Community crossing over the khud is vibrating under school bus traffic after overnight rainfall.",
    district: "Kullu",
    block: "Bhuntar",
    panchayat: "Sainj",
    upvotes: 42,
    terrainRisk: "Flash Flood Khud Proximity",
    infrastructureType: "Connecting Bailey Bridge",
    priority: "critical",
    status: "Pending",
    hoursAgo: 3,
    slaHours: 6,
  }),
  createSeedGrievance({
    id: "HP-MON-2402",
    title: "Road retaining wall slipping on Seraj orchard link",
    description:
      "The lower shoulder has opened a visible crack and loose stone is falling onto the bus route.",
    district: "Mandi",
    block: "Seraj",
    panchayat: "Thunag",
    upvotes: 29,
    terrainRisk: "Landslide Vulnerable Link",
    infrastructureType: "NH Highway Link",
    priority: "high",
    status: "Under Verification",
    hoursAgo: 14,
    slaHours: 24,
  }),
  createSeedGrievance({
    id: "HP-MON-2403",
    title: "Gravity water line washed out above Draman",
    description:
      "Two hamlets are reporting no drinking water after the exposed pipe snapped at the nala crossing.",
    district: "Kullu",
    block: "Anni",
    panchayat: "Draman",
    upvotes: 18,
    terrainRisk: "Flash Flood Khud Proximity",
    infrastructureType: "Drinking Water Line",
    priority: "high",
    status: "Pending",
    hoursAgo: 8,
    slaHours: 18,
  }),
  createSeedGrievance({
    id: "HP-MON-2404",
    title: "Snowmelt erosion along Kibber service track",
    description:
      "High-altitude track shoulders are narrowing and emergency vehicle access is now unreliable.",
    district: "Lahaul & Spiti",
    block: "Kaza",
    panchayat: "Kibber",
    upvotes: 12,
    terrainRisk: "High-Alpine Alpine Track",
    infrastructureType: "Power Grid Substation",
    priority: "high",
    status: "Pending",
    hoursAgo: 22,
    slaHours: 36,
  }),
  createSeedGrievance({
    id: "HP-MON-2405",
    title: "Shimla ridge feeder road drainage blocked",
    description:
      "Silted cross-drain is forcing runoff onto the carriageway and undercutting a retaining edge.",
    district: "Shimla",
    block: "Mashobra",
    panchayat: "Baldeyan",
    upvotes: 8,
    terrainRisk: "Standard Rural Road",
    infrastructureType: "NH Highway Link",
    priority: "medium",
    status: "Verified Resolved",
    hoursAgo: 48,
    slaHours: 72,
    resolutionNotes:
      "Cross-drain cleared, shoulder packed, and runoff redirected with temporary stone pitching.",
    validationImageUrl: "https://images.example.org/hp/mashobra-drainage-clearance.jpg",
  }),
  createSeedGrievance({
    id: "HP-MON-2406",
    title: "Dharamshala substation approach waterlogged",
    description:
      "Approach road to the power switching yard is collecting runoff and equipment access is delayed.",
    district: "Kangra",
    block: "Dharamshala",
    panchayat: "Rakkar",
    upvotes: 35,
    terrainRisk: "Landslide Vulnerable Link",
    infrastructureType: "Power Grid Substation",
    priority: "critical",
    status: "Pending",
    hoursAgo: 5,
    slaHours: 12,
  }),
];

const culturalAssets = [
  {
    id: 1,
    district: "Kullu",
    type: "Dham Recipe",
    title: "Sepu Badi (Kullu Summer Feast)",
    description: "Traditional multi-course feast combining slow-cooked rice, kidney beans, and yogurt curries.",
    icon: "🍲",
  },
  {
    id: 2,
    district: "Kullu",
    type: "Handloom Motif",
    title: "Kullu Shawl Diamond Cross-Stitch",
    description: "Signature geometric diamond lattice representing mountain peaks and terraced fields.",
    icon: "🧵",
  },
  {
    id: 3,
    district: "Mandi",
    type: "Deity Festival",
    title: "Baisakhi Dussehra (Spring Deity Assembly)",
    description: "Annual gathering of village deities carried through mountain paths.",
    icon: "🙏",
  },
  {
    id: 4,
    district: "Kangra",
    type: "Handloom Motif",
    title: "Kinnauri Cap (Nada) Geometric Embroidery",
    description: "Complex geometric spirals representing solar cycles and traditions.",
    icon: "👑",
  },
  {
    id: 5,
    district: "Kangra",
    type: "Deity Festival",
    title: "Kullu Dussehra (Mountain Deity Pageant)",
    description: "Two-week festival where 200+ village deities travel ceremonial routes.",
    icon: "🎭",
  },
  {
    id: 6,
    district: "Lahaul & Spiti",
    type: "Dham Recipe",
    title: "Spiti Barley Bread & Butter Tea",
    description: "High-altitude staple essential for extreme weather survival.",
    icon: "☕",
  },
];

function createSeedGrievance({
  hoursAgo,
  slaHours,
  resolutionNotes = "",
  validationImageUrl = "",
  ...ticket
}) {
  const createdAt = offsetDate(-hoursAgo);

  return {
    ...ticket,
    department: infrastructureDepartment[ticket.infrastructureType],
    createdAt,
    slaDueAt: offsetDate(slaHours - hoursAgo),
    resolutionNotes,
    validationImageUrl,
  };
}

function App() {
  const [activeView, setActiveView] = useState(() => {
    if (typeof window === "undefined") {
      return "civic";
    }

    const storedView = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
    return views.some((view) => view.id === storedView) ? storedView : "civic";
  });
  const [grievances, setGrievances] = useState(initialGrievances);
  const [clockTicks, setClockTicks] = useState(0);
  const nowMs = APP_CLOCK_STARTED_AT_MS + clockTicks * CLOCK_INTERVAL_MS;

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView);
    }
  }, [activeView]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockTicks((tick) => tick + 1);
    }, CLOCK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  const activeViewConfig = views.find((view) => view.id === activeView);

  function handleCreateGrievance(form) {
    const priority = derivePriorityFromTerrain(form.terrainRisk);
    const now = new Date();
    const ticket = {
      id: `HP-MON-${now.getTime().toString(36).toUpperCase()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      district: form.district,
      block: form.block,
      panchayat: form.panchayat,
      upvotes: 0,
      terrainRisk: form.terrainRisk,
      infrastructureType: form.infrastructureType,
      department: infrastructureDepartment[form.infrastructureType],
      priority,
      status: "Pending",
      createdAt: now.toISOString(),
      slaDueAt: addHours(now, priorityToSlaHours(priority)).toISOString(),
      intakePhotoUrl: form.intakePhotoUrl.trim(),
      citizenName: form.citizenName.trim(),
      resolutionNotes: "",
      validationImageUrl: "",
    };

    setGrievances((current) => [ticket, ...current]);
    return ticket;
  }

  function handleUpvote(ticketId) {
    setGrievances((current) =>
      current.map((ticket) => {
        if (ticket.id !== ticketId) {
          return ticket;
        }

        const upvotes = ticket.upvotes + 1;
        return {
          ...ticket,
          upvotes,
          priority:
            upvotes > UPVOTE_CRITICAL_THRESHOLD ? "critical" : ticket.priority,
        };
      }),
    );
  }

  function handleResolve(ticketId, resolutionNotes, validationImageUrl) {
    setGrievances((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: "Verified Resolved",
              resolvedAt: new Date().toISOString(),
              resolutionNotes,
              validationImageUrl,
            }
          : ticket,
      ),
    );
  }

  function handleVeto(ticketId) {
    setGrievances((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: "Reopened via Citizen Veto",
            }
          : ticket,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f4f3ef] to-[#faf9f7] text-zinc-900 selection:bg-[#eae8e0]/80">
      <MonsoonAlertTicker />

      <HeaderNavigation activeView={activeView} setActiveView={setActiveView} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeView === "civic" && (
          <CivicPillar
            grievances={grievances}
            onCreateGrievance={handleCreateGrievance}
            onUpvote={handleUpvote}
            onResolve={handleResolve}
            onVeto={handleVeto}
            nowMs={nowMs}
          />
        )}
        {activeView === "telemetry" && (
          <TelemetryPillar grievances={grievances} nowMs={nowMs} />
        )}
        {activeView === "heritage" && (
          <HeritagePillar assets={culturalAssets} />
        )}
      </div>
    </main>
  );
}

function MonsoonAlertTicker() {
  const bulletins = [
    "🌧️ IMD ORANGE ALERT: Heavy rainfall expected in Mandi & Kullu districts. Flash flood risk high over next 48 hours.",
    "⚠️ Kangra hill slopes under watch: waterlogged feeder roads and substation access corridors require immediate inspection.",
    "❄️ Lahaul & Spiti high-alpine tracks reporting rapid snowmelt runoff. Bailey bridge crews remain on standby.",
  ];

  return (
    <section className="border-b border-rose-200/50 bg-gradient-to-r from-rose-100/40 via-amber-100/40 to-rose-100/40 text-rose-950">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-3 sm:px-6 lg:px-8">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-rose-300/60 bg-white/80 text-rose-950 shadow-sm">
          <CloudLightning className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track flex gap-12 whitespace-nowrap text-xs font-bold uppercase tracking-[0.16em]">
            {[...bulletins, ...bulletins].map((bulletin, index) => (
              <span className="inline-flex items-center gap-3" key={`${bulletin}-${index}`}>
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                {bulletin}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HeaderNavigation({ activeView, setActiveView }) {
  return (
    <div className="border-b border-[#eae8e0] bg-white/70 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#eae8e0] bg-gradient-to-br from-white to-[#f9f9f7] p-1 shadow-md">
              <img
                src={himachalCrest}
                alt="Dev Bhoomi Governance Crest"
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                HimSetu: Unified Civic Platform
              </p>
              <h1 className="truncate text-xl font-bold bg-gradient-to-r from-[#1a2332] to-[#1a2332]/70 bg-clip-text text-transparent">
                Himachal Pradesh Accountability Network
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 font-semibold text-emerald-700 shadow-sm">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Live Telemetry
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-[#eae8e0] bg-white/60 px-3 py-2 font-semibold text-zinc-700 shadow-sm">
              <Flame className="h-3.5 w-3.5" />
              Monsoon Active
            </span>
          </div>
        </div>

        <div className="grid gap-2 rounded-xl border border-[#eae8e0] bg-gradient-to-r from-[#f9f9f7]/70 to-[#efeee8]/70 p-1.5 shadow-sm backdrop-blur md:grid-cols-3">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;

            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={cx(
                  "flex flex-col gap-1 rounded-lg px-4 py-3 text-left transition-all duration-200",
                  isActive
                    ? "scale-[1.02] bg-gradient-to-br from-[#1a2332] to-[#1a2332]/80 text-white shadow-lg shadow-[#1a2332]/20"
                    : "text-zinc-700 hover:bg-white/50 hover:text-zinc-900",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-bold">{view.label}</span>
                </div>
                <span
                  className={cx(
                    "text-xs",
                    isActive ? "text-zinc-200" : "text-zinc-600",
                  )}
                >
                  {view.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CivicPillar({ grievances, onCreateGrievance, onUpvote, onResolve, onVeto, nowMs }) {
  const [form, setForm] = useState(() => {
    const firstDistrict = hpLocationMatrix[0];
    const firstBlock = firstDistrict.blocks[0];

    return {
      citizenName: "Rina Thakur",
      district: firstDistrict.district,
      block: firstBlock.block,
      panchayat: firstBlock.panchayats[0],
      infrastructureType: "Connecting Bailey Bridge",
      terrainRisk: "Flash Flood Khud Proximity",
      title: "Approach slab cracking after overnight rainfall",
      description:
        "The bridge approach has opened a fresh crack and two-wheelers are skidding near the khud edge.",
      intakePhotoUrl: "",
    };
  });
  const [error, setError] = useState("");
  const [latestTicket, setLatestTicket] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const selectedDistrict = hpLocationMatrix.find(
    (entry) => entry.district === form.district,
  );
  const blockOptions = selectedDistrict?.blocks || [];
  const selectedBlock = blockOptions.find((entry) => entry.block === form.block);
  const panchayatOptions = selectedBlock?.panchayats || [];

  const feed = useMemo(
    () =>
      [...grievances].sort((left, right) => {
        const upvoteDelta = right.upvotes - left.upvotes;
        if (upvoteDelta !== 0) {
          return upvoteDelta;
        }
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [grievances],
  );

  const latestFromState = latestTicket
    ? grievances.find((ticket) => ticket.id === latestTicket.id) || latestTicket
    : null;

  function updateForm(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "district") {
        const district = hpLocationMatrix.find((entry) => entry.district === value);
        const firstBlock = district?.blocks[0];
        next.block = firstBlock?.block || "";
        next.panchayat = firstBlock?.panchayats[0] || "";
      }

      if (field === "block") {
        const block = blockOptions.find((entry) => entry.block === value);
        next.panchayat = block?.panchayats[0] || "";
      }

      return next;
    });
  }

  function submitIntake(event) {
    event.preventDefault();
    setError("");

    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required for intake registration.");
      return;
    }

    const ticket = onCreateGrievance(form);
    setLatestTicket(ticket);
    setForm((current) => ({
      ...current,
      title: "",
      description: "",
      intakePhotoUrl: "",
    }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-[#eae8e0] bg-white/60 backdrop-blur p-6 shadow-lg">
        <PanelHeader
          eyebrow="Community Intake Portal"
          icon={Send}
          title="जन पुकार: Mountain Infrastructure Complaint Intake"
        />

        <form className="mt-6 grid gap-4" onSubmit={submitIntake}>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Citizen Name">
              <input
                className={inputClass}
                value={form.citizenName}
                onChange={(event) => updateForm("citizenName", event.target.value)}
              />
            </Field>
            <Field label="District">
              <select
                className={inputClass}
                value={form.district}
                onChange={(event) => updateForm("district", event.target.value)}
              >
                {hpLocationMatrix.map((entry) => (
                  <option key={entry.district} value={entry.district}>
                    {entry.district}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Block">
              <select
                className={inputClass}
                value={form.block}
                onChange={(event) => updateForm("block", event.target.value)}
              >
                {blockOptions.map((entry) => (
                  <option key={entry.block} value={entry.block}>
                    {entry.block}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Gram Panchayat">
              <select
                className={inputClass}
                value={form.panchayat}
                onChange={(event) => updateForm("panchayat", event.target.value)}
              >
                {panchayatOptions.map((panchayat) => (
                  <option key={panchayat} value={panchayat}>
                    {panchayat}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Infrastructure Type">
              <select
                className={inputClass}
                value={form.infrastructureType}
                onChange={(event) =>
                  updateForm("infrastructureType", event.target.value)
                }
              >
                {infrastructureTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Terrain Risk">
              <select
                className={inputClass}
                value={form.terrainRisk}
                onChange={(event) => updateForm("terrainRisk", event.target.value)}
              >
                {terrainRisks.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Title">
            <input
              className={inputClass}
              maxLength={150}
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
            />
          </Field>

          <Field label="Description">
            <textarea
              className={cx(inputClass, "min-h-32 resize-none")}
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
            />
          </Field>

          <Field label="Photo URL (Optional)">
            <input
              className={inputClass}
              placeholder="https://..."
              value={form.intakePhotoUrl}
              onChange={(event) => updateForm("intakePhotoUrl", event.target.value)}
            />
          </Field>

          {error && <InlineError message={error} />}

          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a2332] to-[#1a2332]/80 px-6 text-sm font-bold text-white shadow-lg shadow-[#1a2332]/20 transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
            type="submit"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Submit Grievance
          </button>
        </form>
      </section>

      <div className="grid gap-6">
        <section className="rounded-2xl border border-[#eae8e0] bg-white/60 backdrop-blur p-6 shadow-lg">
          <PanelHeader
            eyebrow="Intake Result"
            icon={TimerReset}
            title="Live Ticket State"
          />

          {latestFromState ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricPill label="Ticket ID" value={latestFromState.id} />
              <MetricPill
                label="Priority"
                value={priorityLabel[getEffectivePriority(latestFromState)]}
              />
              <MetricPill label="Upvotes" value={latestFromState.upvotes} />
              <MetricPill
                label="SLA Target"
                value={formatDateTime(latestFromState.slaDueAt)}
              />
            </div>
          ) : (
            <EmptyState
              detail="Registered complaints appear here immediately."
              icon={FileText}
              title="No new local ticket"
            />
          )}
        </section>

        <section className="rounded-2xl border border-[#eae8e0] bg-white/60 backdrop-blur p-6 shadow-lg">
          <PanelHeader
            eyebrow="Community Signal"
            icon={ArrowBigUp}
            title="Local Grievance Feed"
          />

          <div className="mt-5 grid gap-3 max-h-96 overflow-y-auto">
            {feed.slice(0, 5).map((ticket) => (
              <GrievanceFeedCard
                key={ticket.id}
                onUpvote={onUpvote}
                onSelectResolve={() => setSelectedTicket({ ...ticket, action: 'resolve' })}
                onSelectVeto={() => setSelectedTicket({ ...ticket, action: 'veto' })}
                ticket={ticket}
              />
            ))}
          </div>
        </section>
      </div>

      {selectedTicket && (
        <ResolutionModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onResolve={(notes, image) => {
            onResolve(selectedTicket.id, notes, image);
            setSelectedTicket(null);
          }}
          onVeto={(remarks) => {
            onVeto(selectedTicket.id);
            setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
}

function TelemetryPillar({ grievances, nowMs }) {
  const [refreshing, setRefreshing] = useState(false);

  const metrics = useMemo(() => {
    const highUpvoteEmergencies = grievances.filter(
      (ticket) => ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD,
    ).length;
    const verifiedResolved = grievances.filter(
      (ticket) => ticket.status === "Verified Resolved",
    ).length;

    return {
      totalGrievances: grievances.length,
      highUpvoteEmergencies,
      activePending: grievances.length - verifiedResolved,
      verifiedResolved,
    };
  }, [grievances]);

  const districtLoadData = useMemo(() => {
    return hpLocationMatrix.map(({ district }) => {
      const districtTickets = grievances.filter(
        (ticket) => ticket.district === district,
      );
      const landslideBridge = districtTickets.filter(
        (ticket) =>
          ticket.terrainRisk === "Landslide Vulnerable Link" ||
          ticket.infrastructureType === "Connecting Bailey Bridge",
      );

      return {
        district,
        Total: districtTickets.length,
        HighUpvote: districtTickets.filter(
          (ticket) => ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD,
        ).length,
        LandslideBridge: landslideBridge.length,
      };
    });
  }, [grievances]);

  function refreshTelemetry() {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 450);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-[#eae8e0] bg-white/60 backdrop-blur p-6 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PanelHeader
            eyebrow="CM Office Command"
            icon={Gauge}
            title="हिमाचली संवाद: Executive Telemetry"
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#eae8e0] bg-white/80 px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-white/90"
            disabled={refreshing}
            onClick={refreshTelemetry}
            type="button"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            )}
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={FileText}
            label="Total Grievances"
            surface="border-[#eae8e0] bg-gradient-to-br from-[#f9f9f7] to-[#efeee8] shadow-sm"
            tone="text-zinc-900"
            value={metrics.totalGrievances}
          />
          <KpiCard
            icon={Siren}
            label="High-Upvote Emergencies"
            surface="border-rose-300/50 bg-gradient-to-br from-rose-100/60 to-rose-50/50 shadow-sm"
            tone="text-rose-900"
            value={metrics.highUpvoteEmergencies}
          />
          <KpiCard
            icon={Clock3}
            label="Active Pending"
            surface="border-amber-300/50 bg-gradient-to-br from-amber-100/60 to-amber-50/50 shadow-sm"
            tone="text-amber-900"
            value={metrics.activePending}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Verified Resolved"
            surface="border-emerald-300/60 bg-gradient-to-br from-emerald-100/60 to-emerald-50/50 shadow-sm"
            tone="text-emerald-900"
            value={metrics.verifiedResolved}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[#eae8e0] bg-white/60 backdrop-blur p-6 shadow-lg">
        <PanelHeader
          eyebrow="Infrastructure Load"
          icon={Building2}
          title="Infrastructural Burden by District"
        />

        <div className="mt-6 h-80 rounded-xl border border-[#eae8e0] bg-gradient-to-br from-[#faf9f7] to-[#efeee8] p-4">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={districtLoadData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" />
              <XAxis
                dataKey="district"
                fontSize={12}
                stroke="#71717a"
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                fontSize={12}
                stroke="#71717a"
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#f9f9f7",
                  border: "1px solid #eae8e0",
                  borderRadius: 8,
                  boxShadow: "0 10px 30px rgba(24, 24, 27, 0.08)",
                }}
              />
              <Legend />
              <Bar dataKey="Total" fill="#1a2332" radius={[6, 6, 0, 0]} />
              <Bar
                dataKey="HighUpvote"
                fill="#dc2626"
                name="High-Upvote"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="LandslideBridge"
                fill="#d97706"
                name="Landslide/Bridge"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function HeritagePillar({ assets }) {
  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-[#eae8e0] bg-white/60 backdrop-blur p-6 shadow-lg">
        <PanelHeader
          eyebrow="Cultural Preservation"
          icon={Sparkles}
          title="हमारी विरासत: Regional Heritage & Identity"
        />
        <p className="mt-3 text-sm text-zinc-600">
          Explore the rich cultural traditions of Himachal Pradesh—from ancient Dham recipes to intricate handloom motifs and sacred deity festivals.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="group rounded-2xl border border-[#eae8e0] bg-white/60 backdrop-blur p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-4xl">{asset.icon}</div>
              <Badge className="border-[#eae8e0] bg-[#f9f9f7] text-zinc-700 text-xs">
                {asset.type}
              </Badge>
            </div>
            <h3 className="mt-4 text-lg font-bold text-zinc-900">{asset.title}</h3>
            <p className="mt-2 text-sm text-zinc-600">{asset.description}</p>
            <div className="mt-4 inline-flex rounded-lg border border-[#eae8e0] bg-[#efeee8] px-3 py-1 text-xs font-semibold text-zinc-700">
              📍 {asset.district}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GrievanceFeedCard({ ticket, onUpvote, onSelectResolve, onSelectVeto }) {
  const effectivePriority = getEffectivePriority(ticket);
  const isCluster = ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD;

  return (
    <article className="rounded-xl border border-[#eae8e0] bg-white/70 p-4 shadow-sm hover:shadow-md transition">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={priorityTone[effectivePriority]}>
              {priorityLabel[effectivePriority]}
            </Badge>
            <Badge className={statusTone[ticket.status]}>{ticket.status}</Badge>
            {isCluster && (
              <Badge className="border-rose-300/50 bg-gradient-to-br from-rose-100/60 to-rose-50/50 text-rose-900">
                High-Upvote Emergency
              </Badge>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-zinc-950">
            {ticket.title}
          </h3>
          <p className="mt-1 text-xs text-zinc-600">
            {ticket.district} / {ticket.block} / {ticket.panchayat}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#1a2332]/15 bg-[#1a2332]/5 px-3 text-xs font-bold text-[#1a2332] transition hover:bg-[#1a2332]/10"
            onClick={() => onUpvote(ticket.id)}
            type="button"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {ticket.upvotes}
          </button>
          {ticket.status === "Verified Resolved" && (
            <button
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-300/50 bg-rose-100/50 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100/70"
              onClick={onSelectVeto}
              type="button"
            >
              <Flame className="h-3.5 w-3.5" />
              Veto
            </button>
          )}
          {ticket.status !== "Verified Resolved" && (
            <button
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-600/80 px-3 text-xs font-bold text-white transition hover:from-emerald-700 hover:to-emerald-700/80"
              onClick={onSelectResolve}
              type="button"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolve
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ResolutionModal({ ticket, onClose, onResolve, onVeto }) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [validationImageUrl, setValidationImageUrl] = useState("");
  const [vetoRemarks, setVetoRemarks] = useState("");
  const [error, setError] = useState("");

  const isVeto = ticket.action === "veto";

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (isVeto) {
      if (!vetoRemarks.trim()) {
        setError("Veto remarks are required.");
        return;
      }
      onVeto(vetoRemarks);
    } else {
      if (!resolutionNotes.trim() || !validationImageUrl.trim()) {
        setError("Resolution notes and validation image are mandatory.");
        return;
      }
      onResolve(resolutionNotes, validationImageUrl);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-2xl border border-[#eae8e0] bg-white shadow-2xl shadow-zinc-950/20 animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between gap-4 border-b border-[#eae8e0] bg-gradient-to-r from-[#f9f9f7] to-[#efeee8] p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
              {isVeto ? "Citizen Veto" : "Resolution Evidence"}
            </p>
            <h2 className="mt-2 break-all text-lg font-bold text-zinc-900">
              {ticket.id}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{ticket.title}</p>
          </div>
          <button
            aria-label="Close modal"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#eae8e0] bg-white text-zinc-500 transition hover:bg-[#efeee8] hover:text-zinc-900"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form className="grid gap-4 p-6" onSubmit={handleSubmit}>
          {isVeto ? (
            <>
              <Field label="Why should this ticket be reopened? (Veto Remarks)">
                <textarea
                  className={cx(inputClass, "min-h-32 resize-none")}
                  placeholder="Provide evidence that the resolution is inadequate..."
                  value={vetoRemarks}
                  onChange={(event) => setVetoRemarks(event.target.value)}
                />
              </Field>
              {error && <InlineError message={error} />}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="h-10 rounded-lg border border-[#eae8e0] bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-[#efeee8]"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-rose-600/80 px-4 text-sm font-semibold text-white transition hover:from-rose-700 hover:to-rose-700/80"
                  disabled={!vetoRemarks.trim()}
                  type="submit"
                >
                  <Flame className="h-4 w-4" aria-hidden="true" />
                  File Veto
                </button>
              </div>
            </>
          ) : (
            <>
              <Field label="Resolution Notes">
                <textarea
                  className={cx(inputClass, "min-h-32 resize-none")}
                  value={resolutionNotes}
                  onChange={(event) => setResolutionNotes(event.target.value)}
                />
              </Field>

              <Field label="Validation Image URL">
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="https://..."
                    value={validationImageUrl}
                    onChange={(event) => setValidationImageUrl(event.target.value)}
                  />
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#eae8e0] bg-[#efeee8] text-zinc-500">
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </Field>

              {error && <InlineError message={error} />}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="h-10 rounded-lg border border-[#eae8e0] bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-[#efeee8]"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-600/80 px-4 text-sm font-semibold text-white transition hover:from-emerald-700 hover:to-emerald-700/80 disabled:opacity-50"
                  disabled={!resolutionNotes.trim() || !validationImageUrl.trim()}
                  type="submit"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Confirm Resolution
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </div>
  );
}

function PanelHeader({ eyebrow, icon: Icon, title }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold bg-gradient-to-r from-zinc-950 to-zinc-800 bg-clip-text text-transparent">
          {title}
        </h2>
      </div>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#1a2332]/10 bg-gradient-to-br from-[#1a2332]/5 to-[#1a2332]/10 text-[#1a2332]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, surface, tone }) {
  return (
    <article className={cx("rounded-xl border p-4", surface)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        <Icon className={cx("h-5 w-5", tone)} aria-hidden="true" />
      </div>
      <p className={cx("mt-3 text-3xl font-bold tabular-nums", tone)}>
        {Number(value || 0).toLocaleString("en-IN")}
      </p>
    </article>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="rounded-lg border border-[#eae8e0] bg-gradient-to-br from-[#f9f9f7] to-[#efeee8] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function Badge({ children, className }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-bold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-zinc-800">{label}</span>
      {children}
    </label>
  );
}

function InlineError({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-rose-200/60 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail }) {
  return (
    <div className="mt-6 grid min-h-44 place-items-center rounded-xl border border-dashed border-[#eae8e0] bg-gradient-to-br from-[#faf9f7] to-[#efeee8] p-6 text-center">
      <div>
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-[#eae8e0] bg-white text-zinc-500 shadow-sm">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-1 text-sm text-zinc-600">{detail}</p>
      </div>
    </div>
  );
}

function calculateCompositeScore(ticket) {
  const priority = getEffectivePriority(ticket);
  return (
    (priority === "critical" ? 60 : 20) +
    ticket.upvotes * 2 +
    (ticket.terrainRisk === FLASH_FLOOD_RISK ? 15 : 0)
  );
}

function getEffectivePriority(ticket) {
  return ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD ? "critical" : ticket.priority;
}

function derivePriorityFromTerrain(terrainRisk) {
  if (terrainRisk === FLASH_FLOOD_RISK) {
    return "critical";
  }

  if (
    terrainRisk === "Landslide Vulnerable Link" ||
    terrainRisk === "High-Alpine Alpine Track"
  ) {
    return "high";
  }

  return "medium";
}

function priorityToSlaHours(priority) {
  if (priority === "critical") {
    return 8;
  }

  if (priority === "high") {
    return 24;
  }

  return 72;
}

function offsetDate(hoursFromNow) {
  return addHours(new Date(), hoursFromNow).toISOString();
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatDateTime(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default App;
