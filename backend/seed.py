import logging
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Iterable

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from security import hash_password

from database import SessionLocal, engine
from main import (
    DEPARTMENT_CODES,
    HIMACHAL_ADMIN_HIERARCHY,
    SLA_HOURS_BY_PRIORITY,
    allocate_department_name,
    evaluate_priority,
)
from models import (
    Base,
    Category,
    Citizen,
    CulturalAsset,
    Department,
    District,
    Grievance,
    GrievanceLog,
    Notification,
    Officer,
    Subcategory,
    TransitRoute,
    WeatherStation,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

TRUNCATE_TABLES = (
    Notification.__tablename__,
    GrievanceLog.__tablename__,
    Grievance.__tablename__,
    Officer.__tablename__,
    Citizen.__tablename__,
    Subcategory.__tablename__,
    Category.__tablename__,
    Department.__tablename__,
    District.__tablename__,
    CulturalAsset.__tablename__,
    "weather_stations",
    "transit_routes",
)

SEQUENCE_TABLES = (
    District.__tablename__,
    Department.__tablename__,
    Category.__tablename__,
    Subcategory.__tablename__,
    Citizen.__tablename__,
    Officer.__tablename__,
    Grievance.__tablename__,
    GrievanceLog.__tablename__,
    Notification.__tablename__,
)

DEPARTMENT_IDS = {
    "Public Works Department": 1,
    "Jal Shakti Vibhag": 2,
    "National Highways Wing": 3,
    "HPSEBL Operations": 4,
}

def add_records(session, records: Iterable[object]) -> None:
    for record in records:
        session.add(record)

def reset_serial_sequence(session, table_name: str, column_name: str = "id") -> None:
    session.execute(
        text(
            """
            SELECT setval(
                pg_get_serial_sequence(:table_name, :column_name),
                COALESCE((SELECT MAX({column_name}) FROM {table_name}), 1),
                (SELECT MAX({column_name}) FROM {table_name}) IS NOT NULL
            )
            """.format(table_name=table_name, column_name=column_name)
        ),
        {"table_name": table_name, "column_name": column_name},
    )

def decimal_coord(value: float) -> Decimal:
    return Decimal(f"{value:.6f}")

def clear_database(session) -> None:
    logger.info("Clearing existing HP monsoon transaction and lookup data.")
    table_names = ", ".join(f'"{table_name}"' for table_name in TRUNCATE_TABLES)
    session.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE;"))
    session.commit()
    logger.info("Database clear-out phase committed successfully.")

def seed_structural_data(session) -> None:
    logger.info("Seeding Himachal hierarchy and department taxonomies.")
    district_rows = [
        District(id=index + 1, name=district)
        for index, district in enumerate(HIMACHAL_ADMIN_HIERARCHY.keys())
    ]
    add_records(session, district_rows)

    add_records(
        session,
        [
            Department(id=DEPARTMENT_IDS[name], name=name, code=DEPARTMENT_CODES[name])
            for name in DEPARTMENT_IDS
        ],
    )
    add_records(
        session,
        [
            Category(id=1, name="Monsoon Infrastructure"),
            Category(id=2, name="Critical Public Utilities"),
        ],
    )
    session.flush()

    add_records(
        session,
        [
            Subcategory(id=1, category_id=1, department_id=1, name="Bailey Bridge Distress", sla_hours=8, base_priority="critical"),
            Subcategory(id=2, category_id=2, department_id=2, name="Drinking Water Line Washout", sla_hours=24, base_priority="high"),
            Subcategory(id=3, category_id=1, department_id=3, name="Highway Landslide Corridor", sla_hours=24, base_priority="high"),
            Subcategory(id=4, category_id=2, department_id=4, name="Power Grid Access Failure", sla_hours=24, base_priority="high"),
        ],
    )

def seed_simulator_personas(session) -> None:
    logger.info("Seeding HP citizen and field officer personas.")
    secure_hashed_fallback = hash_password("password")
    add_records(
        session,
        [
            Citizen(id=1, name="Rina Thakur", phone="9999999999", otp_hash="demo_hash"),
            Officer(id=1, name="Officer Dev Negi", department_id=1, service_district_id=1, block="Bhuntar", role="Officer", email="dev.negi@hp.gov.example", password_hash=secure_hashed_fallback, is_active=True),
            Officer(id=2, name="Officer Meera Rana", department_id=2, service_district_id=1, block="Anni", role="Officer", email="meera.rana@hp.gov.example", password_hash=secure_hashed_fallback, is_active=True),
            Officer(id=3, name="Officer Arjun Chauhan", department_id=3, service_district_id=2, block="Seraj", role="Officer", email="arjun.chauhan@hp.gov.example", password_hash=secure_hashed_fallback, is_active=True),
            Officer(id=4, name="Officer Tashi Dolma", department_id=4, service_district_id=5, block="Kaza", role="Officer", email="tashi.dolma@hp.gov.example", password_hash=secure_hashed_fallback, is_active=True),
        ],
    )

def build_grievance_rows(now: datetime) -> list[Grievance]:
    rows = []
    payloads = [
        {"id": 1, "ticket_id": "HP-2026-PWD-BAILEY-001", "department_id": 1, "assigned_officer_id": 1, "district_id": 1, "district": "Kullu", "block": "Bhuntar", "panchayat": "Sainj", "terrain_risk": "Flash Flood Khud Proximity", "infrastructure_type": "Connecting Bailey Bridge", "title": "Bailey bridge deck plates buckling near Sainj market", "description": "Community crossing over the khud is vibrating under school bus traffic after overnight rainfall.", "upvotes": 42, "lat": 31.7768, "lon": 77.3442, "hours_ago": 3},
        {"id": 2, "ticket_id": "HP-2026-NHW-LANDSLIDE-002", "department_id": 3, "assigned_officer_id": 3, "district_id": 2, "district": "Mandi", "block": "Seraj", "panchayat": "Thunag", "terrain_risk": "Landslide Vulnerable Link", "infrastructure_type": "NH Highway Link", "title": "Road retaining wall slipping on Seraj orchard link", "description": "The lower shoulder has opened a visible crack and loose stone is falling onto the bus route.", "upvotes": 29, "lat": 31.5534, "lon": 77.1735, "hours_ago": 10},
        {"id": 3, "ticket_id": "HP-2026-JSV-WATER-003", "department_id": 2, "assigned_officer_id": 2, "district_id": 1, "district": "Kullu", "block": "Anni", "panchayat": "Draman", "terrain_risk": "Flash Flood Khud Proximity", "infrastructure_type": "Drinking Water Line", "title": "Gravity water line washed out above Draman", "description": "Two hamlets are reporting no drinking water after the exposed pipe snapped at the nala crossing.", "upvotes": 18, "lat": 31.3976, "lon": 77.3401, "hours_ago": 6},
        {"id": 4, "ticket_id": "HP-2026-HPSEBL-POWER-004", "department_id": 4, "assigned_officer_id": 4, "district_id": 5, "district": "Lahaul & Spiti", "block": "Kaza", "panchayat": "Kibber", "terrain_risk": "High-Alpine Alpine Track", "infrastructure_type": "Power Grid Substation", "title": "Snowmelt erosion along Kibber service track", "description": "High-altitude track shoulders are narrowing and emergency vehicle access is now unreliable.", "upvotes": 12, "lat": 32.3324, "lon": 78.0138, "hours_ago": 20},
    ]
    for p in payloads:
        created_at = now - timedelta(hours=p["hours_ago"])
        priority = evaluate_priority(p["terrain_risk"])
        if p["upvotes"] > 30: priority = "critical"
        rows.append(Grievance(id=p["id"], ticket_id=p["ticket_id"], citizen_id=1, category_id=1, subcategory_id=min(p["id"], 4), department_id=p["department_id"], assigned_officer_id=p["assigned_officer_id"], latitude=decimal_coord(p["lat"]), longitude=decimal_coord(p["lon"]), district_id=p["district_id"], district=p["district"], block=p["block"], panchayat=p["panchayat"], terrain_risk=p["terrain_risk"], infrastructure_type=p["infrastructure_type"], upvotes=p["upvotes"], title=p["title"], description=p["description"], intake_photo_url="https://example.com/hp/monsoon-evidence.jpg", status="Pending", priority=priority, is_flagged_to_cmo=p["upvotes"] > 30, reopened_count=0, sla_due_date=created_at + timedelta(hours=SLA_HOURS_BY_PRIORITY[priority]), created_at=created_at, updated_at=created_at))
    return rows

def seed_anomaly_transactions(session) -> None:
    logger.info("Seeding HP monsoon infrastructure transactions.")
    now = datetime.utcnow().replace(microsecond=0)
    grievance_rows = build_grievance_rows(now)
    add_records(session, grievance_rows)
    logger.info("Staged %s terrain-aware grievances.", len(grievance_rows))

def seed_cultural_assets_complete(session) -> None:
    logger.info("Inserting complete 28-point Master Identity Registry into Postgres.")
    master_registry = [
        {
            "id": "HER-01", "pillar_category": "State Identity", "title": "1. Core State Identity",
            "description": "The foundational framework defining the Western Himalayan territory of Himachal Pradesh.",
            "specification": "Demographics: 90%+ Rural Footprint | Status: Secure & Clean Mountain State", "icon": "🏔️",
            "sub_items": [
                {"name": "Dev Bhoomi (Land of Gods)", "detail": "A sacred mountain territory safeguarding an extensive network of nearly 20,000+ village temples tightly integrated with local community customs.", "spec": "Cultural Anchor: 20K+ Active Shrines", "icon": "🛕", "img": ""},
                {"name": "Socio-Demographic Landscape", "detail": "A unique mountain demographic layout with over 90% of the population living in rural areas, making it one of India's cleanest and safest states.", "spec": "Demographics: 90%+ Rural", "icon": "🛡️", "img": ""},
                {"name": "Industry Capitals", "detail": "Widely recognized and celebrated across major industries as the Apple State of India, the Trout Capital, and the Adventure Capital of North India.", "spec": "Economic Drivers: Apples, Fruits, Coldwater Aquaculture", "icon": "🍎", "img": ""}
            ]
        },
        {
            "id": "HER-02", "pillar_category": "Geography & Terrain", "title": "2. Major Himalayan Ranges",
            "description": "The continuous structural geological layers stacking across the state's vertical topography.",
            "specification": "Orogeny: Foothills to Arid Trans-Himalayan Altitudes", "icon": "⛰️",
            "sub_items": [
                {"name": "Shivalik Hills", "detail": "The outer foothills forming the lowest altitude tier of the state's mountain system.", "spec": "Zone: Outer Himalayas", "icon": "🌱", "img": ""},
                {"name": "Dhauladhar Range", "detail": "The dramatic granite walls rising directly above the Kangra Valley floor.", "spec": "Visual: White Ranges Landscape", "icon": "🏔️", "img": ""},
                {"name": "Pir Panjal Range", "detail": "The middle mountain range cutting across Chamba and Kullu territories.", "spec": "Zone: Inner Himalayan Chain", "icon": "⛰️", "img": ""},
                {"name": "Great Himalayan & Zanskar Ranges", "detail": "Massive high-alpine glacial barriers defining the frontier borders of Lahaul, Spiti, and Kinnaur.", "spec": "Zone: High Altitude Frontier", "icon": "❄️", "img": ""}
            ]
        },
        {
            "id": "HER-03", "pillar_category": "Geography & Terrain", "title": "3. Famous Mountain Peaks",
            "description": "Symmetric high-alpine structural massifs dictating weather patterns and mountaineering exploration routes.",
            "specification": "Peak Profiles: Extreme Technical Glacial Moraines", "icon": "🔺",
            "sub_items": [
                {"name": "Reo Purgyil", "detail": "The undisputed highest peak elevation in Himachal Pradesh, anchoring the Zanskar Range.", "spec": "Elevation: 6,816m | Range: Zanskar", "icon": "🔺", "img": ""},
                {"name": "Shilla & Kinner Kailash", "detail": "Towering high-altitude masses. Kinner Kailash features a massive vertical monolithic rock spire revered by locals.", "spec": "Shilla: 6,132m | Kinner Kailash: 6,050m", "icon": "🔱", "img": ""},
                {"name": "Hanuman Tibba & Deo Tibba", "detail": "Dominant, snow-capped peaks rising directly above the Kullu and Manali basins.", "spec": "Hanuman Tibba: 5,860m | Deo Tibba: 6,001m", "icon": "🏔️", "img": ""},
                {"name": "Friendship Peak & Indrasan", "detail": "Crucial mountaineering massifs anchoring technical routes and glacial crossings.", "spec": "Indrasan: 6,220m | Friendship: 5,289m", "icon": "🧗", "img": ""},
                {"name": "Shrikhand Mahadev & Manimahesh Kailash", "detail": "Sacred high-alpine pilgrimage massifs requiring rigorous high-altitude route navigation.", "spec": "Shrikhand: 5,227m | Manimahesh: 4,080m", "icon": "🙏", "img": ""}
            ]
        },
        {
            "id": "HER-04", "pillar_category": "Rivers & Waterways", "title": "4. Major Himalayan Rivers",
            "description": "The primary hydrological channels carving deep canyons and driving the state's drainage system.",
            "specification": "Hydrology: Glacial Torrent Networks & Hydroelectric Feeds", "icon": "🌊",
            "sub_items": [
                {"name": "Sutlej & Chenab", "detail": "Massive trans-Himalayan currents carrying immense glacial runoff through deep rocky channels.", "spec": "Flow: High Velocity Glacial Melt", "icon": "🌊", "img": ""},
                {"name": "Beas & Ravi", "detail": "The vital central river systems carving out the major agricultural and settlement basins of the state.", "spec": "Basins: Kullu, Kangra, Chamba Valley Lines", "icon": "💧", "img": ""},
                {"name": "Yamuna Boundaries", "detail": "The eastern boundary hydrological systems feeding neighboring fertile plains.", "spec": "Zone: Eastern Drainage Terminus", "icon": "🌊", "img": ""},
                {"name": "Alpine Tributaries", "detail": "Pristine, cold-water streams flowing through eco-sensitive zones: Parvati River, Baspa, Uhl, Tirthan, and Pabbar.", "spec": "Ecology: Designated Coldwater Trout Habitats", "icon": "🐟", "img": ""}
            ]
        },
        {
            "id": "HER-05", "pillar_category": "Valleys & Canyons", "title": "5. Regional Alpine Valleys",
            "description": "Distinct geographic pockets where independent cultural sub-identities and localized dialects evolved over time.",
            "specification": "Topography: Broad Terraced Agriculture to High Cold Canyons", "icon": "⛳",
            "sub_items": [
                {"name": "Kullu & Kangra Valleys", "detail": "Broad, highly fertile cultural basins sheltering extensive populations and sprawling orchards.", "spec": "Profile: Low Hills & Broad Valley Floors", "icon": "⛳", "img": ""},
                {"name": "Parvati & Tirthan Valleys", "detail": "Deep, forested gorges protecting untouched high-alpine ecology and pristine streams.", "spec": "Ecology: Sensitive Eco-Buffer Zones", "icon": "🌲", "img": ""},
                {"name": "Sangla & Chitkul Valleys", "detail": "Breathtakingly beautiful high-altitude valley tracks running parallel to the Tibetan border.", "spec": "Zone: Kinnaur High Alpine", "icon": "🏔️", "img": ""},
                {"name": "Spiti & Pin Desert Valleys", "detail": "Arid, barren trans-Himalayan high canyons defined by intense isolation and ancient Tibetan settings.", "spec": "Climate: High-Altitude Arid Cold Desert", "icon": "❄️", "img": ""},
                {"name": "Pangi, Churah & Bharmour Valleys", "detail": "Rugged, raw frontier canyons isolated by extreme mountain passes.", "spec": "Tribal Belts: Gaddi & Pangwali Cultural Domains", "icon": "🪵", "img": ""},
                {"name": "Barot, Banjar & Uhl Valleys", "detail": "Serene, terraced river valleys anchoring hydro networks and eco-tourism tracks.", "spec": "Networks: Shanan Hydro System & Trout Trails", "icon": "🌱", "img": ""}
            ]
        },
        {
            "id": "HER-06", "pillar_category": "Famous Hill Stations", "title": "6. Famous Hill Stations",
            "description": "Established high-altitude urban hubs blending colonial legacies and major mountain market chains.",
            "specification": "Socio-Economics: Primary Tourism Ingress Nodes", "icon": "🏡",
            "sub_items": [
                {"name": "Shimla & Chail", "detail": "The historic summer capital systems featuring colonial estate layouts and wide mountain ridge pathways.", "spec": "Architecture: Interlocking Brick, Timber & Slate", "icon": "🚂", "img": ""},
                {"name": "Manali & Palampur", "detail": "Manali serves as the valley gateway to high passes, while Palampur is framed by wide terraced tea plantations.", "spec": "Landscapes: Deodar Forests & Tea Gardens", "icon": "🌱", "img": ""},
                {"name": "Dharamshala & McLeod Ganj", "detail": "The vibrant spiritual center hosting the Tibetan diaspora and traditional Himalayan marketplaces.", "spec": "Cultural Hub: Seat of H.H. Dalai Lama", "icon": "☸️", "img": ""},
                {"name": "Dalhousie & Kasauli", "detail": "Quaint, pine-bordered hill stations maintaining serene architectural lines from the colonial era.", "spec": "Flora: Dense Pine & Cedrus Deodara Canopies", "icon": "🌲", "img": ""},
                {"name": "Solan, Narkanda & Kufri", "detail": "Solan drives commercial mushroom cultivation, while Narkanda and Kufri act as winter ski fields.", "spec": "Horticulture: Solan Mushroom & Narkanda Apple Belts", "icon": "🍄", "img": ""}
            ]
        },
        {
            "id": "HER-07", "pillar_category": "Hidden Gems & Passes", "title": "7. Remote Hidden Gems",
            "description": "Pristine, isolated mountain hamlets protecting ancient community codes and traditional ways of living.",
            "specification": "Access: Restricted Alpine Rural Tracks", "icon": "💎",
            "sub_items": [
                {"name": "Seraj Pockets: Jibhi & Shoja", "detail": "Quiet wooden hamlets anchoring dense forests near the Jalori Pass corridor.", "spec": "Zone: Eco-Sensitive Inner Seraj", "icon": "🪵", "img": ""},
                {"name": "Uhl Basin: Barot & Rajgundha", "detail": "Tranquil terraced settlements tracking ancient paths used by migratory shepherds.", "spec": "Trails: Barot to Bir Billing Trek Routes", "icon": "🌱", "img": ""},
                {"name": "Parvati Pockets: Tosh, Grahan & Kalga/Pulga", "detail": "Deep valley timber villages maintaining a slow, traditional mountain rhythm.", "spec": "Terrain: Restricted Vehicle Access Gorges", "icon": "💎", "img": ""},
                {"name": "Malana Autonomous Hamlet", "detail": "An ancient, highly isolated community following one of the oldest independent democratic village legal loops in the world.", "spec": "Governance: Sovereign Devta Kanag Council Laws", "icon": "🪵", "img": ""},
                {"name": "Kinnaur Frontiers: Chitkul, Rakcham & Kalpa", "detail": "Stunning timber-framed frontier outposts facing high granite walls.", "spec": "Chitkul: India's Last Border Village Node", "icon": "👑", "img": ""},
                {"name": "Spiti Frontiers: Kibber, Langza, Hikkim & Komic", "detail": "Extreme altitude mud-and-brick villages guarding marine fossils and high wilderness networks.", "spec": "Hikkim: Highest Global Postal Outpost Node", "icon": "❄️", "img": ""},
                {"name": "Trans-Border Outposts: Gue & Dhankar", "detail": "Gue houses a naturally preserved 500-year-old monk mummy. Dhankar features an ancient fort monastery clinging to fragile mud cliffs.", "spec": "Gue: Monastic Mummy Preservation Cell", "icon": "☸️", "img": ""},
                {"name": "Frontier Gorges: Churah Valley & Pangi Valley", "detail": "Deep, wild canyon settlements cut off by brutal terrains and massive ranges.", "spec": "Status: Most Remotely Situated Tribal Pockets", "icon": "⛓️", "img": ""},
                {"name": "High Retreat Hamlets: Kugti, Thanedar & Dodra-Kwar", "detail": "Dodra-Kwar remains an isolated pocket deep across the Chanshal ridge. Thanedar is the historical birthplace of local apple farming.", "spec": "History: Stokes Apple Revolution (1916)", "icon": "🍎", "img": ""}
            ]
        },
        {
            "id": "HER-08", "pillar_category": "Famous Lakes", "title": "8. Famous Glacial Lakes",
            "description": "High-altitude freshwater lakes resting inside fragile mountain basins, sustained directly by glacier meltwater runoff.",
            "specification": "Basins: High Altitude Moraine Depressions", "icon": "💧",
            "sub_items": [
                {"name": "Chandratal & Suraj Tal", "detail": "Chandratal is a crescent-shaped blue water body in Spiti. Suraj Tal sits right below Baralacha La, feeding the Bhaga River.", "spec": "Suraj Tal Elevation: 4,890m | Chandratal: 4,300m", "icon": "🌙", "img": ""},
                {"name": "Prashar Lake & Rewalsar", "detail": "Prashar Lake features an ancient three-tiered pagoda temple and a mysterious floating island that moves dynamically across the water.", "spec": "Prashar: Floating Grass Mass Tectonic Tracking", "icon": "🛕", "img": ""},
                {"name": "Renuka Lake & Kareri Lake", "detail": "Renuka is the largest natural lake in the state, shaped like a sleeping goddess. Kareri is a shallow, fresh alpine water body in the Dhauladhars.", "spec": "Renuka: Low Foothill Wetland Ecosystem", "icon": "💧", "img": ""},
                {"name": "High Sacred Pools: Manimahesh & Lama Dal", "detail": "Manimahesh rests at the base of the sacred Kailash peak. Lama Dal is a massive, deep high-altitude lake in Chamba.", "spec": "Lama Dal: Group of 7 Interconnected Alpine Lakes", "icon": "🙏", "img": ""},
                {"name": "Dashir & Nako Lakes", "detail": "Dashir sits near Rohtang Pass, holding crystal clear water. Nako mirrors a high-altitude border village and old willow trees.", "spec": "Nako Lake: Kinnaur-Spiti Border Transitional Ecosystem", "icon": "🌲", "img": ""}
            ]
        },
        {
            "id": "HER-09", "pillar_category": "Hidden Gems & Passes", "title": "9. Strategic Mountain Passes",
            "description": "High altitude navigation gateways crossing distinct mountain ranges to connect isolated valleys.",
            "specification": "Pass Engineering: Extreme Weather Seasonal Closures", "icon": "🔀",
            "sub_items": [
                {"name": "Rohtang Pass & Kunzum La", "detail": "Rohtang links Kullu to Lahaul. Kunzum La serves as the massive high-altitude pass gateway directly into Spiti Valley.", "spec": "Rohtang: 3,978m | Kunzum Pass: 4,551m", "icon": "🔀", "img": ""},
                {"name": "Baralacha La & Shipki La", "detail": "Baralacha La connects Lahaul to Ladakh, joining three mountain ranges. Shipki La is a historic border pass running along the Sutlej River.", "spec": "Baralacha La: 4,890m | Shipki La: Indo-Tibet Border Line", "icon": "🏔️", "img": ""},
                {"name": "Sach Pass", "detail": "A brutal, high-hazard mountain pass cut out of solid rock walls, serving as the only vehicle link to Pangi Valley.", "spec": "Sach Pass Elevation: 4,420m | Hazard Level: Extreme", "icon": "⛓️", "img": ""},
                {"name": "Jalori Pass & Chanshal Pass", "detail": "Jalori connects inner and outer Seraj regions. Chanshal links the town of Rohru to the isolated pocket of Dodra-Kwar.", "spec": "Chanshal Ridge: 3,750m | Jalori Pass: 3,120m", "icon": "🪵", "img": ""}
            ]
        },
        {
            "id": "HER-10", "pillar_category": "Temples & Monasteries", "title": "10. Famous Expedition Treks",
            "description": "The historical trails tracing ridge-lines and high passes used by semi-nomadic Gaddi shepherds and exploratory groups.",
            "specification": "Trails: Trans-Himalayan Alpine Routes", "icon": "🥾",
            "sub_items": [
                {"name": "Dhauladhar Trails: Triund & Kareri Lake", "detail": "Popular ridge trails rising directly from the Kangra plains up to rocky camps below the pass lines.", "spec": "Triund: Basic Ridge Walk | Kareri Lake: Glacial Stream Trail", "icon": "🥾", "img": ""},
                {"name": "Pass Crossings: Hampta, Indrahar & Chandrakhani", "detail": "Challenging pass crossings that take travelers from lush green valleys into stark, rocky landscapes.", "spec": "Indrahar Pass: 4,342m Crossing Over Dhauladhars", "icon": "🔀", "img": ""},
                {"name": "Extreme Trans Passes: Pin Parvati & Sar Pass", "detail": "Demanding multi-day trails crossing over frozen ice fields and vast crevasse zones.", "spec": "Pin Parvati: Connects Green Kullu to Cold Desert Spiti", "icon": "❄️", "img": ""},
                {"name": "Sacred Glacial Trails: Beas Kund & Kheerganga", "detail": "Historic high trails leading up to glacier origins and geothermal sulphur springs deep in the woods.", "spec": "Beas Kund: Birth Origin Point of the Beas River", "icon": "💧", "img": ""},
                {"name": "High Pass Challenges: Bhrigu Lake, Kugti & Manimahesh", "detail": "High-altitude trails crossing steep rocky slopes, heavily used by semi-nomadic Gaddi shepherds.", "spec": "Kugti Pass: 5,050m High Altitude Shepherds Route", "icon": "🐑", "img": ""}
            ]
        },
        {
            "id": "HER-11", "pillar_category": "Temples & Monasteries", "title": "11. Sacred Temples & Shakti Peeths",
            "description": "Ancient stone and wood structures operating as the socio-cultural hubs for regional devta governance.",
            "specification": "Shrines: Traditional North Indian Shikhara & Local Wooden Designs", "icon": "🛕",
            "sub_items": [
                {"name": "Kangra Shakti Peeths", "detail": "Deeply revered historic stone temples drawing millions of pilgrims: Jwala Ji (eternal flame), Chintpurni, Naina Devi, Chamunda Devi, and Brajeshwari Devi.", "spec": "Jwala Ji: Natural Methane Gas Eternal Flame System", "icon": "🔥", "img": ""},
                {"name": "Baijnath Temple", "detail": "A classic 13th-century stone temple showcasing early North Indian architectural lines.", "spec": "Architecture: Historic Nagara Shikhara Design", "icon": "🛕", "img": ""},
                {"name": "Timber Pagodas: Hidimba & Bhimakali Shrines", "detail": "Exquisite multi-tiered wooden shrines built from heavy timber beams: Hidimba Temple in Manali and the complex Bhimakali Temple in Sarahan.", "spec": "Styles: Multi-Tiered Pagoda Roof Layouts", "icon": "🪵", "img": ""},
                {"name": "High Power Shrines: Bijli Mahadev & Hatu Temples", "detail": "Bijli Mahadev features a 60-foot lightning staff. Hatu Temple stands on a high mountain ridge.", "spec": "Bijli Mahadev: Attracts Atmospheric Lightning Discharges", "icon": "⚡", "img": ""},
                {"name": "Remote Retreats: Baba Balak Nath & Local Shrines", "detail": "Natural cave and ridge sanctuaries blending traditions with mountain beliefs smoothly.", "spec": "Baba Balak Nath: Sacred Natural Cave Shrine", "icon": "🙏", "img": ""}
            ]
        },
        {
            "id": "HER-12", "pillar_category": "Temples & Monasteries", "title": "12. Buddhist Heritage Monasteries",
            "description": "Centuries-old mud-brick and timber fortresses guarding priceless scripts across cold desert networks.",
            "specification": "Lineage: Indo-Tibetan Buddhist Monastic Translation Centers", "icon": "☸️",
            "sub_items": [
                {"name": "Tabo Monastery", "detail": "An ancient mud-brick monastic enclave holding priceless clay statues and beautiful wall fresco paintings.", "spec": "Status: Ajanta of the Himalayas (Founded 996 AD)", "icon": "☸️", "img": ""},
                {"name": "Key & Dhankar Monasteries", "detail": "Key is an iconic fortress monastery built on a conical hill. Dhankar clings tightly to crumbling mud cliffs.", "spec": "Key Monastery: Structural Conical Hill Layering", "icon": "🕌", "img": ""},
                {"name": "Kaza & Lahaul Monasteries", "detail": "Active translation centers keeping ancient scripts secure: Kaza, Kardang, and Shashur Monasteries.", "spec": "Kardang: Ancient Capital Matrix of Lahaul Monasteries", "icon": "📿", "img": ""},
                {"name": "Dharamshala Enclaves: Namgyal & Gyuto", "detail": "The modern centers for preserving Tibetan arts: Namgyal Monastery, Gyuto, and the Norbulingka Institute.", "spec": "Norbulingka: Intricate Thangka Painting & Metal Work Cells", "icon": "🏮", "img": ""}
            ]
        },
        {
            "id": "HER-13", "pillar_category": "Eco Systems & Wildlife", "title": "13. National Parks Sanctuaries",
            "description": "Protected reserve zones safeguarding endangered Himalayan species and continuous eco-networks.",
            "specification": "Ecology: High Altitude Nature Conservation Zones", "icon": "🏞️",
            "sub_items": [
                {"name": "Great Himalayan National Park", "detail": "A massive, pristine sanctuary map protecting biological diversity. Recognized globally.", "spec": "Status: UNESCO World Heritage Site", "icon": "🏞️", "img": ""},
                {"name": "Pin Valley National Park", "detail": "A cold desert sanctuary protecting unique species like the snow leopard and Siberian ibex.", "spec": "Fauna: Cold Desert Apex Predators Protection", "icon": "❄️", "img": ""},
                {"name": "Khirganga & Inderkilla National Parks", "detail": "Khirganga guards high altitude thermal springs, while Inderkilla shields steep vertical rock faces.", "spec": "Basins: Critical Beas River Catchment Areas", "icon": "🌲", "img": ""},
                {"name": "Simbalbara National Park", "detail": "Protects lower foothill Sal woods and wildlife corridors along the plains border.", "spec": "Zone: Shivalik Foothill Bio-Corridors", "icon": "🌳", "img": ""}
            ]
        },
        {
            "id": "HER-14", "pillar_category": "Eco Systems & Wildlife", "title": "14. Alpine Wildlife Vectors",
            "description": "Rare and protected fauna indicators signaling the health of sensitive high-altitude ecosystems.",
            "specification": "Fauna: Protected Threatened Himalayan Species", "icon": "🦅",
            "sub_items": [
                {"name": "Snow Leopard & Himalayan Ibex", "detail": "The apex and indicator wildlife vectors tracking the crags of Lahaul, Spiti, and Kinnaur.", "spec": "Habitat: High Alpine Cliff Lines", "icon": "🐆", "img": ""},
                {"name": "Himalayan Tahr & Musk Deer", "detail": "Rare ungulates moving through steep crags and dense birch woods.", "spec": "Conservation: Endangered Wild Vectors Tracker", "icon": "🦌", "img": ""},
                {"name": "Himalayan Black & Brown Bears", "detail": "Large mountain omnivores balancing the ecology of upper forest belts.", "spec": "Fauna: Sub-Alpine Forest Omnivores", "icon": "🐻", "img": ""},
                {"name": "Monal & Western Tragopan", "detail": "Beautiful mountain pheasants serving as key indicators for old-growth oak and fir forests.", "spec": "Monal: State Bird | Tragopan: Highly Endangered", "icon": "🦅", "img": ""},
                {"name": "Himalayan Griffon, Red Fox & Blue Sheep", "detail": "Important scavengers and prey species that help maintain the balance of alpine grasslands.", "spec": "Griffon: High Wingspan Alpine Scavenger Cell", "icon": "🦅", "img": ""}
            ]
        },
        {
            "id": "HER-15", "pillar_category": "Cuisine & Dham", "title": "15. Famous Daily Pahari Foods",
            "description": "Nutritious local daily foods developed to combat low mountain pressures and severe cold patterns.",
            "specification": "Diet: Calorie-Dense Mountain Energy Nutrition", "icon": "🍲",
            "sub_items": [
                {"name": "Siddu", "detail": "Steamed yeast sourdough bread filled with ground opium poppy seeds, walnuts, and spices, served hot with liquid ghee.", "spec": "Staple: Sourdough Fermentation Tech", "icon": "🥟", "img": ""},
                {"name": "Babru & Patande", "detail": "Babru is a stuffed fried whole-wheat flatbread. Patande represents delicate thin rice crepes from Sirmour.", "spec": "Menu: Local Grain Flatbreads & Crepes", "icon": "🥞", "img": ""},
                {"name": "Aktori & Patrode", "detail": "Aktori is a buckwheat cake from Lahaul. Patrode features seasoned colocasia leaves rolled in gram flour.", "spec": "Ingredients: Wild Foraged Buckwheat & Greens", "icon": "🌱", "img": ""},
                {"name": "Tudkiya Bhath & Chha Gosht", "detail": "Tudkiya Bhath is a rich spicy pilaf. Chha Gosht is a slow-cooked lamb dish simmered in buttermilk gravy.", "spec": "Menu: Curd-Based Meat & Rice Grains", "icon": "🍗", "img": ""},
                {"name": "Kullu Trout, Madra & Khatta", "detail": "Wood-grilled freshwater trout paired with rich yogurt-based madras and tangy, sour local masalas.", "spec": "Trout: Sourced from Cold Glacial Streams", "icon": "🐟", "img": ""},
                {"name": "Mah ki Dal, Bhey & Chukh", "detail": "Slow-cooked split black gram paired with spicy lotus stems (Bhey) and tangy red chili pastes (Chukh).", "spec": "Chukh: Chamba Chili Paste with Citrus Extracts", "icon": "🌶️", "img": ""},
                {"name": "Mittha, Kale Chane & Auriya Kaddu", "detail": "Traditional dishes balancing sweet rice treats, savory black chickpeas, and mustard-flavored pumpkin mash.", "spec": "Auriya Kaddu: Fermented Mustard Seed Seasoning", "icon": "🍲", "img": ""},
                {"name": "Makki ki Roti, Sarson ka Saag & Bhagjery", "detail": "Winter staples combining corn flatbreads, greens, and roasted wild hemp seed mixes.", "spec": "Bhagjery: Local Roasted Wild Hemp Seed Seasoning", "icon": "🌾", "img": ""}
            ]
        },
        {
            "id": "HER-16", "pillar_category": "Cuisine & Dham", "title": "16. The Traditional Dham Feast",
            "description": "A highly structured, ritual community banquet cooked and served following ancient local customs.",
            "specification": "Sovereignty: Wood-Fired Copper Charoti Cookware", "icon": "🍱",
            "sub_items": [
                {"name": "Hereditary Botis", "detail": "The feast is prepared exclusively by a professional clan of Brahmin cooks using secret family spice recipes.", "spec": "Cooks: Specialized Clan Lineage", "icon": "🧑‍🍳", "img": ""},
                {"name": "Leaf Plate Service", "detail": "Food is served sequentially on dried leaf plates called Pattals, woven from local broad-leaved trees.", "spec": "Eco Impact: Biodurable Foraged Plates", "icon": "🍃", "img": ""},
                {"name": "Floor Alignment Sitting", "detail": "Diners sit in long straight lines directly on the floor, reinforcing community equality.", "spec": "Layout: Pangat Line Sitting Geometry", "icon": "🧎", "img": ""},
                {"name": "Fixed Structural Order", "detail": "Dishes are served in a strict, unchangeable sequence designed to aid digestion over multiple courses.", "spec": "Flow: Curd Madra to Sour Khatta to Sweet Rice", "icon": "⏱️", "img": ""}
            ]
        },
        {
            "id": "HER-17", "pillar_category": "Cuisine & Dham", "title": "17. Regional Dham Variations",
            "description": "How the traditional feast changes its spice layouts and menus across different mountain valleys.",
            "specification": "Profiles: Valley-Specific Menu Customizations", "icon": "🍛",
            "sub_items": [
                {"name": "Kangri Dham", "detail": "Centers around premium long-grain rice, rich Rajma Madra (cooked in curd and ghee), Chana Madra, dark Mah Dal, and tangy amla Khatta.", "spec": "Key Dish: Curd-Infused Rajma Madra", "icon": "🍛", "img": ""},
                {"name": "Mandeali Dham", "detail": "Centers on Sepu Badi (steamed black gram cakes cooked in a spinach-curd gravy), alongside sweet pumpkin mash and kaddus.", "spec": "Key Dish: Spinach-Curd Sepu Badi", "icon": "🍲", "img": ""},
                {"name": "Kullu & Chamba Dham", "detail": "Kullu styles feature spicy local pulses, while Chamba dham uses unique dried fruit combinations in sweet and sour gravies.", "spec": "Profiles: Raisins and Dates Gravy Mixes", "icon": "🍱", "img": ""},
                {"name": "Sirmauri & Kinnauri Styles", "detail": "Kinnauri variations use local buckwheat alcohol or specific native herbs, altering the sequence.", "spec": "Spices: Foraged High-Alpine Wild Caraway & Allium", "icon": "🌾", "img": ""}
            ]
        },
        {
            "id": "HER-18", "pillar_category": "Agriculture & Crops", "title": "18. Orchard Fruits Registry",
            "description": "The primary engine of agricultural export tracking across the lower Shivalik and middle range shelves.",
            "specification": "Produce: Cool Temperate Deciduous Fruit Farming", "icon": "🍒",
            "sub_items": [
                {"name": "Apple Orchards", "detail": "The leading cash fruit crop driving the rural economy, managing extensive terraced valley systems across Shimla and Kullu.", "spec": "Sovereignty: High Density Royal Delicious Varieties", "icon": "🍎", "img": ""},
                {"name": "Stone Fruits: Cherry, Plum & Apricot", "detail": "High-value seasonal fruits harvested during early summer from temperate hill slopes.", "spec": "Harvest: Early Summer Flash Crop Lines", "icon": "🍒", "img": ""},
                {"name": "Peach, Pear & Kiwi", "detail": "Mid-altitude orchards capitalizing on moist hill parameters and valley floor shelter networks.", "spec": "Zones: Rajgarh Valley (Peach Bowl of Asia)", "icon": "🥝", "img": ""},
                {"name": "Nut Crops: Walnut & Almond", "detail": "Hard-shelled nut crops harvested from drier high-altitude zones like Kinnaur.", "spec": "Shelves: Arid Slopes Wild Nut Harvesting", "icon": "🥥", "img": ""},
                {"name": "Pomegranate", "detail": "Cultivation of wild and hybrid pomegranate varieties across lower, warmer river valleys.", "spec": "Produce: Chamba & Kullu Anardana Seeds", "icon": "🎈", "img": ""}
            ]
        },
        {
            "id": "HER-19", "pillar_category": "Agriculture & Crops", "title": "19. Famous Cash Crops",
            "description": "High-value localized agriculture capitalizing on organic inputs and specific valley climates.",
            "specification": "Crops: GI-Protected Teas & Extreme Altitude Grains", "icon": "🌾",
            "sub_items": [
                {"name": "Kangra Tea", "detail": "Globally renowned black and green teas grown in the foothills of the Dhauladhars since 1849.", "spec": "Status: GI Tag Protected Crop System", "icon": "🌱", "img": ""},
                {"name": "Mountain Pulses: Rajma & Peas", "detail": "Highly sought-after, nutrient-rich local pulses grown in pristine conditions across Mashobra and Chamba.", "spec": "Produce: Local Organic Grade Legumes", "icon": "🌾", "img": ""},
                {"name": "Frontier Grains: Barley & Buckwheat", "detail": "Durable, resistant crops essential for survival in the cold desert regions of Lahaul and Spiti.", "spec": "Staples: Ogla & Phafra Buckwheat Flours", "icon": "🌾", "img": ""},
                {"name": "Red Rice & Alpine Herbs", "detail": "Rare long-grain red rice grown in the fields of the Chhohara valley, alongside foraged medicinal roots.", "spec": "Red Rice: High-Value Chhohara Valley Matali Strain", "icon": "🌾", "img": ""}
            ]
        },
        {
            "id": "HER-20", "pillar_category": "Languages & Attire", "title": "20. Linguistic Dialects Spectrum",
            "description": "A highly complex mix of Indo-Aryan and Tibetic language groups tracking across steep range dividers.",
            "specification": "Languages: Western Pahari & Tibeto-Burman Sub-Families", "icon": "🗣️",
            "sub_items": [
                {"name": "Central Dialects: Mandeali & Kullui", "detail": "Rich regional dialects spoken across the mid-valley regions, featuring distinct tonal systems.", "spec": "Sub-Family: Tonal Western Pahari Roots", "icon": "🗣️", "img": ""},
                {"name": "Foot-Hill Dialects: Kangri & Bilaspuri", "detail": "Broad dialects spoken across the lower foothills, closely related to Punjabi variations.", "spec": "Speakers: Largest Lower Valley Linguistic Block", "icon": "🗣️", "img": ""},
                {"name": "Frontier Dialects: Kinnauri & Lahauli", "detail": "Linguistic systems combining old sanskrit words with complex Tibeto-Burman grammar structures.", "spec": "Roots: Shared Himalayan Border Language Models", "icon": "🗣️", "img": ""},
                {"name": "Isolated Dialects: Bharmouri, Pangwali & Spitian", "detail": "Localized languages kept safe from change by uncrossable pass barriers: Gaddi, Pangwali, and Spitian Bhoti.", "spec": "Bhoti: Pure Tibetic Script and Voice Varieties", "icon": "🗣️", "img": ""},
                {"name": "Mahasu Pahari", "detail": "The collective group of traditional dialects spoken across the old upper Shimla hill tracts.", "spec": "Zone: Upper Shimla Ridge Linguistic Cluster", "icon": "🗣️", "img": ""}
            ]
        },
        {
            "id": "HER-21", "pillar_category": "Languages & Attire", "title": "21. Traditional Dress Systems",
            "description": "Functional protective woolens layered with intricate geometric embroidery representing regional identity marks.",
            "specification": "Attire: Gaddi Wool Cholas & Kinnauri Dohru Layouts", "icon": "🧥",
            "sub_items": [
                {"name": "The Himachali Cap", "detail": "The iconic embroidered woolen cap worn proudly as a symbol of regional respect across the state.", "spec": "Cap Tones: Bushahari Green vs. Kullu Crimson Bands", "icon": "👑", "img": ""},
                {"name": "Men's Attire: Chola & Suthan", "detail": "A heavy, hand-spun white woolen coat tied at the waist with a thick rope (Dora), paired with tight trousers.", "spec": "Chola: Made from Coarse Gaddi Sheep Wool", "icon": "🧥", "img": ""},
                {"name": "Women's Attire: Pattu & Ghaghra", "detail": "A heavy woolen sheet pinned around the shoulders with silver pins (Boomani), worn over gathered skirts.", "spec": "Pattu: Hand-Loomed Wrap Sheet", "icon": "👗", "img": ""},
                {"name": "Kinnauri Dohru & Dhatu", "detail": "Dohru is a wrapped woolen dress with beautiful woven borders. Dhatu is the traditional headscarf worn by women.", "spec": "Dhatu: Simple Square Cotton Head-Wrap", "icon": "🧣", "img": ""},
                {"name": "Traditional Silver Jewellery", "detail": "Ornate silver jewelry including wide collars (Chandrahaar) and nose rings (Nath), worn during ceremonies.", "spec": "Jewellery: Heavy Solid Silver Filigree Works", "icon": "💍", "img": ""}
            ]
        },
        {
            "id": "HER-22", "pillar_category": "Handicrafts & Art", "title": "22. Famous Handicrafts Heritage",
            "description": "Master level artisan creations utilizing native cedar wood, local sheep wool, and organic mineral paint dyes.",
            "specification": "Artistry: GI-Protected Handloom Weaves & Double-Sided Silk Stitches", "icon": "🎨",
            "sub_items": [
                {"name": "Kullu & Kinnauri Shawls", "detail": "Famous hand-woven woolen shawls featuring sharp geometric borders that depict local peaks.", "spec": "Status: GI Tag Protected Geometric Handloom Patterns", "icon": "🧵", "img": ""},
                {"name": "Chamba Rumal", "detail": "A fine silk embroidery art on handspun cotton looking identical on both sides.", "spec": "Embroidery: Dorukha (Double-Sided Reversible Stitch Tech", "icon": "🎨", "img": ""},
                {"name": "Kangra Miniature Paintings", "detail": "A refined art style from the 18th century using fine squirrel-hair brushes and natural colors.", "spec": "Medium: Natural Pigments on Handmade Sialkoti Paper", "icon": "🎨", "img": ""},
                {"name": "Wood Carving & Metal Craft", "detail": "Intricate cedar wood panels used in homes, alongside detailed brass temple masks cast by local artisans.", "spec": "Masks: Mohras (Sacred Cast Bronze Deity Faces)", "icon": "🛕", "img": ""},
                {"name": "Wool Carpets, Pashmina & Bamboo Crafts", "detail": "Fine woolen products crafted by nomad communities, alongside durable split-bamboo baskets.", "spec": "Carpets: Spiti Thobi Goat Hair Floor Mats", "icon": "🌾", "img": ""},
                {"name": "Pullan Footwear", "detail": "Traditional slippers crafted from dried wild hemp fibers, decorated with bright geometric woolen embroidery.", "spec": "Pullan: Biodegradable Foraged Hemp Slippers", "icon": "👞", "img": ""}
            ]
        },
        {
            "id": "HER-23", "pillar_category": "Performing Arts & Fairs", "title": "23. Traditional Dance Forms",
            "description": "Synchronized group dances performed in concentric rings or lines to celebrate seasonal harvesting.",
            "specification": "Dances: Concentric Ring Sync & Monastic Mask Rituals", "icon": "💃",
            "sub_items": [
                {"name": "The Nati", "detail": "A beautiful group dance performed in slow, graceful waves that can last for hours at festivals.", "spec": "Status: UNESCO Intangible Cultural Heritage Recognition", "icon": "💃", "img": ""},
                {"name": "Kinnaur Kayang", "detail": "A traditional group dance where dancers hold hands in a criss-cross pattern, moving in a massive circle.", "spec": "Layout: Symmetric Interlocked Chain Formations", "icon": "⭕", "img": ""},
                {"name": "The Chham Mask Dance", "detail": "A sacred, dramatic dance performed by Buddhist lamas wearing heavy painted wooden masks.", "spec": "Performers: Monastic Lama Ritual Dancers", "icon": "🎭", "img": ""},
                {"name": "Losar & Rakshasa Dances", "detail": "Seasonal dances depicting the victory of good forces over mountain demons during the new year.", "spec": "Themes: Pre-Buddhist Shamanistic Himalayan Legends", "icon": "👹", "img": ""},
                {"name": "Banthra, Dangi & Ghurehi", "detail": "Lively folk dances and short comic skits performed during harvest fairs in Mandi and Chamba.", "spec": "Banthra: Musical Satire Folk Theater Form", "icon": "🎭", "img": ""}
            ]
        },
        {
            "id": "HER-24", "pillar_category": "Performing Arts & Fairs", "title": "24. Pahari Instrumentation Folk Music",
            "description": "Resonant brass, woodwinds, and thunderous structural percussion keeping rhythm across valley assemblies.",
            "specification": "Music: Acoustic Sheet-Brass Horns & Core Percussion Triggers", "icon": "📯",
            "sub_items": [
                {"name": "Ranasingha & Karnal", "detail": "Huge sheet-brass wind instruments. The Ranasingha is S-curved, producing a piercing call.", "spec": "Ranasingha: Piercing Curved Brass Horn Staff", "icon": "🎺", "img": ""},
                {"name": "Nagara, Dhol & Damau", "detail": "The core percussion trio providing heavy rhythms that guide the stepping patterns of ring dancers.", "spec": "Percussion: Copper Kettle Drums & Wood Frame Dols", "icon": "🥁", "img": ""},
                {"name": "Shehnai & Flute", "detail": "Traditional woodwinds that carry the main melodies of folk songs and temple music.", "spec": "Melody: Double-Reed Mountain Oboe Variations", "icon": "🎵", "img": ""},
                {"name": "Folk Songs & Dev Bhajans", "detail": "Historic ballads that pass down tales of local kings and village deity miracles through generations.", "spec": "Oral History: Jhoori & Laman Mountain Song Styles", "icon": "🗣️", "img": ""}
            ]
        },
        {
            "id": "HER-25", "pillar_category": "Performing Arts & Fairs", "title": "25. Major Fairs & Festivals",
            "description": "Massive seasonal events gathering international trade networks, artisan exchanges, and central deity systems.",
            "specification": "Fairs: Multi-Valley Deity Assemblies & Trade Markets", "icon": "✨",
            "sub_items": [
                {"name": "Kullu Dussehra", "detail": "A world-famous festival where over 200+ village gods descend from deep valleys to camp together.", "spec": "Assembly: Week-Long International Devta Pageant", "icon": "✨", "img": ""},
                {"name": "Mandi Shivratri", "detail": "A historic gathering where village gods carried on wooden palanquins arrive to pay respect.", "spec": "Gathering: Mandi Town Ingress of 80+ Local Deities", "icon": "🛕", "img": ""},
                {"name": "Minjar Fair", "detail": "A major festival in Chamba celebrating the silk corn-tassel crop, ending with immersions in the Ravi River.", "spec": "Ritual: Silk tassel thread binding crop celebrations", "icon": "🌾", "img": ""},
                {"name": "Rampur Lavi Fair", "detail": "A major trade market operating since the 17th century, where wool and chamurthi horses are exchanged.", "spec": "Trade: Oldest Himalayan International Trade Fair Hub", "icon": "🐴", "img": ""},
                {"name": "Halda, Losar & Phagli", "detail": "Winter and spring festivals celebrated with bonfires and masks across cold desert valleys.", "spec": "Halda: Cedar Wood Torch Lighting New Year Ritual", "icon": "🔥", "img": ""},
                {"name": "Fulaich & Sazo", "detail": "Unique festivals in Kinnaur focused on gathering wild mountain flowers and preparing shrines for winter.", "spec": "Fulaich: Festival of Foraged High Altitude Wild Flowers", "icon": "🌸", "img": ""},
                {"name": "Nalwari Fair, Maghi & Baisakhi", "detail": "Lower hill spring festivals featuring cattle trading matches and local wrestling competitions.", "spec": "Nalwari: Bilaspur Oxen Trade & Wrestling Arena", "icon": "🐂", "img": ""}
            ]
        },
        {
            "id": "HER-26", "pillar_category": "Architecture & Heritage", "title": "26. Traditional Mountain Architecture",
            "description": "Seismically flexible structural layout built using alternating stone courses and deodar logs without cement mortars.",
            "specification": "Seismic Design: Mortarless Timber Interlocking Layering Tech", "icon": "🏛️",
            "sub_items": [
                {"name": "Kath-Kuni Framework", "detail": "A brilliant building style where layers of cedar logs and dry stones are stacked alternately without using cement.", "spec": "Engineering: Flexible Friction Shock-Absorbing Walls", "icon": "🪵", "img": ""},
                {"name": "Pagoda Slate Roofs", "detail": "Multi-tiered wooden temples topped with thick layers of overlapping stone slates, angled to easily shed heavy snow.", "spec": "Roofing: Local Split-Slate Heavy Stone Tiles", "icon": "🛕", "img": ""},
                {"name": "Fortified Architecture", "detail": "Tall, multi-storied tower houses built using the Kath-Kuni style, serving as village forts and granaries.", "spec": "Structures: Kamru Fort & Chainni Kothi Tower Shrines", "icon": "🏛️", "img": ""},
                {"name": "Monastic Tibetan Shrines", "detail": "Thick, white-washed rammed-earth wall structures built to withstand the freezing winds of the high valleys.", "spec": "Rammed-Earth: High Thermal Mass Clay Insulation Blocks", "icon": "🧱", "img": ""}
            ]
        },
        {
            "id": "HER-27", "pillar_category": "Architecture & Heritage", "title": "27. Protected Heritage Sites",
            "description": "UNESCO listed assets and protected structures mapping the engineering milestones of the state.",
            "specification": "Registry: Global Historic Infrastructure Assets", "icon": "⛩️",
            "sub_items": [
                {"name": "Kalka–Shimla Railway", "detail": "A world-famous narrow-gauge mountain railway built in 1903, featuring over 800 historic multi-arched viaduct bridges.", "spec": "Status: UNESCO World Heritage Narrow-Gauge Line", "icon": "🚂", "img": ""},
                {"name": "Kangra Fort", "detail": "A massive, ancient stone fort built on a high cliff ridge at the confluence of two rivers.", "spec": "Fort: Largest and Oldest Fortified Bastion in the Himalayas", "icon": "🏛️", "img": ""},
                {"name": "Masroor Rock Cut Temples", "detail": "A unique group of 15 monumental temples carved directly out of a single monolithic sandstone rock face.", "spec": "Masroor: Ellora of the North Indian Sandstone Ranges", "icon": "🛕", "img": ""},
                {"name": "Museums & Institutes", "detail": "Important cultural centers like the historic Bhuri Singh Museum in Chamba and the Norbulingka Institute.", "spec": "Bhuri Singh: Holds 18th-Century Pahari Miniatures", "icon": "🖼️", "img": ""}
            ]
        },
        {
            "id": "HER-28", "pillar_category": "Architecture & Heritage", "title": "28. Regional Identities Mosaic",
            "description": "A complete region-by-region breakdown demonstrating how Himachal functions as a complex mosaic of distinct cultural identities.",
            "specification": "Matrix: 11 Distinct Regional Cultural Sub-Systems", "icon": "🗺️",
            "sub_items": [
                {"name": "Kangra & Mandi", "detail": "Kangra brings tea gardens, miniature paintings, and Gaddi culture. Mandi stands as the 'City of Temples,' famous for its Shivratri.", "spec": "Kangra: Gaddi Weaves | Mandi: 81+ Stone Shrines", "icon": "🛕", "img": ""},
                {"name": "Kullu & Kinnaur", "detail": "Kullu is defined by geometric shawls and Nati dances. Kinnaur showcases green caps, orchards, and shared wooden temples.", "spec": "Kullu: River Trout | Kinnaur: Ornate Dohru Woolens", "icon": "👑", "img": ""},
                {"name": "Lahaul & Spiti + Chamba", "detail": "Lahaul & Spiti is a cold desert terrain hosting historic monasteries. Chamba preserves Chamba Rumal crafts and ancient temples.", "spec": "Lahaul/Spiti: Cold Desert Peak Rows | Chamba: Ravi River Basins", "icon": "🎨", "img": ""},
                {"name": "Shimla, Sirmaur & Solan", "detail": "Shimla preserves colonial architecture and the railway. Sirmaur cradles Renuka Lake. Solan operates as the mushroom capital.", "spec": "Solan: Mushroom Cultivation Hub | Shimla: Ridge Tracks", "icon": "🚂", "img": ""},
                {"name": "Bilaspur, Una & Hamirpur", "detail": "Bilaspur monitors the wide Gobind Sagar Lake. Una and Hamirpur represent the lower foothills defined by famous pilgrimage shrines.", "spec": "Bilaspur: Gobind Sagar Reservoir | Hamirpur: Hill Forts", "icon": "⛵", "img": ""}
            ]
        }
    ]

    for item in master_registry:
        session.add(
            CulturalAsset(
                id=item["id"],
                district_id=None,
                pillar_category=item["pillar_category"],
                title=item["title"],
                description=item["description"],
                specification=item["specification"],
                icon=item["icon"],
                image_url=None,
                sub_items=item["sub_items"]
            )
        )
    logger.info("Complete 28 Master Cards safely staged.")

def seed_realtime_telemetry_nodes(session) -> None:
    logger.info("Injecting full comprehensive operational weather cluster and HRTC Trans-Himalayan ledger arrays.")
    stations = [
        WeatherStation(station_name="Shimla Doppler Node", district="Shimla", elevation_m=2205, terrain_type="Mid Himalayan", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("12.40"), temperature_c=Decimal("16.2"), river_stage_m=Decimal("0.10")),
        WeatherStation(station_name="Kufri sub-alpine Node", district="Shimla", elevation_m=2510, terrain_type="Sub-alpine", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("45.20"), temperature_c=Decimal("12.4"), river_stage_m=Decimal("0.00")),
        WeatherStation(station_name="Narkanda High Ridge", district="Shimla", elevation_m=2708, terrain_type="Sub-alpine", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("85.40"), temperature_c=Decimal("11.5"), river_stage_m=Decimal("0.00"), landslide_sensor_triggered=True),
        WeatherStation(station_name="Sarahan High Mountain", district="Shimla", elevation_m=2313, terrain_type="High mountain", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("58.00"), temperature_c=Decimal("14.0"), river_stage_m=Decimal("0.50")),
        WeatherStation(station_name="Rampur River Valley", district="Shimla", elevation_m=1005, terrain_type="River valley", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("94.20"), temperature_c=Decimal("24.5"), river_stage_m=Decimal("2.60"), debris_flow_detected=True),
        WeatherStation(station_name="Kalpa High Station", district="Kinnaur", elevation_m=2960, terrain_type="Sub-alpine", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("102.50"), temperature_c=Decimal("10.2"), river_stage_m=Decimal("1.80"), landslide_sensor_triggered=True),
        WeatherStation(station_name="Reckong Peo Center", district="Kinnaur", elevation_m=2290, terrain_type="Mountain valley", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("26.40"), temperature_c=Decimal("15.1"), river_stage_m=Decimal("0.80")),
        WeatherStation(station_name="Keylong Cold Desert", district="Lahaul", elevation_m=3080, terrain_type="Cold desert", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("4.50"), temperature_c=Decimal("8.5"), river_stage_m=Decimal("0.10")),
        WeatherStation(station_name="Kaza Trans-Himalaya", district="Spiti", elevation_m=3650, terrain_type="Trans-Himalayan", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("1.20"), temperature_c=Decimal("6.0"), river_stage_m=Decimal("0.00")),
        WeatherStation(station_name="Manali Valley Station", district="Kullu", elevation_m=2050, terrain_type="Mountain valley", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("62.80"), temperature_c=Decimal("14.4"), river_stage_m=Decimal("1.10")),
        WeatherStation(station_name="Solang Alpine Gauge", district="Kullu", elevation_m=2480, terrain_type="Alpine", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("122.40"), temperature_c=Decimal("11.0"), river_stage_m=Decimal("1.90"), debris_flow_detected=True),
        WeatherStation(station_name="Banjar Forest Valley", district="Kullu", elevation_m=1350, terrain_type="Forest valley", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("31.00"), temperature_c=Decimal("18.2"), river_stage_m=Decimal("0.40")),
        WeatherStation(station_name="Dharamshala Observatory", district="Kangra", elevation_m=1457, terrain_type="Lesser Himalaya", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("114.50"), temperature_c=Decimal("19.0"), river_stage_m=Decimal("2.20"), landslide_sensor_triggered=True),
        WeatherStation(station_name="Palampur Tea Valley", district="Kangra", elevation_m=1220, terrain_type="Tea valley", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("41.20"), temperature_c=Decimal("21.4"), river_stage_m=Decimal("0.50")),
        WeatherStation(station_name="Dalhousie Mountain Ridge", district="Chamba", elevation_m=1970, terrain_type="Mountain ridge", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("28.40"), temperature_c=Decimal("14.5"), river_stage_m=Decimal("0.00")),
        WeatherStation(station_name="Chamba River Valley", district="Chamba", elevation_m=996, terrain_type="River valley", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("18.90"), temperature_c=Decimal("22.0"), river_stage_m=Decimal("0.90")),
        WeatherStation(station_name="Mandi River Basin Node", district="Mandi", elevation_m=760, terrain_type="River basin", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("108.60"), temperature_c=Decimal("23.2"), river_stage_m=Decimal("2.55"), debris_flow_detected=True),
        WeatherStation(station_name="Sundernagar Valley", district="Mandi", elevation_m=1100, terrain_type="Valley", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("52.10"), temperature_c=Decimal("24.0"), river_stage_m=Decimal("1.10")),
        WeatherStation(station_name="Solan Mid Hill Unit", district="Solan", elevation_m=1550, terrain_type="Mid hill", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("14.20"), temperature_c=Decimal("19.5"), river_stage_m=Decimal("0.20")),
        WeatherStation(station_name="Una Foothills Tracker", district="Una", elevation_m=370, terrain_type="Foothills", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("8.50"), temperature_c=Decimal("29.0"), river_stage_m=Decimal("0.40")),
        WeatherStation(station_name="Paonta Sahib Plains Node", district="Sirmaur", elevation_m=398, terrain_type="Plains", current_season="Monsoon", temp_day_ceiling=Decimal("20.0"), temp_night_floor=Decimal("8.0"), rainfall_1hr_mm=Decimal("19.20"), temperature_c=Decimal("30.4"), river_stage_m=Decimal("0.60"))
    ]
    
    routes = [
        TransitRoute(route_name="Shimla to Reckong Peo Trunk Line", origin="Shimla", destination="Reckong Peo", key_hazard_zone="Wangtu & Jeori Axis", hazard_profile="Shooting stones and rockfall triggers", current_status="Delayed", roznamcha_remarks="Roznamcha Entry #402: Nazar active near Wangtu sector due to localized tremors. Speeds capped.", relay_state="Jagrit"),
        TransitRoute(route_name="Shimla to Kaza Frontier Route", origin="Shimla", destination="Kaza", key_hazard_zone="Malling Nallah Sector", hazard_profile="NH-5 rockfalls, Sutlej bank collapse erosion", current_status="Blocked", roznamcha_remarks="Roznamcha Entry #234: Severe debris overflow tracking at Malling Nallah. Mohar applied seal at entry checkpoint.", relay_state="Jagrit"),
        TransitRoute(route_name="Shimla to Pooh Express Route", origin="Shimla", destination="Pooh", key_hazard_zone="Sutlej Landslide Links", hazard_profile="Sutlej flash landslides and active embankment failure", current_status="Blocked", roznamcha_remarks="Marga Blocked: Continuous shooting stones near bank cliffs. Buses held at Reckong Peo yard.", relay_state="Jagrit"),
        TransitRoute(route_name="Shimla to Sangla Inter-Link", origin="Shimla", destination="Sangla", key_hazard_zone="Baspa Valley Slopes", hazard_profile="Baspa valley slope failure slips and rock fractures", current_status="Delayed", roznamcha_remarks="Transit delayed. Delayed by 1h 20m as clearing plows packed local stone accumulation away.", relay_state="Jagrit"),
        TransitRoute(route_name="Shimla to Chitkul Border Link", origin="Shimla", destination="Chitkul", key_hazard_zone="Chitkul High Pass Rim", hazard_profile="Extreme alpine snow, avalanches, massive rockfalls", current_status="Suspended", roznamcha_remarks="Marga Closed: Him-Patan (Avalanche) alert active at frontier perimeter bounds. Communications marked Maun.", relay_state="Jagrit"),
        TransitRoute(route_name="Chandigarh to Reckong Peo Line", origin="Chandigarh", destination="Reckong Peo", key_hazard_zone="Lower Foothill Terraces", hazard_profile="Monsoon slope failures, retaining wall collapses", current_status="Delayed", roznamcha_remarks="Slow crawl advised near border channels. Structural shoring checks underway on retaining edges.", relay_state="Jagrit"),
        TransitRoute(route_name="Chandigarh to Kaza Long Route", origin="Chandigarh", destination="Kaza", key_hazard_zone="Trans-Himalayan Gateways", hazard_profile="Long-duration isolation risk and communication drops", current_status="Suspended", roznamcha_remarks="Aapda Intercept: Continuous blockades across range boundaries triggered long-haul suspension loops.", relay_state="Jagrit"),
        TransitRoute(route_name="Delhi to Kaza Strategic Link", origin="Delhi", destination="Kaza", key_hazard_zone="NH-5 Border Ridge lines", hazard_profile="NH-5 total corridor structural closures", current_status="Suspended", roznamcha_remarks="Suspended due to cross-district highway block layers. Fleet held at Chandigarh station base.", relay_state="Jagrit"),
        TransitRoute(route_name="Delhi to Keylong Transit Link", origin="Delhi", destination="Keylong", key_hazard_zone="Atal Tunnel Portals", hazard_profile="Rohtang/Atal Tunnel extreme high-altitude weather vectors", current_status="Operational", roznamcha_remarks="Marga Shubh: Intercept records check clear. Continuous flow through tunnel ports active.", relay_state="Jagrit"),
        TransitRoute(route_name="Manali to Keylong Shuttle Link", origin="Manali", destination="Keylong", key_hazard_zone="Solang Avalanche Pass", hazard_profile="Avalanche corridors north of Solang (historic Rohtang route)", current_status="Operational", roznamcha_remarks="Operational. Road surface clear. Avalanche defense netting reporting stable tracking grids.", relay_state="Jagrit"),
        TransitRoute(route_name="Manali to Kaza Desert Route", origin="Manali", destination="Kaza", key_hazard_zone="Gramphu to Chhatru Crossings", hazard_profile="Gramphu debris flows, Chhatru freezing stream overwash", current_status="Blocked", roznamcha_remarks="Roznamcha Entry #882: Pagal Nallah flash flood surge completely submerged the crossing tracks. Vehicles turned back.", relay_state="Jagrit"),
        TransitRoute(route_name="Manali to Udaipur Valley Shuttle", origin="Manali", destination="Udaipur", key_hazard_zone="Chenab Valley Slopes", hazard_profile="Chenab valley massive rock landslides", current_status="Delayed", roznamcha_remarks="Delayed by mud clearouts near river banks. Handled via local PWD field team deployments.", relay_state="Jagrit"),
        TransitRoute(route_name="Mandi to Kullu Main Highway", origin="Mandi", destination="Kullu", key_hazard_zone="Beas River Gorge", hazard_profile="Beas River high flooding and shoulder undercutting", current_status="Delayed", roznamcha_remarks="Beas River water levels pacing +1.8m above warning lines. Heavy freight traffic temporarily diverted.", relay_state="Jagrit"),
        TransitRoute(route_name="Mandi to Banjar Local Link", origin="Mandi", destination="Banjar", key_hazard_zone="Sainj River Basin Link", hazard_profile="Sainj River monsoon overflow surges", current_status="Blocked", roznamcha_remarks="Blocked. River surge has bypassed safety berm walls. Inundation tracking inside low plains.", relay_state="Jagrit"),
        TransitRoute(route_name="Kullu to Sainj Inter-Block Loop", origin="Kullu", destination="Sainj", key_hazard_zone="Sainj Gorge Intersection", hazard_profile="Flash flood khud proximity torrent lines", current_status="Blocked", roznamcha_remarks="Roznamcha Entry #234: Bailey bridge plate buckled under school bus load profiles. Engineering drop initiated.", relay_state="Jagrit"),
        TransitRoute(route_name="Kullu to Tirthan Eco-Route", origin="Kullu", destination="Banjar", key_hazard_zone="Tirthan Buffer Gorges", hazard_profile="Monsoon surges, root failures, sudden landslides", current_status="Operational", roznamcha_remarks="Marga Sthir: Track safe. Canopy monitoring frames tracking secure coordinates.", relay_state="Jagrit"),
        TransitRoute(route_name="Dharamshala to Chamba Link", origin="Dharamshala", destination="Chamba", key_hazard_zone="Dhauladhar Ridge Paths", hazard_profile="Narrow ridge road slips, deep canyon fog lines", current_status="Delayed", roznamcha_remarks="Heavy visibility occlusion due to dense sub-alpine cloud banks. Speed targets limited to 15km/h.", relay_state="Jagrit"),
        TransitRoute(route_name="Chamba to Pangi Frontier Route", origin="Chamba", destination="Killar", key_hazard_zone="Sach Pass Summit Ridge", hazard_profile="Sach Pass heavy winter snow accumulation and vertical slides", current_status="Suspended", roznamcha_remarks="Him-Patan hazard bounds tripped. Summit track ice thickness exceeding safe wheel track parameters.", relay_state="Jagrit"),
        TransitRoute(route_name="Chamba to Killar Isolation Link", origin="Chamba", destination="Killar", key_hazard_zone="Pangi Canyon Cliffs", hazard_profile="Extreme isolation, drop-off failures, communications lag", current_status="Suspended", roznamcha_remarks="Suspended in coordination with HPSDMA pass alerts. Clearing units holding at base camps.", relay_state="Jagrit"),
        TransitRoute(route_name="Reckong Peo to Nako Loop", origin="Reckong Peo", destination="Nako", key_hazard_zone="Malling Ingress Shelf", hazard_profile="High-altitude horizontal rockfall fractures", current_status="Delayed", roznamcha_remarks="Nazar active. Scribes logging small shale tracking drop movements on outer loop sensors.", relay_state="Jagrit"),
        TransitRoute(route_name="Reckong Peo to Kalpa Shuttle", origin="Reckong Peo", destination="Kalpa", key_hazard_zone="Upper Valley Forest tracks", hazard_profile="Sudden mountain winter snow block layers", current_status="Operational", roznamcha_remarks="Samyak (Synced): Track conditions tracking operational. Local fleet moving clear.", relay_state="Jagrit"),
        TransitRoute(route_name="Kaza to Kibber High Line", origin="Kaza", destination="Kibber", key_hazard_zone="Kibber Plain Ingress", hazard_profile="Brutal snowdrifts and sub-zero freeze locks", current_status="Operational", roznamcha_remarks="Marga Sthir: High-altitude tracks open. Wind indices tracking below threshold limits.", relay_state="Jagrit"),
        TransitRoute(route_name="Kaza to Losar Pass Approach", origin="Kaza", destination="Losar", key_hazard_zone="Losar Grass Slopes", hazard_profile="Extreme morning black ice layers", current_status="Delayed", roznamcha_remarks="Delayed until sunlight clears surface ice sheets. Sanding trucks actively packing salt courses.", relay_state="Jagrit"),
        TransitRoute(route_name="Kaza to Tabo Monastic Link", origin="Kaza", destination="Tabo", key_hazard_zone="Spiti Valley Canyons", hazard_profile="Trans-Himalayan sandstorms, sudden winter snow drifts", current_status="Operational", roznamcha_remarks="Sthir: Route clear. Visual range tracking optimal across monastery valley flats.", relay_state="Jagrit"),
        TransitRoute(route_name="Keylong to Darcha Highway Link", origin="Keylong", destination="Darcha", key_hazard_zone="Bhaga River Crossings", hazard_profile="Glacial moraine snow avalanches", current_status="Operational", roznamcha_remarks="Operational. Monitoring teams tracking active flow boundaries below bridge supports.", relay_state="Jagrit"),
        TransitRoute(route_name="Keylong to Sarchu High Corridor", origin="Keylong", destination="Sarchu", key_hazard_zone="Baralacha La Axis", hazard_profile="High-altitude deep snow blockades and sudden black ice", current_status="Suspended", roznamcha_remarks="Aapda Intercept: High pass temperature dropped to -12°C with rapid whiteout formations. Fleet grounded.", relay_state="Jagrit")
    ]
    
    for station in stations: session.add(station)
    for route in routes: session.add(route)
    session.flush()
    logger.info("Complete Climatology & Roznamcha Ledger successfully committed.")

def repair_sequences(session) -> None:
    logger.info("Resetting PostgreSQL serial sequences.")
    for table_name in SEQUENCE_TABLES:
        reset_serial_sequence(session, table_name)

def seed_database() -> int:
    session = SessionLocal()
    try:
        logger.info("Ensuring database schema exists.")
        Base.metadata.create_all(bind=engine)
        clear_database(session)

        logger.info("Beginning fresh HP production seed insert transaction.")
        seed_structural_data(session)
        seed_simulator_personas(session)
        session.flush()

        seed_anomaly_transactions(session)
        seed_cultural_assets_complete(session)
        seed_realtime_telemetry_nodes(session)
        session.flush()

        repair_sequences(session)
        session.commit()

        logger.info("🎯 HP production database seed completed successfully with zero omissions!")
        return 0
    except SQLAlchemyError:
        session.rollback()
        logger.exception("Database seed failed. Transaction rolled back.")
        return 1
    except Exception:
        session.rollback()
        logger.exception("Unexpected failure. Transaction rolled back safely.")
        return 1
    finally:
        session.close()

if __name__ == "__main__":
    sys.exit(seed_database())
