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
  Command,
  FileText,
  Gauge,
  ImagePlus,
  Loader2,
  Radio,
  RefreshCcw,
  Send,
  ShieldAlert,
  Siren,
  TimerReset,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import himachalCrest from "./assets/himachal-crest.png";

const ACTIVE_VIEW_STORAGE_KEY = "hp-municipal-active-view";
const UPVOTE_CRITICAL_THRESHOLD = 30;
const FLASH_FLOOD_RISK = "Flash Flood Khud Proximity";
const CLOCK_INTERVAL_MS = 60_000;
const APP_CLOCK_STARTED_AT_MS = new Date().getTime();

const views = [
  {
    id: "citizen",
    label: "Citizen Ingress Portal",
    eyebrow: "Community Intake",
    icon: UserRound,
  },
  {
    id: "officer",
    label: "Field Officer Workspace",
    eyebrow: "Terrain Queue",
    icon: BadgeCheck,
  },
  {
    id: "executive",
    label: "CM Office Executive Hub",
    eyebrow: "Telemetry",
    icon: Command,
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
  critical: "border-rose-200/50 bg-rose-100/60 text-rose-900",
  high: "border-amber-200/50 bg-amber-100/60 text-amber-900",
  medium: "border-sky-200/50 bg-sky-100/50 text-sky-900",
  low: "border-emerald-200/50 bg-emerald-100/50 text-emerald-900",
};

const statusTone = {
  Pending: "border-amber-200/50 bg-amber-100/60 text-amber-900",
  "Under Verification": "border-sky-200/50 bg-sky-100/50 text-sky-900",
  "Verified Resolved": "border-emerald-200/50 bg-emerald-100/50 text-emerald-900",
};

const priorityLabel = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const inputClass =
  "w-full rounded-lg border border-[#eae8e0] bg-white px-3 py-2 text-sm " +
  "text-zinc-900 outline-none transition placeholder:text-zinc-400 " +
  "focus:border-[#1a2332] focus:bg-white focus:ring-4 focus:ring-[#1a2332]/5";

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
      return "citizen";
    }

    const storedView = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
    return views.some((view) => view.id === storedView) ? storedView : "citizen";
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

  return (
    <main className="min-h-screen bg-[#f4f3ef] text-zinc-900 selection:bg-[#eae8e0]/80">
      <MonsoonAlertTicker />

      <div className="border-b border-[#eae8e0] bg-[#f9f9f7]/85 shadow-sm shadow-[#eae8e0]/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#eae8e0] bg-white p-0.5 shadow-sm shadow-[#eae8e0]/60 transition-transform duration-200 hover:scale-105">
                <img 
                  src={himachalCrest} 
                  alt="Dev Bhoomi Governance Crest" 
                  className="h-full w-full object-contain rounded-lg"
                  />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Himachal Pradesh Municipal Accountability & Monsoon Infrastructure
                </p>
                <h1 className="truncate text-lg font-semibold text-zinc-900">
                  {activeViewConfig?.label}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#eae8e0] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a2332] shadow-sm shadow-[#eae8e0]/40">
                <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
                District telemetry live
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#eae8e0] bg-[#f9f9f7]/80 px-3 py-2 shadow-sm shadow-[#eae8e0]/50">
                <Activity className="h-3.5 w-3.5 text-sky-600" />
                Monsoon command state
              </span>
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border border-[#eae8e0] bg-[#efeee8]/70 p-1.5 shadow-sm shadow-[#eae8e0]/50 backdrop-blur md:grid-cols-3">
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.id;

              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={cx(
                    "flex items-center justify-between rounded-md px-3 py-2.5 text-left transition",
                    isActive
                      ? "scale-[1.01] bg-[#1a2332] text-[#f9f9f7] shadow-md shadow-[#1a2332]/10"
                      : "text-zinc-600 hover:bg-[#f9f9f7]/80 hover:text-zinc-900",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {view.label}
                      </span>
                      <span
                        className={cx(
                          "block text-xs",
                          isActive ? "text-zinc-300" : "text-zinc-500",
                        )}
                      >
                        {view.eyebrow}
                      </span>
                    </span>
                  </span>
                  <ChevronRight
                    className={cx(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-white" : "text-zinc-400",
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {activeView === "citizen" && (
          <CitizenPortal
            grievances={grievances}
            onCreateGrievance={handleCreateGrievance}
            onUpvote={handleUpvote}
          />
        )}
        {activeView === "officer" && (
          <FieldOfficerWorkspace
            grievances={grievances}
            nowMs={nowMs}
            onResolve={handleResolve}
          />
        )}
        {activeView === "executive" && (
          <ExecutiveHub grievances={grievances} nowMs={nowMs} />
        )}
      </div>
    </main>
  );
}

function MonsoonAlertTicker() {
  const bulletins = [
    "IMD ORANGE ALERT: Heavy rainfall expected in Mandi & Kullu districts. Flash flood risk high over next 48 hours. Landslide warnings active on NH-3.",
    "Kangra hill slopes under watch: waterlogged feeder roads and substation access corridors require immediate inspection.",
    "Lahaul & Spiti high-alpine tracks reporting rapid snowmelt runoff. Bailey bridge and drinking water line crews remain on standby.",
  ];

  return (
    <section className="border-b border-rose-200/50 bg-rose-100/30 text-rose-950">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-2 sm:px-6 lg:px-8">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rose-200/60 bg-[#f9f9f7] text-rose-950">
          <CloudLightning className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track flex gap-10 whitespace-nowrap text-xs font-bold uppercase tracking-[0.16em]">
            {[...bulletins, ...bulletins].map((bulletin, index) => (
              <span className="inline-flex items-center gap-3" key={`${bulletin}-${index}`}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-950" />
                {bulletin}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CitizenPortal({ grievances, onCreateGrievance, onUpvote }) {
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
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-lg border border-[#eae8e0] bg-[#f9f9f7] p-5 shadow-sm shadow-[#eae8e0]/50">
        <PanelHeader
          eyebrow="Citizen Ingress"
          icon={Send}
          title="Mountain infrastructure complaint intake"
        />

        <form className="mt-5 grid gap-4" onSubmit={submitIntake}>
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
              className={cx(inputClass, "min-h-28 resize-none")}
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
            />
          </Field>

          <Field label="Photo URL">
            <input
              className={inputClass}
              placeholder="https://..."
              value={form.intakePhotoUrl}
              onChange={(event) => updateForm("intakePhotoUrl", event.target.value)}
            />
          </Field>

          {error && <InlineError message={error} />}

          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1a2332] px-4 text-sm font-bold text-[#f9f9f7] shadow-md shadow-[#1a2332]/10 transition-all duration-200 hover:bg-[#233044]"
            type="submit"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Submit grievance
          </button>
        </form>
      </section>

      <div className="grid gap-5">
        <section className="rounded-lg border border-[#eae8e0] bg-[#f9f9f7] p-5 shadow-sm shadow-[#eae8e0]/50">
          <PanelHeader
            eyebrow="Intake Result"
            icon={TimerReset}
            title="Live ticket state"
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

        <section className="rounded-lg border border-[#eae8e0] bg-[#f9f9f7] p-5 shadow-sm shadow-[#eae8e0]/50">
          <PanelHeader
            eyebrow="Community Signal"
            icon={ArrowBigUp}
            title="Local grievance feed"
          />

          <div className="mt-5 grid gap-3">
            {feed.map((ticket) => (
              <GrievanceFeedCard
                key={ticket.id}
                onUpvote={onUpvote}
                ticket={ticket}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function GrievanceFeedCard({ ticket, onUpvote }) {
  const effectivePriority = getEffectivePriority(ticket);
  const isCluster = ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD;

  return (
    <article className="rounded-lg border border-[#eae8e0] bg-[#f9f9f7] p-4 shadow-sm shadow-[#eae8e0]/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={priorityTone[effectivePriority]}>
              {priorityLabel[effectivePriority]}
            </Badge>
            <Badge className={statusTone[ticket.status]}>{ticket.status}</Badge>
            {isCluster && (
              <Badge className="border-rose-200/50 bg-rose-100/60 text-rose-900">
                High-Upvote Emergency
              </Badge>
            )}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-950">
            {ticket.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {ticket.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
            <span className="rounded-md border border-[#eae8e0] bg-[#efeee8] px-2 py-1">
              {ticket.district} / {ticket.block} / {ticket.panchayat}
            </span>
            <span className="rounded-md border border-[#eae8e0] bg-[#efeee8] px-2 py-1">
              {ticket.infrastructureType}
            </span>
            <span className="rounded-md border border-[#eae8e0] bg-[#efeee8] px-2 py-1">
              {ticket.terrainRisk}
            </span>
          </div>
        </div>
        <button
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#1a2332]/15 bg-[#1a2332]/5 px-3 text-sm font-bold text-[#1a2332] transition hover:bg-[#1a2332] hover:text-[#f9f9f7]"
          onClick={() => onUpvote(ticket.id)}
          type="button"
        >
          <ArrowBigUp className="h-4 w-4" aria-hidden="true" />
          <span className="rounded-md border border-current/20 px-2 py-0.5 tabular-nums">
            {ticket.upvotes}
          </span>
        </button>
      </div>
    </article>
  );
}

function FieldOfficerWorkspace({ grievances, nowMs, onResolve }) {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [validationImageUrl, setValidationImageUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const queue = useMemo(
    () =>
      grievances.filter((ticket) => ticket.status !== "Verified Resolved"),
    [grievances],
  );

  const sortedQueue = useMemo(
    () =>
      [...queue].sort((left, right) => {
        const scoreDelta =
          calculateCompositeScore(right) - calculateCompositeScore(left);
        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        return new Date(left.slaDueAt).getTime() - new Date(right.slaDueAt).getTime();
      }),
    [queue],
  );

  function openResolution(ticket) {
    setSelectedTicket(ticket);
    setResolutionNotes("");
    setValidationImageUrl("");
    setError("");
    setSuccess("");
  }

  function closeResolution() {
    setSelectedTicket(null);
    setResolutionNotes("");
    setValidationImageUrl("");
    setError("");
  }

  function submitResolution(event) {
    event.preventDefault();

    if (!selectedTicket) {
      return;
    }

    if (!resolutionNotes.trim() || !validationImageUrl.trim()) {
      setError("Resolution Notes and Validation Image URL are mandatory.");
      return;
    }

    onResolve(
      selectedTicket.id,
      resolutionNotes.trim(),
      validationImageUrl.trim(),
    );
    setSuccess(`${selectedTicket.id} verified and closed with evidence.`);
    closeResolution();
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#eae8e0] bg-[#f9f9f7] p-5 shadow-sm shadow-[#eae8e0]/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PanelHeader
            eyebrow="Terrain-Weighted Priority"
            icon={ShieldAlert}
            title="Operational work queue"
          />
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-zinc-600">
            <span className="rounded-lg border border-[#eae8e0] bg-white px-3 py-2 shadow-sm shadow-[#eae8e0]/40">
              Active tickets: {queue.length}
            </span>
            <span className="rounded-lg border border-[#eae8e0] bg-white px-3 py-2 shadow-sm shadow-[#eae8e0]/40">
              Top score: {sortedQueue[0] ? calculateCompositeScore(sortedQueue[0]) : 0}
            </span>
          </div>
        </div>

        {success && (
          <div className="mt-4">
            <InlineSuccess message={success} />
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-lg border border-[#eae8e0] bg-[#f9f9f7]">
          <div className="overflow-x-auto">
            <div className="min-w-[1020px]">
              <div className="grid grid-cols-[0.6fr_1.45fr_1.2fr_1.3fr_0.9fr_0.9fr_0.8fr] gap-3 border-b border-[#eae8e0] bg-[#efeee8] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-600">
                <span>Score</span>
                <span>Ticket</span>
                <span>Location</span>
                <span>Infrastructure</span>
                <span>Priority</span>
                <span>SLA</span>
                <span className="text-right">Action</span>
              </div>

              <div className="divide-y divide-[#eae8e0]">
                {sortedQueue.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm font-medium text-zinc-500">
                    No open monsoon infrastructure complaints.
                  </div>
                ) : (
                  sortedQueue.map((ticket, index) => {
                    const effectivePriority = getEffectivePriority(ticket);
                    const sla = getSlaMeta(ticket, nowMs);

                    return (
                      <div
                        className={cx(
                          "grid grid-cols-[0.6fr_1.45fr_1.2fr_1.3fr_0.9fr_0.9fr_0.8fr] items-center gap-3 px-4 py-3 text-sm transition hover:bg-[#eae8e0]/60",
                          index % 2 === 0 ? "bg-[#f9f9f7]" : "bg-[#efeee8]",
                        )}
                        key={ticket.id}
                      >
                        <span className="font-mono text-sm font-bold tabular-nums text-[#1a2332]">
                          {calculateCompositeScore(ticket)}
                        </span>
                        <span className="min-w-0">
                          <span className="block break-all font-mono text-xs font-medium text-zinc-600">
                            {ticket.id}
                          </span>
                          <span className="mt-1 block truncate font-semibold text-zinc-950">
                            {ticket.title}
                          </span>
                        </span>
                        <span className="text-zinc-700">
                          {ticket.district}
                          <span className="block text-xs text-zinc-500">
                            {ticket.block} / {ticket.panchayat}
                          </span>
                        </span>
                        <span className="text-zinc-700">
                          {ticket.infrastructureType}
                          <span className="block text-xs text-zinc-500">
                            {ticket.terrainRisk}
                          </span>
                        </span>
                        <span className="flex flex-col items-start gap-1">
                          <Badge className={priorityTone[effectivePriority]}>
                            {priorityLabel[effectivePriority]}
                          </Badge>
                          <span className="text-xs font-semibold text-zinc-500">
                            {ticket.upvotes} upvotes
                          </span>
                        </span>
                        <span>
                          <Badge className={sla.tone}>{sla.label}</Badge>
                        </span>
                        <span className="flex justify-end">
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1a2332] px-3.5 text-xs font-bold text-[#f9f9f7] shadow-sm shadow-[#1a2332]/10 transition-all duration-200 hover:bg-[#233044]"
                            onClick={() => openResolution(ticket)}
                            type="button"
                          >
                            Resolve
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4 backdrop-blur-sm">
          <section className="w-full max-w-2xl rounded-lg border border-[#eae8e0] bg-[#f9f9f7] shadow-2xl shadow-zinc-950/10 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-4 border-b border-[#eae8e0] bg-[#efeee8] p-5">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Resolution Evidence
                </p>
                <h2 className="mt-1 break-all text-lg font-semibold text-zinc-900">
                  {selectedTicket.id}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {selectedTicket.title}
                </p>
              </div>
              <button
                aria-label="Close resolution modal"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#eae8e0] bg-[#f9f9f7] text-zinc-500 transition hover:bg-[#efeee8] hover:text-zinc-900"
                onClick={closeResolution}
                type="button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={submitResolution}>
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
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#eae8e0] bg-[#efeee8] text-zinc-500">
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </Field>

              {error && <InlineError message={error} />}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="h-10 rounded-lg border border-[#eae8e0] bg-[#f9f9f7] px-4 text-sm font-semibold text-zinc-700 transition hover:bg-[#efeee8]"
                  onClick={closeResolution}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                  disabled={!resolutionNotes.trim() || !validationImageUrl.trim()}
                  type="submit"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Confirm Resolution
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function ExecutiveHub({ grievances, nowMs }) {
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

  const executiveAlerts = useMemo(
    () =>
      [...grievances]
        .filter(
          (ticket) =>
            ticket.status !== "Verified Resolved" &&
            (ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD ||
              isSlaBreached(ticket, nowMs) ||
              ticket.terrainRisk === FLASH_FLOOD_RISK),
        )
        .sort(
          (left, right) =>
            calculateCompositeScore(right) - calculateCompositeScore(left),
        )
        .slice(0, 4),
    [grievances, nowMs],
  );

  function refreshTelemetry() {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 450);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[#eae8e0] bg-[#f9f9f7] p-5 shadow-sm shadow-[#eae8e0]/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PanelHeader
            eyebrow="CM Office Command"
            icon={Gauge}
            title="Executive telemetry and monsoon accountability"
          />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#eae8e0] bg-[#f9f9f7] px-4 text-sm font-semibold text-zinc-700 shadow-sm shadow-[#eae8e0]/50 transition hover:bg-[#efeee8] disabled:cursor-not-allowed disabled:text-zinc-400"
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

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={FileText}
            label="Total Grievances"
            surface="border-[#eae8e0] bg-[#efeee8] shadow-sm shadow-[#eae8e0]/40"
            tone="text-zinc-900"
            value={metrics.totalGrievances}
          />
          <KpiCard
            icon={Siren}
            label="High-Upvote Emergencies"
            surface="border-rose-200/50 bg-rose-100/60 text-rose-900"
            tone="text-rose-900"
            value={metrics.highUpvoteEmergencies}
          />
          <KpiCard
            icon={Clock3}
            label="Active Pending"
            surface="border-amber-200/50 bg-amber-100/60 text-amber-900"
            tone="text-amber-900"
            value={metrics.activePending}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Verified Resolved"
            surface="border-emerald-200/60 bg-emerald-50/60 text-emerald-900"
            tone="text-emerald-900"
            value={metrics.verifiedResolved}
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-[#eae8e0] bg-[#f9f9f7] p-5 shadow-sm shadow-[#eae8e0]/50">
          <PanelHeader
            eyebrow="Alert Stream"
            icon={Bell}
            title="Executive monsoon signals"
          />

          {executiveAlerts.length ? (
            <div className="mt-5 grid gap-3">
              {executiveAlerts.map((ticket) => (
                <ExecutiveAlertCard
                  key={ticket.id}
                  nowMs={nowMs}
                  ticket={ticket}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              detail="No high-risk district signals are active."
              icon={BadgeCheck}
              title="Telemetry clear"
            />
          )}
        </section>

        <section className="rounded-lg border border-[#eae8e0] bg-[#f9f9f7] p-5 shadow-sm shadow-[#eae8e0]/50">
          <PanelHeader
            eyebrow="Infrastructure Load"
            icon={Building2}
            title="Infrastructural Load by District"
          />

          <div className="mt-5 h-80 rounded-lg border border-[#eae8e0] bg-[#efeee8]/70 p-3">
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
                  fill="#9f1239"
                  name="High-Upvote"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="LandslideBridge"
                  fill="#b45309"
                  name="Landslide/Bridge"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function ExecutiveAlertCard({ nowMs, ticket }) {
  const sla = getSlaMeta(ticket, nowMs);
  const isCluster = ticket.upvotes > UPVOTE_CRITICAL_THRESHOLD;
  const isFlood = ticket.terrainRisk === FLASH_FLOOD_RISK;
  const Icon = isCluster || isFlood ? Siren : AlertTriangle;

  return (
    <article className="rounded-lg border border-rose-100/80 bg-rose-50/50 p-4 text-rose-900 shadow-sm shadow-[#eae8e0]/40">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-100/70 text-rose-800">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">
              {isCluster
                ? "High-upvote infrastructure emergency"
                : isFlood
                  ? "Flash flood corridor escalation"
                  : "SLA risk escalation"}
            </p>
            <Badge className={sla.tone}>{sla.label}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6">{ticket.title}</p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <AlertDatum label="District" value={ticket.district} />
            <AlertDatum label="Upvotes" value={String(ticket.upvotes)} />
            <AlertDatum
              label="Composite"
              value={String(calculateCompositeScore(ticket))}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function PanelHeader({ eyebrow, icon: Icon, title }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900">{title}</h2>
      </div>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#1a2332]/10 bg-[#1a2332]/5 text-[#1a2332]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
    </div>
  );
}

function AlertDatum({ label, value }) {
  return (
    <div className="rounded-md border border-rose-100/80 bg-[#f9f9f7]/80 px-3 py-2">
      <p className="font-medium uppercase tracking-[0.12em] opacity-60">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, surface, tone }) {
  return (
    <article className={cx("rounded-lg border p-4", surface)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        <Icon className={cx("h-4 w-4", tone)} aria-hidden="true" />
      </div>
      <p className={cx("mt-3 text-3xl font-semibold tabular-nums", tone)}>
        {Number(value || 0).toLocaleString("en-IN")}
      </p>
    </article>
  );
}

function MetricPill({ label, value }) {
  return (
    <div className="rounded-lg border border-[#eae8e0] bg-[#efeee8] p-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function Badge({ children, className }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

function InlineError({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-rose-100/80 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function InlineSuccess({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-100/80 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-700">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail }) {
  return (
    <div className="mt-5 grid min-h-44 place-items-center rounded-lg border border-dashed border-[#eae8e0] bg-[#efeee8]/70 p-6 text-center">
      <div>
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg border border-[#eae8e0] bg-[#f9f9f7] text-zinc-500 shadow-sm shadow-[#eae8e0]/50">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-1 text-sm text-zinc-500">{detail}</p>
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

function getSlaMeta(ticket, nowMs) {
  if (ticket.status === "Verified Resolved") {
    return {
      label: "Verified",
      tone: "border-emerald-200/50 bg-emerald-100/50 text-emerald-900",
    };
  }

  const target = new Date(ticket.slaDueAt).getTime();
  const diffHours = (target - nowMs) / (1000 * 60 * 60);

  if (diffHours < 0) {
    return {
      label: "Breached",
      tone: "border-amber-200/50 bg-amber-100/60 text-amber-900",
    };
  }

  if (diffHours <= 6) {
    return {
      label: `${Math.ceil(diffHours)}h left`,
      tone: "border-amber-200/50 bg-amber-100/60 text-amber-900",
    };
  }

  return {
    label: formatDateTime(ticket.slaDueAt),
    tone: "border-[#eae8e0] bg-[#efeee8] text-zinc-700",
  };
}

function isSlaBreached(ticket, nowMs) {
  return (
    ticket.status !== "Verified Resolved" &&
    new Date(ticket.slaDueAt).getTime() < nowMs
  );
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
