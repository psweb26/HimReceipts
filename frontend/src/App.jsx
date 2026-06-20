import { useCallback, useEffect, useMemo, useState } from "react";
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
  ArrowBigUp,
  Building2,
  CheckCircle2,
  Clock3,
  CloudLightning,
  Flame,
  FileText,
  Gauge,
  ImagePlus,
  Loader2,
  Radio,
  RefreshCcw,
  Send,
  Siren,
  Sparkles,
  TimerReset,
  UserRound,
  X,
  XCircle,
  ThumbsUp,
} from "lucide-react";
import HimachalVectorMap from "./components/HimachalVectorMap";
import himachalCrest from "./assets/himachal-crest.png";
import { COMPREHENSIVE_HERITAGE_REGISTRY } from "./assets/culturalData";

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

const priorityLabel = {
  critical: "Critical Threats",
  high: "High Threat",
  medium: "Medium",
  low: "Low",
};

const inputClass =
  "w-full rounded-sm border border-[var(--dry-wool)] bg-white px-4 py-3 text-sm " +
  "text-slate-900 outline-none transition placeholder:text-slate-400 " +
  "focus:border-[var(--devdar-forest)] focus:ring-2 focus:ring-[var(--devdar-forest)]/10 shadow-2xs";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function offsetDate(hoursFromNow) {
  return addHours(new Date(), hoursFromNow).toISOString();
}

function createSeedGrievance({
  hoursAgo,
  slaHours,
  resolutionNotes = "",
  validationImageUrl = "",
  vetoRemarks = "",
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
    vetoRemarks,
  };
}

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
  const [selectedDistrict, setSelectedDistrict] = useState("");
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
      vetoRemarks: "",
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
          : ticket
      )
    );
  }

  function handleVeto(ticketId, vetoRemarks) {
    setGrievances((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: "Reopened via Citizen Veto",
              vetoRemarks,
              vetoedAt: new Date().toISOString(),
            }
          : ticket
      )
    );
  }

  return (
    <main className="min-h-screen bg-[var(--spiti-snow)] text-slate-900 selection:bg-[var(--dry-wool)]">
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
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
          />
        )}
        {activeView === "telemetry" && (
          <TelemetryPillar grievances={grievances} nowMs={nowMs} />
        )}
        {activeView === "heritage" && (
          <HeritagePillar />
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
    <section className="border-b border-[var(--pahadi-crimson)]/30 bg-rose-50 text-[var(--pahadi-crimson)]">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-[var(--pahadi-crimson)]/40 bg-white text-[var(--pahadi-crimson)] shadow-2xs">
          <CloudLightning className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track flex gap-12 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider">
            {[...bulletins, ...bulletins].map((bulletin, index) => (
              <span className="inline-flex items-center gap-3" key={`${bulletin}-${index}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--pahadi-crimson)] animate-pulse" />
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
    <div className="border-b border-[var(--dry-wool)] bg-white shadow-xs relative">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-5 pb-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-sm border border-[var(--dry-wool)] bg-white p-0.5 shadow-2xs">
              <img
                src={himachalCrest}
                alt="Dev Bhoomi Governance Crest"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                HimSetu • Unified Civic Platform
              </p>
              <h1 className="truncate text-lg font-black text-[var(--devdar-forest)] uppercase tracking-tight">
                Himachal Pradesh Accountability Network
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-emerald-800 shadow-2xs">
              <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
              Live Telemetry
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--dry-wool)] bg-slate-50 px-2.5 py-1.5 text-slate-700 shadow-2xs">
              <Flame className="h-3 w-3 text-[var(--pahadi-crimson)]" />
              Monsoon Active
            </span>
          </div>
        </div>

        <div className="grid gap-2 rounded-sm border border-[var(--dry-wool)] bg-slate-50 p-1 md:grid-cols-3">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;

            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={cx(
                  "flex flex-col gap-0.5 rounded-sm px-4 py-2.5 text-left transition-all duration-150",
                  isActive
                    ? "bg-[var(--devdar-forest)] text-white shadow-xs border-b-2 border-[var(--kinnaur-marigold)]"
                    : "text-slate-700 hover:bg-white hover:text-slate-900",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cx("h-4 w-4 shrink-0", isActive ? "text-[var(--kinnaur-marigold)]" : "text-slate-400")} aria-hidden="true" />
                  <span className="text-xs font-black uppercase tracking-wider">{view.label}</span>
                </div>
                <span className={cx("text-[10px] font-medium", isActive ? "text-slate-300" : "text-slate-500")}>
                  {view.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="himachali-weave-divider" />
    </div>
  );
}

function CivicPillar({ grievances, onCreateGrievance, onUpvote, onResolve, onVeto, nowMs, selectedDistrict, setSelectedDistrict }) {
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

  const selectedDistrictConfig = hpLocationMatrix.find(
    (entry) => entry.district === form.district,
  );
  const blockOptions = selectedDistrictConfig?.blocks || [];
  const selectedBlock = blockOptions.find((entry) => entry.block === form.block);
  const panchayatOptions = selectedBlock?.panchayats || [];

  const feed = useMemo(() => {
    let result = [...grievances];
    
    if (selectedDistrict) {
      result = result.filter(t => t.district.toLowerCase() === selectedDistrict.toLowerCase());
    }

    return result.sort((left, right) => {
      const scoreDelta =
        calculateCompositeScore(right) - calculateCompositeScore(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const upvoteDelta = right.upvotes - left.upvotes;
      if (upvoteDelta !== 0) {
        return upvoteDelta;
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [grievances, selectedDistrict]);

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
        
        if (setSelectedDistrict) {
          setSelectedDistrict(value);
        }
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
    <div className="space-y-6">
      <div className="kathkuni-card bg-white p-6 flex flex-col md:flex-row items-center gap-6 overflow-hidden relative">
        <div className="flex-1 space-y-2">
          <span className="text-[10px] bg-[var(--kinnaur-marigold)] text-slate-950 font-black px-2.5 py-1 rounded-2xs uppercase tracking-widest">
            Public Interface Core
          </span>
          <h2 className="text-xl font-black text-[var(--devdar-forest)] uppercase tracking-tight">
            जन पुकार / Civic Accountability Dashboard
          </h2>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            A decentralized oversight network enabling citizens to flag structural damage—inspired by regional engineering resilience. Track road shoulder failure, cracked retaining walls, or structural strain on critical infrastructure links before they escalate into transit blockades.
          </p>
        </div>
        <div className="w-32 h-20 shrink-0 bg-slate-100 rounded-sm border border-[var(--dry-wool)] flex flex-col items-center justify-center p-2 text-center text-[10px] font-bold text-slate-500 font-mono">
          <span>KATH-KUNI</span>
          <span className="text-lg mt-0.5">🪵🪨</span>
          <span className="text-[8px] text-slate-400 font-sans mt-0.5">Structural Grid Pattern</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="kathkuni-card bg-white p-6">
          <PanelHeader
            eyebrow="Community Intake Portal"
            icon={Send}
            title="जन पुकार: Mountain Infrastructure Intake"
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

            <Field label="Title / Brief Headline">
              <input
                className={inputClass}
                maxLength={150}
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            </Field>

            <Field label="Incident Action Description">
              <textarea
                className={cx(inputClass, "min-h-32 resize-none")}
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
              />
            </Field>

            <Field label="Evidence Reference Link URL (Optional)">
              <input
                className={inputClass}
                placeholder="https://..."
                value={form.intakePhotoUrl}
                onChange={(event) => updateForm("intakePhotoUrl", event.target.value)}
              />
            </Field>

            {error && <InlineError message={error} />}

            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-[var(--devdar-forest)] px-6 text-xs font-bold uppercase tracking-wider text-[#F5F7FA] shadow-xs transition hover:bg-[#132B1F]"
              type="submit"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit Incident Claim
            </button>
          </form>
        </section>

        <div className="grid gap-6">
          <HimachalVectorMap 
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrict}
            grievances={grievances}
          />

          <section className="kathkuni-card bg-white p-6">
            <PanelHeader
              eyebrow="Intake Result"
              icon={TimerReset}
              title="Live Ticket Telemetry State"
            />

            {latestFromState ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricPill label="Ticket Identification ID" value={latestFromState.id} />
                <MetricPill
                  label="Risk Priority Rank"
                  value={priorityLabel[getEffectivePriority(latestFromState)]}
                />
                <MetricPill label="Aggregated Upvotes" value={latestFromState.upvotes} />
                <MetricPill
                  label="SLA Target Boundary"
                  value={formatDateTime(latestFromState.slaDueAt)}
                />
                <div className="sm:col-span-2">
                  <MetricPill
                    label="Current Status Timeline Track"
                    value={formatSlaStatus(latestFromState, nowMs)}
                  />
                </div>
              </div>
            ) : (
              <EmptyState
                detail="Registered structural faults appear here immediately for logging tracking verification."
                icon={FileText}
                title="No Active Local Ticket State Listed"
              />
            )}
          </section>

          <section className="kathkuni-card bg-white p-6">
            <PanelHeader
              eyebrow="Community Signal Feed"
              icon={ArrowBigUp}
              title="Local Telemetry Feed Ledger"
            />

            <div className="mt-5 grid gap-3.5 max-h-96 overflow-y-auto pr-1">
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
              onVeto(selectedTicket.id, remarks);
              setSelectedTicket(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function TelemetryPillar({ grievances, nowMs }) {
  const [refreshing, setRefreshing] = useState(true);
  const [weatherNodes, setWeatherNodes] = useState([]);
  const [transitRoutes, setTransitRoutes] = useState([]);
  const [telemetryError, setTelemetryError] = useState("");

  const requestTelemetry = useCallback(async (signal) => {
    const [weatherResponse, transitResponse] = await Promise.all([
      fetch("http://localhost:8000/api/telemetry/weather", { signal }),
      fetch("http://localhost:8000/api/telemetry/transit", { signal }),
    ]);

    if (!weatherResponse.ok || !transitResponse.ok) {
      throw new Error("Telemetry feed request failed.");
    }

    return Promise.all([
      weatherResponse.json(),
      transitResponse.json(),
    ]);
  }, []);

  const loadTelemetry = useCallback(async (signal) => {
    setRefreshing(true);
    setTelemetryError("");

    try {
      const [weatherPayload, transitPayload] = await requestTelemetry(signal);

      setWeatherNodes(Array.isArray(weatherPayload) ? weatherPayload : []);
      setTransitRoutes(Array.isArray(transitPayload) ? transitPayload : []);
    } catch (error) {
      if (error.name !== "AbortError") {
        setTelemetryError(error.message || "Live telemetry feed is unavailable.");
      }
    } finally {
      if (!signal?.aborted) {
        setRefreshing(false);
      }
    }
  }, [requestTelemetry]);

  useEffect(() => {
    const controller = new AbortController();
    requestTelemetry(controller.signal)
      .then(([weatherPayload, transitPayload]) => {
        setWeatherNodes(Array.isArray(weatherPayload) ? weatherPayload : []);
        setTransitRoutes(Array.isArray(transitPayload) ? transitPayload : []);
        setTelemetryError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setTelemetryError(error.message || "Live telemetry feed is unavailable.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [requestTelemetry]);

  const metrics = useMemo(() => {
    const highUpvoteEmergencies = grievances.filter(
      (ticket) => ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD,
    ).length;
    const verifiedResolved = grievances.filter(
      (ticket) => ticket.status === "Verified Resolved",
    ).length;
    const slaBreached = grievances.filter((ticket) =>
      isSlaBreached(ticket, nowMs),
    ).length;

    return {
      totalGrievances: grievances.length,
      highUpvoteEmergencies,
      activePending: grievances.length - verifiedResolved,
      verifiedResolved,
      slaBreached,
    };
  }, [grievances, nowMs]);

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

  const weatherSummary = useMemo(() => {
    const asNumber = (value) => Number.parseFloat(value ?? 0) || 0;
    const highRiskStatuses = new Set([
      "Extreme Cloudburst",
      "Cloudburst",
      "Severe Rainfall",
      "Heavy Rain",
    ]);

    const peak = weatherNodes.reduce(
      (currentPeak, node) => {
        const rainfall = asNumber(node.rainfall_1hr_mm);
        return rainfall > currentPeak.rainfall ? { node, rainfall } : currentPeak;
      },
      { node: null, rainfall: 0 },
    );

    const averageTemperature =
      weatherNodes.length > 0
        ? weatherNodes.reduce((sum, node) => sum + asNumber(node.temperature_c), 0) /
          weatherNodes.length
        : 0;

    return {
      averageTemperature,
      highRiskStations: weatherNodes.filter((node) =>
        highRiskStatuses.has(node.dashboard_status),
      ).length,
      peakRainfall: peak.rainfall,
      peakStation: peak.node?.station_name || "No station",
      slopeSignals: weatherNodes.filter(
        (node) => node.landslide_sensor_triggered || node.debris_flow_detected,
      ).length,
      totalStations: weatherNodes.length,
    };
  }, [weatherNodes]);

  const transitSummary = useMemo(() => {
    const statusCounts = transitRoutes.reduce((counts, route) => {
      const status = route.current_status || "Unknown";
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});

    return {
      blocked: statusCounts.Blocked || 0,
      delayed: statusCounts.Delayed || 0,
      disrupted: transitRoutes.filter((route) => route.current_status !== "Operational").length,
      operational: statusCounts.Operational || 0,
      suspended: statusCounts.Suspended || 0,
      totalRoutes: transitRoutes.length,
    };
  }, [transitRoutes]);

  const topWeatherNodes = useMemo(() => {
    return [...weatherNodes]
      .sort((a, b) => Number.parseFloat(b.rainfall_1hr_mm || 0) - Number.parseFloat(a.rainfall_1hr_mm || 0))
      .slice(0, 10);
  }, [weatherNodes]);

  const priorityTransitRoutes = useMemo(() => {
    const statusRank = {
      Blocked: 0,
      Suspended: 1,
      Delayed: 2,
      Operational: 3,
    };

    return [...transitRoutes]
      .sort((a, b) => (statusRank[a.current_status] ?? 4) - (statusRank[b.current_status] ?? 4))
      .slice(0, 12);
  }, [transitRoutes]);

  const weatherStatusStyles = {
    "Extreme Cloudburst": "border-rose-700 bg-rose-100 text-rose-900",
    Cloudburst: "border-[var(--pahadi-crimson)] bg-rose-50 text-[var(--pahadi-crimson)]",
    "Severe Rainfall": "border-orange-300 bg-orange-50 text-orange-900",
    "Heavy Rain": "border-amber-300 bg-amber-50 text-amber-950",
    "Moderate Rain": "border-sky-300 bg-sky-50 text-sky-900",
    "Light Rain": "border-cyan-200 bg-cyan-50 text-cyan-900",
    Normal: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  const transitStatusStyles = {
    Operational: "border-emerald-200 bg-emerald-50 text-emerald-900",
    Delayed: "border-amber-300 bg-amber-50 text-amber-950",
    Blocked: "border-[var(--pahadi-crimson)] bg-rose-50 text-[var(--pahadi-crimson)]",
    Suspended: "border-slate-300 bg-slate-100 text-slate-800",
  };

  function refreshTelemetry() {
    loadTelemetry();
  }

  function formatTelemetryPing(value) {
    if (!value) return "No ping";

    const pingDate = new Date(value);
    if (Number.isNaN(pingDate.getTime())) return "No ping";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
    }).format(pingDate);
  }

  return (
    <div className="space-y-4">
      <section className="kathkuni-card bg-white p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <PanelHeader
            eyebrow="CM Office Command Console"
            icon={Gauge}
            title="Executive Weather and Transit Cockpit"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] px-3 text-[10px] font-black uppercase tracking-wider text-slate-600">
              <Radio className={cx("h-3.5 w-3.5", refreshing ? "animate-pulse text-[var(--pahadi-crimson)]" : "text-emerald-700")} aria-hidden="true" />
              {refreshing ? "Syncing" : "Live Feed"}
            </span>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-[var(--dry-wool)] bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={refreshing}
              onClick={refreshTelemetry}
              type="button"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--devdar-forest)]" aria-hidden="true" />
              ) : (
                <RefreshCcw className="h-4 w-4 text-[var(--devdar-forest)]" aria-hidden="true" />
              )}
              Sync Feeds
            </button>
          </div>
        </div>

        {telemetryError && (
          <div className="mt-4 flex items-start gap-2 rounded-sm border border-[var(--pahadi-crimson)]/30 bg-rose-50 p-3 text-xs font-semibold text-[var(--pahadi-crimson)]">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{telemetryError}</span>
          </div>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            icon={CloudLightning}
            label="Weather Nodes"
            surface="border-[var(--dry-wool)] bg-white text-slate-900"
            tone="text-[var(--devdar-forest)]"
            value={weatherSummary.totalStations}
          />
          <KpiCard
            icon={Siren}
            label="High Risk Stations"
            surface="border-[var(--pahadi-crimson)]/30 bg-rose-50 text-[var(--pahadi-crimson)]"
            tone="text-[var(--pahadi-crimson)]"
            value={weatherSummary.highRiskStations}
          />
          <KpiCard
            icon={Activity}
            label="Peak Rainfall MM"
            surface="border-sky-200 bg-sky-50 text-sky-950"
            tone="text-sky-900"
            value={Number(weatherSummary.peakRainfall.toFixed(1))}
          />
          <KpiCard
            icon={Radio}
            label="Transit Routes"
            surface="border-[var(--dry-wool)] bg-white text-slate-900"
            tone="text-[var(--devdar-forest)]"
            value={transitSummary.totalRoutes}
          />
          <KpiCard
            icon={Clock3}
            label="Route Disruptions"
            surface="border-[var(--kinnaur-marigold)]/30 bg-amber-50/60 text-amber-950"
            tone="text-amber-900"
            value={transitSummary.disrupted}
          />
          <KpiCard
            icon={TimerReset}
            label="SLA Breaches"
            surface="border-[var(--pahadi-crimson)]/30 bg-rose-50 text-[var(--pahadi-crimson)]"
            tone="text-[var(--pahadi-crimson)]"
            value={metrics.slaBreached}
          />
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <MetricPill label="Peak Rain Node" value={weatherSummary.peakStation} />
          <MetricPill label="Average Temperature" value={`${Number(weatherSummary.averageTemperature.toFixed(1))}C`} />
          <MetricPill label="Slope Sensor Signals" value={weatherSummary.slopeSignals} />
          <MetricPill label="Operational Routes" value={transitSummary.operational} />
          <MetricPill label="Blocked / Suspended" value={`${transitSummary.blocked} / ${transitSummary.suspended}`} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="kathkuni-card min-w-0 bg-white p-5">
          <PanelHeader
            eyebrow="IMD Climatology Node Grid"
            icon={CloudLightning}
            title="Rainfall, River Stage and Landslide Matrix"
          />

          <div className="mt-5 overflow-hidden rounded-sm border border-[var(--dry-wool)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-[#F5F7FA] text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Station</th>
                    <th className="px-3 py-2.5">Rain</th>
                    <th className="px-3 py-2.5">River</th>
                    <th className="px-3 py-2.5">Temp</th>
                    <th className="px-3 py-2.5">Signal</th>
                    <th className="px-3 py-2.5">Ping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs">
                  {topWeatherNodes.map((node) => (
                    <tr key={node.id ?? node.station_name} className="align-top">
                      <td className="px-3 py-3">
                        <p className="font-black text-[var(--devdar-forest)]">{node.station_name}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {node.district} / {node.terrain_type} / {node.elevation_m}m
                        </p>
                      </td>
                      <td className="px-3 py-3 font-mono font-black tabular-nums text-slate-900">
                        {Number(node.rainfall_1hr_mm || 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold tabular-nums text-slate-700">
                        {Number(node.river_stage_m || 0).toFixed(2)}m
                      </td>
                      <td className="px-3 py-3 font-mono font-bold tabular-nums text-slate-700">
                        {Number(node.temperature_c || 0).toFixed(1)}C
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={cx("inline-flex w-fit items-center rounded-xs border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider", weatherStatusStyles[node.dashboard_status] ?? weatherStatusStyles.Normal)}>
                            {node.dashboard_status || "Normal"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {node.takri_status_label || "Sthir"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[10px] font-semibold text-slate-500">
                        {formatTelemetryPing(node.last_ping)}
                      </td>
                    </tr>
                  ))}
                  {topWeatherNodes.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-xs font-bold text-slate-500" colSpan={6}>
                        Weather telemetry feed is waiting for data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="kathkuni-card min-w-0 bg-white p-5">
          <PanelHeader
            eyebrow="HRTC Corridor Ledger"
            icon={Radio}
            title="Transit Route Status Board"
          />

          <div className="mt-5 grid max-h-[36rem] gap-3 overflow-y-auto pr-1">
            {priorityTransitRoutes.map((route) => (
              <article
                className="rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] p-3 shadow-2xs"
                key={route.id ?? route.route_name}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black leading-snug text-[var(--devdar-forest)]">
                      {route.route_name}
                    </h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {route.origin} to {route.destination}
                    </p>
                  </div>
                  <span className={cx("shrink-0 rounded-xs border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider", transitStatusStyles[route.current_status] ?? "border-slate-200 bg-white text-slate-700")}>
                    {route.current_status || "Unknown"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-[10px] font-semibold text-slate-600 sm:grid-cols-2">
                  <div className="rounded-sm border border-slate-200 bg-white p-2">
                    <p className="font-black uppercase tracking-wider text-slate-400">Hazard Zone</p>
                    <p className="mt-1 text-slate-700">{route.key_hazard_zone}</p>
                  </div>
                  <div className="rounded-sm border border-slate-200 bg-white p-2">
                    <p className="font-black uppercase tracking-wider text-slate-400">Relay</p>
                    <p className="mt-1 text-slate-700">{route.relay_state || "Jagrit"}</p>
                  </div>
                </div>

                <p className="mt-3 text-[11px] font-medium leading-relaxed text-slate-600">
                  {route.roznamcha_remarks || route.hazard_profile || "No route remarks posted."}
                </p>
              </article>
            ))}
            {priorityTransitRoutes.length === 0 && (
              <div className="rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] p-6 text-center text-xs font-bold text-slate-500">
                Transit telemetry feed is waiting for data.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="kathkuni-card bg-white p-5">
          <PanelHeader
            eyebrow="Civic Workload Overlay"
            icon={FileText}
            title="Grievance Control Totals"
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricPill label="Total Log Registry" value={metrics.totalGrievances} />
            <MetricPill label="Critical Emergencies" value={metrics.highUpvoteEmergencies} />
            <MetricPill label="Active Pending Queue" value={metrics.activePending} />
            <MetricPill label="Verified Resolved" value={metrics.verifiedResolved} />
          </div>
        </section>

        <section className="kathkuni-card min-w-0 bg-white p-5">
          <PanelHeader
            eyebrow="District Vulnerability Scale"
            icon={Building2}
            title="Infrastructural Burden Allocation Chart"
          />

          <div className="mt-5 h-80 rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] p-4">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={districtLoadData} margin={{ left: -15, right: 8 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis dataKey="district" fontSize={11} stroke="#475569" tickLine={false} />
                <YAxis allowDecimals={false} fontSize={11} stroke="#475569" tickLine={false} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid var(--dry-wool)", borderRadius: 4 }} />
                <Legend />
                <Bar dataKey="Total" fill="var(--devdar-forest)" radius={[2, 2, 0, 0]} name="Total Registry" />
                <Bar dataKey="HighUpvote" fill="var(--pahadi-crimson)" name="Critical Threat Alerts" radius={[2, 2, 0, 0]} />
                <Bar dataKey="LandslideBridge" fill="var(--kinnaur-marigold)" name="Landslide/Bridge Blockades" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function HeritagePillar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState("All");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [activeDeckAsset, setActiveDeckAsset] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [liveAssets, setLiveAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const uniqueDistricts = ["All", "Mandi", "Kullu", "Kinnaur", "Lahaul & Spiti", "Chamba", "Kangra", "Shimla", "Sirmaur", "Bilaspur", "Una & Hamirpur", "Solan"];
  const uniqueCategories = ["All", "State Identity", "Geography & Peaks", "Rivers & Waterways", "Valleys & Canyons", "Famous Hill Stations", "Hidden Gems & Passes", "Famous Lakes", "Temples & Monasteries", "Eco Systems & Wildlife", "Cuisine & Dham", "Agriculture & Crops", "Languages & Attire", "Performing Arts & Fairs", "Architecture & Heritage"];

  useEffect(() => {
    fetch("http://localhost:8000/api/cultural-assets")
      .then((res) => {
        if (!res.ok) throw new Error("Network configuration mismatch.");
        return res.json();
      })
      .then((data) => {
        setLiveAssets(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("API Fetch blocked, utilizing static file backup registry:", err);
        const mappedFallback = COMPREHENSIVE_HERITAGE_REGISTRY.map(asset => ({
          ...asset,
          sub_items: asset.subItems || []
        }));
        setLiveAssets(mappedFallback);
        setIsLoading(false);
      });
  }, []);

  const filteredAssets = useMemo(() => {
    return liveAssets.filter((asset) => {
      const matchesSearch = 
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.specification && asset.specification.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (asset.pillar_category && asset.pillar_category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (asset.sub_items && asset.sub_items.some(sub => 
          sub.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          sub.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.spec.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      
      const matchesDistrict = selectedDistrictFilter === "All" || 
        asset.title.includes(selectedDistrictFilter) || 
        asset.description.includes(selectedDistrictFilter) || 
        (asset.specification && asset.specification.includes(selectedDistrictFilter)) ||
        (asset.sub_items && asset.sub_items.some(sub => 
          sub.name.includes(selectedDistrictFilter) || 
          sub.detail.includes(selectedDistrictFilter) || 
          sub.spec.includes(selectedDistrictFilter)
        ));
        
      const matchesCategory = selectedCategoryFilter === "All" || asset.pillar_category === selectedCategoryFilter;

      return matchesSearch && matchesDistrict && matchesCategory;
    });
  }, [liveAssets, searchQuery, selectedDistrictFilter, selectedCategoryFilter]);

  const handleNextSlide = () => {
    if (!activeDeckAsset?.sub_items) return;
    setCarouselIndex((prev) => (prev + 1) % activeDeckAsset.sub_items.length);
  };

  const handlePrevSlide = () => {
    if (!activeDeckAsset?.sub_items) return;
    setCarouselIndex((prev) => (prev - 1 + activeDeckAsset.sub_items.length) % activeDeckAsset.sub_items.length);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--devdar-forest)]" />
        <span className="font-mono text-[10px] font-bold uppercase text-slate-400">
          Syncing Heritage Registry...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="kathkuni-card bg-white p-6 flex flex-col md:flex-row items-center gap-6 overflow-hidden relative">
        <div className="flex-1 space-y-2">
          <span className="text-[10px] bg-[var(--devdar-forest)] text-[#F5F7FA] font-black px-2.5 py-1 rounded-2xs uppercase tracking-widest">
            Identity Ledger Backplane
          </span>
          <h2 className="text-xl font-black text-[var(--devdar-forest)] uppercase tracking-tight">
            हमारी विरासत / Cultural Asset Canvas Registry
          </h2>
          <p className="text-xs text-slate-600 max-w-4xl leading-relaxed">
            Himachal Pradesh is an extensive Western Himalayan cultural mosaic of Hindu, Buddhist, and indigenous traditions. This single-window command panel acts as a public ledger anchoring civic utility infrastructure inside regional identities—tracking peaks, passes, traditional clothing, and slow-cooked Dham cooking systems.
          </p>
        </div>
        <div className="w-40 h-20 shrink-0 bg-gradient-to-br from-[var(--pahadi-crimson)] via-[var(--kinnaur-marigold)] to-[var(--devdar-forest)] rounded-sm p-0.5 shadow-2xs">
          <div className="w-full h-full bg-white rounded-3xs flex flex-col items-center justify-center p-2 text-center text-[10px] font-mono font-black text-slate-700">
            <span>MOSAIC ECO REGISTRY</span>
            <span className="text-base mt-0.5">🏔️🧵🍲</span>
            <span className="text-[8px] text-slate-400 font-sans mt-0.5 font-normal">28 Pillars Active</span>
          </div>
        </div>
      </div>

      <div className="kathkuni-card bg-white p-4 grid gap-4 md:grid-cols-4 items-center">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            className="w-full rounded-sm border border-[var(--dry-wool)] bg-white pl-4 pr-10 py-2.5 text-xs text-slate-900 outline-none focus:border-[var(--devdar-forest)] shadow-2xs placeholder:text-slate-400 font-semibold"
            placeholder="🔍 Query 28 cultural asset dimensions (ranges, items, passes, gems, dishes)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-black font-mono"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <select
            className="w-full rounded-sm border border-[var(--dry-wool)] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[var(--devdar-forest)]"
            value={selectedDistrictFilter}
            onChange={(e) => setSelectedDistrictFilter(e.target.value)}
          >
            {uniqueDistricts.map(dist => (
              <option key={dist} value={dist}>{dist === "All" ? "📍 Global State Matrix" : `🏔️ ${dist} Query`}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <select
            className="w-full rounded-sm border border-[var(--dry-wool)] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[var(--devdar-forest)]"
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          >
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat === "All" ? "✨ All Axis Dimensions" : cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="himachali-weave-divider rounded-xs" />

      {filteredAssets.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => {
                setActiveDeckAsset(asset);
                setCarouselIndex(0);
              }}
              className="kathkuni-card bg-white p-5 cursor-pointer flex flex-col justify-between border-b-4 border-b-[var(--dry-wool)] hover:border-b-[var(--kinnaur-marigold)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl filter drop-shadow-2xs select-none">{asset.icon}</span>
                  <span className="bg-slate-50 text-slate-700 font-mono text-[9px] font-black tracking-wider px-2 py-0.5 border border-[var(--dry-wool)] rounded-xs uppercase shadow-3xs">
                    {asset.sub_items ? `${asset.sub_items.length} Elements Linked` : "Static Vector"}
                  </span>
                </div>
                <h3 className="text-sm font-black text-[var(--devdar-forest)] uppercase tracking-tight">{asset.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{asset.description}</p>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-[var(--pahadi-crimson)] uppercase tracking-wider">
                <span>Open Creative Deck →</span>
                <span className="text-slate-400 font-mono text-[9px] lowercase tracking-normal bg-slate-100 px-1.5 py-0.5 rounded-xs">{asset.id}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 grid min-h-44 place-items-center rounded-sm border border-dashed border-[var(--dry-wool)] bg-white p-8 text-center shadow-2xs">
          <div>
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] text-slate-400 shadow-3xs">
              <Sparkles className="h-5 w-5 text-[var(--pahadi-crimson)]" />
            </div>
            <p className="mt-3 text-xs font-black text-slate-800 uppercase tracking-wide">
              No Cultural Pillars Found Matching Query
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Your search phrase did not match any of the 28 registered ledger fields or deep specifications.
            </p>
          </div>
        </div>
      )}

      {/* 🚀 HIGH-FIDELITY GLASSMORPHISM TINDER-STYLE CAROUSEL DECK MODAL */}
      {activeDeckAsset && activeDeckAsset.sub_items && (
        <SwipeModal 
          activeDeckAsset={activeDeckAsset}
          setActiveDeckAsset={setActiveDeckAsset}
          carouselIndex={carouselIndex}
          setCarouselIndex={setCarouselIndex}
          handlePrevSlide={handlePrevSlide}
          handleNextSlide={handleNextSlide}
        />
      )}
    </div>
  );
}

function SwipeModal({ 
  activeDeckAsset, 
  setActiveDeckAsset, 
  carouselIndex, 
  setCarouselIndex, 
  handlePrevSlide, 
  handleNextSlide 
}) {
  const [dragStartX, setDragStartX] = useState(null);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const totalItems = activeDeckAsset.sub_items.length;
  const nextIndex = (carouselIndex + 1) % totalItems;
  const prevIndex = (carouselIndex - 1 + totalItems) % totalItems;

  const swipeThreshold = 140; 
  const currentOffsetX = isDragging ? dragCurrentX - dragStartX : 0;
  const swipeProgress = Math.min(Math.abs(currentOffsetX) / swipeThreshold, 1);
  
  const isLeftSwipeActive = currentOffsetX < -15;
  const isRightSwipeActive = currentOffsetX > 15;

  const handleDragStart = (clientX) => {
    setDragStartX(clientX);
    setIsDragging(true);
  };

  const handleDragMove = (clientX) => {
    if (!isDragging) return;
    setDragCurrentX(clientX);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (currentOffsetX > swipeThreshold) {
      handlePrevSlide();
    } else if (currentOffsetX < -swipeThreshold) {
      handleNextSlide();
    }
    
    setDragStartX(null);
    setDragCurrentX(0);
  };

  const mainCardTransformStyle = {
    transform: `translateX(${currentOffsetX}px) rotate(${currentOffsetX * 0.05}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <section className="w-full max-w-xl rounded-xl border border-white/40 bg-white/70 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between gap-4 bg-white/30 border-b border-white/20 p-4">
          <div className="min-w-0">
            <span className="text-[9px] font-black tracking-widest text-[var(--kinnaur-marigold)] uppercase bg-amber-100/60 px-2 py-0.5 rounded-xs">
              {activeDeckAsset.pillar_category}
            </span>
            <h4 className="text-xs font-black uppercase text-[var(--devdar-forest)] truncate mt-1 tracking-tight">
              {activeDeckAsset.title}
            </h4>
          </div>
          <button
            onClick={() => setActiveDeckAsset(null)}
            className="h-7 w-7 rounded-md border border-white/40 bg-white/50 text-slate-500 flex items-center justify-center transition hover:text-slate-800 hover:bg-white/80 shadow-2xs text-xs font-black font-mono"
          >
            ✕
          </button>
        </div>

        <div className="himachali-weave-divider opacity-40" />

        <div className="p-6 space-y-5">
          {/* 🪐 IMAGE GESTURE LAYER */}
          <div 
            className="w-full h-52 relative select-none touch-none rounded-lg"
            onMouseDown={(e) => handleDragStart(e.clientX)}
            onMouseMove={(e) => handleDragMove(e.clientX)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
            onTouchEnd={handleDragEnd}
          >
            {isLeftSwipeActive && (
              <div 
                className="absolute inset-0 rounded-lg border border-white/20 bg-white/40 pointer-events-none flex flex-col items-center justify-center p-4 text-center scale-95 transition-opacity"
                style={{ opacity: swipeProgress * 0.7 }}
              >
                <span className="text-3xl opacity-40 filter blur-xs">{activeDeckAsset.sub_items[nextIndex].icon || activeDeckAsset.icon}</span>
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400 mt-2">Incoming Vector</span>
                <h5 className="text-xs font-bold text-slate-500 line-clamp-1">{activeDeckAsset.sub_items[nextIndex].name}</h5>
              </div>
            )}

            {isRightSwipeActive && (
              <div 
                className="absolute inset-0 rounded-lg border border-white/20 bg-white/40 pointer-events-none flex flex-col items-center justify-center p-4 text-center scale-95 transition-opacity"
                style={{ opacity: swipeProgress * 0.7 }}
              >
                <span className="text-3xl opacity-40 filter blur-xs">{activeDeckAsset.sub_items[prevIndex].icon || activeDeckAsset.icon}</span>
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400 mt-2">Previous Vector</span>
                <h5 className="text-xs font-bold text-slate-500 line-clamp-1">{activeDeckAsset.sub_items[prevIndex].name}</h5>
              </div>
            )}

            <div 
              style={mainCardTransformStyle}
              className="absolute inset-0 bg-white/95 border border-white/50 shadow-md rounded-lg flex flex-col items-center justify-center p-4 text-center overflow-hidden"
            >
              {activeDeckAsset.sub_items[carouselIndex].img ? (
                <img 
                  src={activeDeckAsset.sub_items[carouselIndex].img} 
                  alt={activeDeckAsset.sub_items[carouselIndex].name}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              ) : (
                <div className="text-slate-500 space-y-1 pointer-events-none select-none">
                  <span className="text-4xl filter drop-shadow-md block animate-pulse">
                    {activeDeckAsset.sub_items[carouselIndex].icon || activeDeckAsset.icon}
                  </span>
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider block text-slate-600">Image Asset Layer Active</span>
                  <p className="text-[9px] font-sans text-slate-500 max-w-[260px] mx-auto leading-normal">
                    Technical anchor setup allocated for {activeDeckAsset.sub_items[carouselIndex].name} asset file injections.
                  </p>
                </div>
              )}
              
              <div className="absolute bottom-3 right-3 bg-slate-950/70 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-md font-mono text-[9px] font-bold tabular-nums border border-white/10 shadow-sm">
                {carouselIndex + 1} / {totalItems}
              </div>
            </div>
          </div>

          <div className="space-y-2 min-h-[95px] px-0.5 pointer-events-none select-none">
            <h3 className="text-sm font-black text-[var(--devdar-forest)] uppercase tracking-tight flex items-center gap-2">
              <span className="text-xl">{activeDeckAsset.sub_items[carouselIndex].icon}</span>
              {activeDeckAsset.sub_items[carouselIndex].name}
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {activeDeckAsset.sub_items[carouselIndex].detail}
            </p>
          </div>

          <div className="p-3 bg-white/50 border border-white/40 rounded-lg shadow-3xs pointer-events-none select-none">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block font-sans">
              Identity Attribute Vector Vector
            </span>
            <p className="text-[10px] font-bold text-slate-800 mt-0.5 font-mono leading-tight text-left break-words">
              {activeDeckAsset.sub_items[carouselIndex].spec}
            </p>
          </div>
        </div>

        <div className="bg-white/40 border-t border-white/20 p-4 flex items-center justify-between">
          <button
            onClick={handlePrevSlide}
            className={cx(
              "px-3 py-1.5 rounded-md border text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-2xs active:scale-98",
              isRightSwipeActive
                ? "bg-amber-500 border-amber-400 text-white ring-4 ring-amber-500/20 scale-105 shadow-md"
                : "border-white/40 bg-white/60 text-slate-700 hover:bg-white/80"
            )}
          >
            ← Prev Vector
          </button>

          <div className="flex gap-1.5 items-center">
            {activeDeckAsset.sub_items.map((_, dotIdx) => (
              <button 
                key={dotIdx}
                onClick={() => setCarouselIndex(dotIdx)}
                className={`h-2 rounded-full transition-all duration-300 ${dotIdx === carouselIndex ? "bg-[var(--pahadi-crimson)] w-5 shadow-3xs" : "bg-slate-300 hover:bg-slate-400 w-2"}`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNextSlide}
            className={cx(
              "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-2xs active:scale-98",
              isLeftSwipeActive
                ? "bg-emerald-600 text-white ring-4 ring-emerald-600/20 scale-105 shadow-md"
                : "bg-[var(--devdar-forest)] text-white hover:bg-[#132B1F]"
            )}
          >
            Next Slide →
          </button>
        </div>
      </section>
    </div>
  );
}

function GrievanceFeedCard({ ticket, onUpvote, onSelectResolve, onSelectVeto }) {
  const effectivePriority = getEffectivePriority(ticket);
  const isCluster = ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD;

  const localPriorityStyles = {
    critical: "border-[var(--pahadi-crimson)] bg-rose-50 text-[var(--pahadi-crimson)]",
    high: "border-[var(--kinnaur-marigold)] bg-amber-50/60 text-amber-950",
    medium: "border-[var(--dry-wool)] bg-slate-50 text-slate-800",
    low: "border-slate-200 bg-slate-100 text-slate-600",
  };

  const localStatusStyles = {
    Pending: "border-[var(--dry-wool)] bg-white text-slate-800",
    "Under Verification": "border-sky-300 bg-sky-50 text-sky-900",
    "Verified Resolved": "border-emerald-300 bg-emerald-50 text-emerald-900",
    "Reopened via Citizen Veto": "border-[var(--pahadi-crimson)] bg-rose-50 text-[var(--pahadi-crimson)]",
  };

  return (
    <article className="rounded-sm border border-[var(--dry-wool)] bg-white p-4 transition duration-150 hover:shadow-2xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cx("inline-flex items-center border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-xs", localPriorityStyles[effectivePriority])}>
              {priorityLabel[effectivePriority]}
            </span>
            <span className={cx("inline-flex items-center border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-xs", localStatusStyles[ticket.status])}>
              {ticket.status}
            </span>
            {isCluster && (
              <span className="border border-[var(--pahadi-crimson)] bg-rose-50 text-[var(--pahadi-crimson)] text-[9px] uppercase tracking-wider rounded-xs py-0.5 px-2 font-bold animate-pulse">
                💥 High Threat Emergency
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-[var(--devdar-forest)] tracking-tight leading-snug">
            {ticket.title}
          </h3>
          <p className="text-[11px] font-medium text-slate-500">
            📍 {ticket.district} / {ticket.block} / {ticket.panchayat}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 self-end sm:self-start">
          <button
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] px-3 text-xs font-bold font-mono text-[var(--devdar-forest)] transition hover:bg-slate-100 tabular-nums shadow-2xs"
            onClick={() => onUpvote(ticket.id)}
            type="button"
          >
            <ThumbsUp className="h-3.5 w-3.5 text-[var(--pahadi-crimson)]" />
            {ticket.upvotes}
          </button>
          {ticket.status === "Verified Resolved" && (
            <button
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border border-[var(--pahadi-crimson)] bg-rose-50 px-3 text-xs font-bold uppercase tracking-wider text-[var(--pahadi-crimson)] transition hover:bg-rose-100/60 shadow-2xs"
              onClick={onSelectVeto}
              type="button"
            >
              <Flame className="h-3.5 w-3.5" />
              Veto
            </button>
          )}
          {ticket.status !== "Verified Resolved" && (
            <button
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm bg-emerald-700 px-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-emerald-800 shadow-2xs"
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-2xs animate-in fade-in">
      <section className="w-full max-w-2xl rounded-sm border border-[var(--dry-wool)] bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--dry-wool)] bg-[#F5F7FA] p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {isVeto ? "Citizen Counter-Verification" : "Administrative Closing Ledger"}
            </p>
            <h2 className="mt-1 break-all text-sm font-mono font-black text-slate-900">
              📁 Ticket Ref: {ticket.id}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-600 line-clamp-1">
              {ticket.title}
            </p>
          </div>
          <button
            aria-label="Close modal"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-[var(--dry-wool)] bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 shadow-2xs"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
          </button>
        </div>

        <div className="himachali-weave-divider" />

        <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
          {isVeto ? (
            <>
              <Field label="Why should this work closure be blocked? (Citizen Veto Remarks)">
                <textarea
                  className={cx(inputClass, "min-h-32 resize-none")}
                  placeholder="Provide explicit ground evidence demonstrating that the reported public works repair is incomplete or sub-standard..."
                  value={vetoRemarks}
                  onChange={(event) => setVetoRemarks(event.target.value)}
                />
              </Field>
              {error && <InlineError message={error} />}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2 border-t border-slate-100">
                <button
                  className="h-9 rounded-sm border border-[var(--dry-wool)] bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
                  onClick={onClose}
                  type="button"
                >
                  Dismiss
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm bg-[var(--pahadi-crimson)] px-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#801422] disabled:opacity-40 shadow-xs"
                  disabled={!vetoRemarks.trim()}
                  type="submit"
                >
                  <Flame className="h-4 w-4" />
                  File Executive Veto
                </button>
              </div>
            </>
          ) : (
            <>
              <Field label="Field Engineering Actions / Resolution Notes">
                <textarea
                  className={cx(inputClass, "min-h-32 resize-none")}
                  placeholder="Detail exactly what structural patches, drainage clearouts, or engineering measures were completed on-site to secure this asset..."
                  value={resolutionNotes}
                  onChange={(event) => setResolutionNotes(event.target.value)}
                />
              </Field>

              <Field label="Validation Image URL / Field Evidence Photo">
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="https://images.example.gov.in/hp/monsoon-evidence-clear.jpg"
                    value={validationImageUrl}
                    onChange={(event) => validationImageUrl && setValidationImageUrl(event.target.value)}
                  />
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] text-slate-500 shadow-2xs">
                    <ImagePlus className="h-4 w-4 text-[var(--devdar-forest)]" aria-hidden="true" />
                  </div>
                </div>
              </Field>

              {error && <InlineError message={error} />}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2 border-t border-slate-100">
                <button
                  className="h-9 rounded-sm border border-[var(--dry-wool)] bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-sm bg-[var(--devdar-forest)] px-4 text-xs font-bold uppercase tracking-wider text-[#F5F7FA] transition hover:bg-[#132B1F] disabled:opacity-50 shadow-2xs"
                  disabled={!resolutionNotes.trim() || !validationImageUrl.trim()}
                  type="submit"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Confirm Field Resolution
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
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--kinnaur-marigold)]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-base font-black text-[var(--devdar-forest)] uppercase tracking-tight">
          {title}
        </h2>
      </div>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] text-[var(--devdar-forest)] shadow-2xs">
        <Icon className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, surface, tone }) {
  return (
    <article className={cx("rounded-sm border p-4 shadow-2xs flex flex-col justify-between", surface)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 leading-tight">{label}</p>
        <Icon className={cx("h-4 w-4 shrink-0 mt-0.5", tone)} aria-hidden="true" />
      </div>
      <p className={cx("mt-4 text-2xl font-black font-mono tabular-nums", tone)}>
        {Number(value || 0).toLocaleString("en-IN")}
      </p>
    </article>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="rounded-sm border border-[var(--dry-wool)] bg-[#F5F7FA] p-3 shadow-2xs">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 break-words text-xs font-bold text-[var(--devdar-forest)]">
        {value}
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-xs">
      <span className="font-bold text-slate-700 uppercase tracking-tight text-[11px]">{label}</span>
      {children}
    </label>
  );
}

function InlineError({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pahadi-crimson)]" aria-hidden="true" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail }) {
  return (
    <div className="mt-5 grid min-h-36 place-items-center rounded-sm border border-dashed border-[var(--dry-wool)] bg-[#F5F7FA] p-5 text-center">
      <div>
        <div className="mx-auto grid h-9 w-9 place-items-center rounded-sm border border-[var(--dry-wool)] bg-white text-slate-400 shadow-2xs">
          <Icon className="h-4 w-4 text-[var(--devdar-forest)]" aria-hidden="true" />
        </div>
        <p className="mt-2.5 text-xs font-bold text-slate-800 uppercase tracking-wide">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500 max-w-xs mx-auto">{detail}</p>
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

function isSlaBreached(ticket, nowMs) {
  return (
    ticket.status !== "Verified Resolved" &&
    new Date(ticket.slaDueAt).getTime() < nowMs
  );
}

function formatSlaStatus(ticket, nowMs) {
  if (ticket.status === "Verified Resolved") {
    return "Resolved";
  }

  const dueAtMs = new Date(ticket.slaDueAt).getTime();
  if (!Number.isFinite(dueAtMs)) {
    return "SLA not set";
  }

  const minutes = Math.round(Math.abs(dueAtMs - nowMs) / 60_000);
  const duration = formatDuration(minutes);

  return dueAtMs < nowMs ? `⚠️ Breached by ${duration}` : `⏳ ${duration} remaining`;
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export default App;
