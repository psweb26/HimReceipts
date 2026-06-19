import os
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
from security import hash_password, verify_password
from models import (
    Category,
    Citizen,
    CitizenVeto,
    CulturalAsset,
    Department,
    District,
    Grievance,
    GrievanceLog,
    Notification,
    Officer,
    Subcategory,
)

MUNICIPAL_REGION = os.getenv("MUNICIPAL_REGION", "HIMACHAL_PRADESH")
MONSOON_COMMAND_STATE = os.getenv("MONSOON_COMMAND_STATE", "ACTIVE")

UPVOTE_CRITICAL_THRESHOLD = 30
ACTIVE_STATUSES = ("Pending", "Under Verification", "In Progress", "Reopened via Citizen Veto")
SLA_MONITOR_INTERVAL_SECONDS = 60

HIMAMACHAL_ADMIN_HIERARCHY: Dict[str, Dict[str, List[str]]] = {
    "Kullu": {
        "Anni": ["Draman", "Kungash", "Lajheri"],
        "Bhuntar": ["Bari", "Sainj", "Jari"],
        "Nirmand": ["Arsu", "Deem", "Bagi Sarahan"],
    },
    "Mandi": {
        "Seraj": ["Bali Chowki", "Thunag", "Janjehli"],
        "Drang": ["Katindhi", "Pali", "Uhal"],
        "Balh": ["Kummi", "Gagal", "Ratti"],
    },
    "Shimla": {
        "Rohru": ["Chirgaon", "Samoli", "Pujarli"],
        "Mashobra": ["Baldeyan", "Bhont", "Dhalli"],
        "Theog": ["Matiana", "Kiari", "Deha"],
    },
    "Kangra": {
        "Baijnath": ["Paprola", "Bir", "Kothi Kohar"],
        "Dharamshala": ["Rakkar", "Tang Narwana", "Sidhpur"],
        "Nurpur": ["Rehan", "Sadwan", "Bassa Waziran"],
    },
    "Lahaul & Spiti": {
        "Keylong": ["Sissu", "Gondhla", "Jispa"],
        "Kaza": ["Kibber", "Langza", "Tabo"],
        "Udaipur": ["Triloknath", "Miyar", "Tindi"],
    },
}

DEPARTMENT_BY_INFRASTRUCTURE_TYPE = {
    "Connecting Bailey Bridge": "Public Works Department",
    "Drinking Water Line": "Jal Shakti Vibhag",
    "NH Highway Link": "National Highways Wing",
    "Power Grid Substation": "HPSEBL Operations",
}

DEPARTMENT_CODES = {
    "Public Works Department": "PWD",
    "Jal Shakti Vibhag": "JSV",
    "National Highways Wing": "NHW",
    "HPSEBL Operations": "HPSEBL",
}

TERRAIN_PRIORITY = {
    "Flash Flood Khud Proximity": "critical",
    "Landslide Vulnerable Link": "high",
    "High-Alpine Alpine Track": "high",
    "Standard Rural Road": "medium",
}

SLA_HOURS_BY_PRIORITY = {
    "critical": 8,
    "high": 24,
    "medium": 72,
    "low": 72,
}

DEFAULT_COORDINATES_BY_DISTRICT = {
    "Kullu": (31.9592, 77.1089),
    "Mandi": (31.7087, 76.9320),
    "Shimla": (31.1048, 77.1734),
    "Kangra": (32.0998, 76.2691),
    "Lahaul & Spiti": (32.6195, 77.3784),
}

sla_monitor_thread: Optional[threading.Thread] = None

app = FastAPI(
    title="HimSetu: Unified Civic Accountability & Heritage Platform",
    version="3.0.0",
    description="Localized multi-tenant civic oversight with regional cultural preservation for Himachal Pradesh",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Authorization",
        "Content-Type",
        "Origin",
        "X-Monsoon-Command-State",
        "X-Municipal-Region",
        "X-Requested-With",
    ],
)

class OTPLoginRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=4, max_length=6)

class StaffLoginRequest(BaseModel):
    email: EmailStr
    password: str

class GrievanceResponse(BaseModel):
    id: int
    ticket_id: str
    title: str
    description: str
    district: str
    block: str
    panchayat: str
    upvotes: int
    terrainRisk: str
    infrastructureType: str
    department: str
    status: str
    priority: str
    sla_due_date: datetime
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolutionNotes: Optional[str] = None
    validationImageUrl: Optional[str] = None

class GrievanceResolveRequest(BaseModel):
    resolutionNotes: str
    validationImageUrl: str = Field(..., max_length=255)
    officerId: Optional[int] = Field(default=None, gt=0)

class GrievanceResolveResponse(BaseModel):
    ticket_id: str
    previous_status: str
    new_status: str
    resolved_at: datetime
    log_id: int

class GrievanceReopenRequest(BaseModel):
    remarks: str

class GrievanceReopenResponse(BaseModel):
    ticket_id: str
    previous_status: str
    new_status: str
    reopened_count: int
    is_escalated_to_supervisor: bool
    sla_due_date: datetime
    log_id: int

class CitizenVetoRequest(BaseModel):
    veto_remarks: str
    evidence_photo_url: Optional[str] = None

class CitizenVetoResponse(BaseModel):
    ticket_id: str
    previous_status: str
    new_status: str
    veto_id: int

class CulturalAssetResponse(BaseModel):
    id: int
    district: str
    asset_type: str
    title: str
    description: str
    image_url: Optional[str]
    metadata: Optional[str]

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

def enum_value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)

def require_non_empty(value: Optional[str], field_name: str) -> str:
    if value is None or not value.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must not be empty.",
        )
    return value.strip()

def validate_location_hierarchy(district: str, block: str, panchayat: str) -> None:
    block_map = HIMAMACHAL_ADMIN_HIERARCHY.get(district)
    if block_map is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"district must be one of: {', '.join(HIMAMACHAL_ADMIN_HIERARCHY.keys())}.",
        )

    panchayats = block_map.get(block)
    if panchayats is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"block '{block}' is not configured under district '{district}'.",
        )

    if panchayat not in panchayats:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"panchayat '{panchayat}' is not configured under {district} / {block}.",
        )

def evaluate_priority(terrain_risk: str) -> str:
    priority = TERRAIN_PRIORITY.get(terrain_risk)
    if priority is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"terrainRisk must be one of: {', '.join(TERRAIN_PRIORITY.keys())}.",
        )
    return priority

def allocate_department_name(infrastructure_type: str) -> str:
    department_name = DEPARTMENT_BY_INFRASTRUCTURE_TYPE.get(infrastructure_type)
    if department_name is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"infrastructureType must be one of: {', '.join(DEPARTMENT_BY_INFRASTRUCTURE_TYPE.keys())}.",
        )
    return department_name

def get_or_create_department(db: Session, department_name: str) -> Department:
    department = db.query(Department).filter(Department.name == department_name).first()
    if department is not None:
        return department

    department = Department(
        name=department_name,
        code=DEPARTMENT_CODES[department_name],
    )
    db.add(department)
    db.flush()
    return department

def get_or_create_district(db: Session, district_name: str) -> District:
    district = db.query(District).filter(District.name == district_name).first()
    if district is not None:
        return district

    district = District(name=district_name)
    db.add(district)
    db.flush()
    return district

def get_or_create_citizen(db: Session) -> Citizen:
    citizen = db.query(Citizen).filter(Citizen.phone == "9999999999").first()
    if citizen is not None:
        return citizen

    citizen = Citizen(
        name="Rina Thakur",
        phone="9999999999",
        otp_hash="demo_hash",
    )
    db.add(citizen)
    db.flush()
    return citizen

def get_or_create_category(db: Session, name: str) -> Category:
    category = db.query(Category).filter(Category.name == name).first()
    if category is not None:
        return category

    category = Category(name=name)
    db.add(category)
    db.flush()
    return category

def get_or_create_subcategory(
    db: Session,
    category_id: int,
    department_id: int,
    name: str,
    sla_hours: int,
    base_priority: str,
) -> Subcategory:
    subcategory = db.query(Subcategory).filter(Subcategory.name == name).first()
    if subcategory is not None:
        return subcategory

    subcategory = Subcategory(
        category_id=category_id,
        department_id=department_id,
        name=name,
        sla_hours=sla_hours,
        base_priority=base_priority,
    )
    db.add(subcategory)
    db.flush()
    return subcategory

def get_or_create_officer(
    db: Session,
    name: str,
    department_id: int,
    district_id: int,
    block: str,
    email: str,
) -> Officer:
    officer = db.query(Officer).filter(Officer.email == email).first()
    if officer is not None:
        return officer

    officer = Officer(
        name=name,
        department_id=department_id,
        service_district_id=district_id,
        block=block,
        role="Officer",
        email=email,
        password_hash=hash_password("password"),
        is_active=True,
    )
    db.add(officer)
    db.flush()
    return officer

def bootstrap_database() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        districts = {
            district_name: get_or_create_district(db, district_name)
            for district_name in HIMAMACHAL_ADMIN_HIERARCHY
        }
        departments = {
            department_name: get_or_create_department(db, department_name)
            for department_name in DEPARTMENT_BY_INFRASTRUCTURE_TYPE.values()
        }
        citizen = get_or_create_citizen(db)
        infrastructure_category = get_or_create_category(db, "Monsoon Infrastructure")
        utilities_category = get_or_create_category(db, "Critical Public Utilities")

        subcategories = {
            "Connecting Bailey Bridge": get_or_create_subcategory(
                db,
                infrastructure_category.id,
                departments["Public Works Department"].id,
                "Bailey Bridge Distress",
                8,
                "critical",
            ),
            "Drinking Water Line": get_or_create_subcategory(
                db,
                utilities_category.id,
                departments["Jal Shakti Vibhag"].id,
                "Drinking Water Line Washout",
                24,
                "high",
            ),
            "NH Highway Link": get_or_create_subcategory(
                db,
                infrastructure_category.id,
                departments["National Highways Wing"].id,
                "Highway Landslide Corridor",
                24,
                "high",
            ),
            "Power Grid Substation": get_or_create_subcategory(
                db,
                utilities_category.id,
                departments["HPSEBL Operations"].id,
                "Power Grid Access Failure",
                24,
                "high",
            ),
        }

        get_or_create_officer(
            db,
            "Officer Dev Negi",
            departments["Public Works Department"].id,
            districts["Kullu"].id,
            "Bhuntar",
            "dev.negi@hp.gov.example",
        )
        get_or_create_officer(
            db,
            "Officer Meera Rana",
            departments["Jal Shakti Vibhag"].id,
            districts["Kullu"].id,
            "Anni",
            "meera.rana@hp.gov.example",
        )
        get_or_create_officer(
            db,
            "Officer Arjun Chauhan",
            departments["National Highways Wing"].id,
            districts["Mandi"].id,
            "Seraj",
            "arjun.chauhan@hp.gov.example",
        )
        get_or_create_officer(
            db,
            "Officer Tashi Dolma",
            departments["HPSEBL Operations"].id,
            districts["Lahaul & Spiti"].id,
            "Kaza",
            "tashi.dolma@hp.gov.example",
        )

        if db.query(Grievance.id).first() is None:
            seed_bootstrap_grievances(db, citizen, districts, departments, subcategories)

        if db.query(CulturalAsset.id).first() is None:
            seed_cultural_assets(db, districts)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def seed_bootstrap_grievances(
    db: Session,
    citizen: Citizen,
    districts: Dict[str, District],
    departments: Dict[str, Department],
    subcategories: Dict[str, Subcategory],
) -> None:
    now = utc_now()
    payloads = [
        {
            "ticket_id": "HP-2026-PWD-BAILEY-001",
            "district": "Kullu",
            "block": "Bhuntar",
            "panchayat": "Sainj",
            "terrainRisk": "Flash Flood Khud Proximity",
            "infrastructureType": "Connecting Bailey Bridge",
            "title": "Bailey bridge deck plates buckling near Sainj market",
            "description": "Community crossing over the khud is vibrating under school bus traffic after overnight rainfall.",
            "upvotes": 42,
            "hours_ago": 3,
        },
        {
            "ticket_id": "HP-2026-NHW-LANDSLIDE-002",
            "district": "Mandi",
            "block": "Seraj",
            "panchayat": "Thunag",
            "terrainRisk": "Landslide Vulnerable Link",
            "infrastructureType": "NH Highway Link",
            "title": "Road retaining wall slipping on Seraj orchard link",
            "description": "The lower shoulder has opened a visible crack and loose stone is falling onto the bus route.",
            "upvotes": 29,
            "hours_ago": 10,
        },
        {
            "ticket_id": "HP-2026-JSV-WATER-003",
            "district": "Kullu",
            "block": "Anni",
            "panchayat": "Draman",
            "terrainRisk": "Flash Flood Khud Proximity",
            "infrastructureType": "Drinking Water Line",
            "title": "Gravity water line washed out above Draman",
            "description": "Two hamlets are reporting no drinking water after the exposed pipe snapped at the nala crossing.",
            "upvotes": 18,
            "hours_ago": 6,
        },
        {
            "ticket_id": "HP-2026-HPSEBL-POWER-004",
            "district": "Lahaul & Spiti",
            "block": "Kaza",
            "panchayat": "Kibber",
            "terrainRisk": "High-Alpine Alpine Track",
            "infrastructureType": "Power Grid Substation",
            "title": "Snowmelt erosion along Kibber service track",
            "description": "High-altitude track shoulders are narrowing and emergency vehicle access is now unreliable.",
            "upvotes": 12,
            "hours_ago": 20,
        },
    ]

    for payload in payloads:
        department_name = allocate_department_name(payload["infrastructureType"])
        department = departments[department_name]
        district = districts[payload["district"]]
        created_at = now - timedelta(hours=payload["hours_ago"])
        priority = evaluate_priority(payload["terrainRisk"])
        if payload["upvotes"] > UPVOTE_CRITICAL_THRESHOLD:
            priority = "critical"
        officer = find_assignment_officer(db, department.id, district.id, payload["block"])

        db.add(Grievance(
            ticket_id=payload["ticket_id"],
            citizen_id=citizen.id,
            category_id=subcategories[payload["infrastructureType"]].category_id,
            subcategory_id=subcategories[payload["infrastructureType"]].id,
            department_id=department.id,
            assigned_officer_id=officer.id if officer else None,
            latitude=decimal_coord(None, payload["district"], 0),
            longitude=decimal_coord(None, payload["district"], 1),
            district_id=district.id,
            district=payload["district"],
            block=payload["block"],
            panchayat=payload["panchayat"],
            terrain_risk=payload["terrainRisk"],
            infrastructure_type=payload["infrastructureType"],
            upvotes=payload["upvotes"],
            title=payload["title"],
            description=payload["description"],
            intake_photo_url="",
            status="Pending",
            priority=priority,
            is_flagged_to_cmo=payload["upvotes"] > UPVOTE_CRITICAL_THRESHOLD,
            sla_due_date=created_at + timedelta(hours=SLA_HOURS_BY_PRIORITY[priority]),
            created_at=created_at,
            updated_at=created_at,
        ))

def seed_cultural_assets(db: Session, districts: Dict[str, District]) -> None:
    """Seed heritage content to fuel daily user engagement."""
    assets = [
        # Kullu Dham & Heritage
        {
            "district_id": districts["Kullu"].id,
            "asset_type": "Dham Recipe",
            "title": "Sepu Badi (Kullu Summer Feast)",
            "description": "Traditional multi-course feast combining slow-cooked rice, kidney beans, and yogurt curries. Served during monsoon festivals.",
            "metadata": '{"season": "monsoon", "preparation_hours": 8}',
        },
        {
            "district_id": districts["Kullu"].id,
            "asset_type": "Handloom Motif",
            "title": "Kullu Shawl Diamond Cross-Stitch",
            "description": "Signature geometric diamond lattice pattern found on Kullu shawls, representing mountain peaks and terraced fields.",
            "metadata": '{"colors": ["crimson", "gold", "indigo"], "stitches_per_inch": 12}',
        },
        # Mandi Heritage
        {
            "district_id": districts["Mandi"].id,
            "asset_type": "Dham Recipe",
            "title": "Mandiyali Khir (Mandi Wedding Rice Pudding)",
            "description": "Sacred rice pudding slow-cooked with ghee and dry fruits, served at all Mandi ceremonial gatherings.",
            "metadata": '{"season": "year-round", "primary_ingredient": "basmati rice"}',
        },
        {
            "district_id": districts["Mandi"].id,
            "asset_type": "Deity Festival",
            "title": "Baisakhi Dussehra (Spring Deity Assembly)",
            "description": "Annual gathering of village deities carried through mountain paths. Travel routes close during the festival week.",
            "metadata": '{"month": "April", "duration_days": 7}',
        },
        # Kangra Heritage
        {
            "district_id": districts["Kangra"].id,
            "asset_type": "Handloom Motif",
            "title": "Kinnauri Cap (Nada) Geometric Embroidery",
            "description": "Complex geometric spirals and sun-symbols embroidered on traditional Kinnauri ceremonial caps, representing solar cycles.",
            "metadata": '{"embroidery_type": "chain-stitch", "completion_time_days": 30}',
        },
        {
            "district_id": districts["Kangra"].id,
            "asset_type": "Deity Festival",
            "title": "Kullu Dussehra (Mountain Deity Pageant)",
            "description": "Two-week festival where 200+ village deities travel ceremonial routes. Peak travel disruptions occur mid-October.",
            "metadata": '{"month": "October", "deity_count": 200}',
        },
        # Shimla Heritage
        {
            "district_id": districts["Shimla"].id,
            "asset_type": "Dham Recipe",
            "title": "Shimla Mash & Dal (Mountain Protein Bowl)",
            "description": "High-altitude protein dish combining lentils, horse beans, and local herbs. Traditional winter sustenance.",
            "metadata": '{"altitude_optimized": true, "season": "winter"}',
        },
        # Lahaul & Spiti Heritage
        {
            "district_id": districts["Lahaul & Spiti"].id,
            "asset_type": "Dham Recipe",
            "title": "Spiti Barley Bread & Butter Tea",
            "description": "High-altitude staple combining barley bread with Himalayan salt butter tea. Essential for extreme weather survival.",
            "metadata": '{"altitude": "3500m+", "season": "year-round"}',
        },
        {
            "district_id": districts["Lahaul & Spiti"].id,
            "asset_type": "Deity Festival",
            "title": "Spiti Monastery Losar (Tibetan New Year)",
            "description": "High-altitude monastery festival in sub-zero temperatures. Highway closures last 3-4 weeks during celebrations.",
            "metadata": '{"month": "February", "altitude": "3600m"}',
        },
    ]

    for asset_data in assets:
        asset = CulturalAsset(
            district_id=asset_data["district_id"],
            asset_type=asset_data["asset_type"],
            title=asset_data["title"],
            description=asset_data["description"],
            metadata=asset_data.get("metadata"),
        )
        db.add(asset)

def find_assignment_officer(db: Session, department_id: int, district_id: Optional[int], block: str) -> Optional[Officer]:
    location_specific = db.query(Officer).filter(
        Officer.department_id == department_id,
        Officer.service_district_id == district_id,
        Officer.block == block,
        Officer.role == "Officer",
        Officer.is_active.is_(True),
    ).order_by(Officer.id.asc()).first()
    if location_specific is not None:
        return location_specific

    return db.query(Officer).filter(
        Officer.department_id == department_id,
        Officer.role == "Officer",
        Officer.is_active.is_(True),
    ).order_by(Officer.id.asc()).first()

def generate_ticket_id(department_code: str, now: datetime) -> str:
    safe_code = re.sub(r"[^A-Z0-9]", "", department_code.upper())[:6]
    return f"HP-{now:%Y}-{safe_code or 'HP'}-{now:%m%d%H%M%S%f}"

def ensure_unique_ticket_id(db: Session, department_code: str) -> tuple[str, datetime]:
    for _ in range(5):
        now = utc_now()
        ticket_id = generate_ticket_id(department_code, now)
        exists = db.query(Grievance.id).filter(Grievance.ticket_id == ticket_id).first()
        if not exists:
            return ticket_id, now
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unable to generate a unique grievance ticket id.",
    )

def decimal_coord(value: Optional[float], district: str, index: int) -> Optional[Decimal]:
    if value is not None:
        return Decimal(f"{value:.6f}")
    fallback = DEFAULT_COORDINATES_BY_DISTRICT.get(district)
    if fallback is None:
        return None
    return Decimal(f"{fallback[index]:.6f}")

def apply_upvote_promotion(grievance: Grievance) -> bool:
    if int(grievance.upvotes or 0) > UPVOTE_CRITICAL_THRESHOLD:
        changed = enum_value(grievance.priority) != "critical"
        grievance.priority = "critical"
        grievance.is_flagged_to_cmo = True
        return changed
    return False

def promote_high_upvote_tickets(db: Session) -> None:
    promoted = False
    tickets = db.query(Grievance).filter(Grievance.upvotes > UPVOTE_CRITICAL_THRESHOLD).all()
    for ticket in tickets:
        promoted = apply_upvote_promotion(ticket) or promoted
    if promoted:
        db.commit()

def calculate_composite_score(grievance: Grievance) -> int:
    priority = enum_value(grievance.priority)
    return (
        (60 if priority == "critical" else 20)
        + int(grievance.upvotes or 0) * 2
        + (15 if grievance.terrain_risk == "Flash Flood Khud Proximity" else 0)
    )

def serialize_grievance(grievance: Grievance) -> GrievanceResponse:
    return GrievanceResponse(
        id=grievance.id,
        ticket_id=grievance.ticket_id,
        title=grievance.title,
        description=grievance.description,
        district=grievance.district,
        block=grievance.block,
        panchayat=grievance.panchayat,
        upvotes=int(grievance.upvotes or 0),
        terrainRisk=grievance.terrain_risk,
        infrastructureType=grievance.infrastructure_type,
        department=grievance.department.name,
        status=enum_value(grievance.status),
        priority=enum_value(grievance.priority),
        sla_due_date=grievance.sla_due_date,
        created_at=grievance.created_at,
        resolved_at=grievance.resolved_at,
        resolutionNotes=grievance.resolution_notes,
        validationImageUrl=grievance.resolution_photo_url,
    )

def run_sla_compliance_monitor() -> None:
    while True:
        from database import SessionLocal
        worker_db = SessionLocal()
        try:
            now = utc_now()
            breached_tickets = worker_db.query(Grievance).filter(
                Grievance.status.in_(ACTIVE_STATUSES),
                Grievance.sla_due_date < now,
                Grievance.is_escalated_to_dm.is_(False),
            ).all()

            for ticket in breached_tickets:
                previous_status = enum_value(ticket.status)
                ticket.is_escalated_to_dm = True
                ticket.priority = "critical"
                ticket.is_flagged_to_cmo = True

                worker_db.add(GrievanceLog(
                    grievance_id=ticket.id,
                    previous_status=previous_status,
                    new_status=previous_status,
                    remarks="System Automation Hook: mountain window SLA breached. Escalated to District Magistrate.",
                    action_by_officer_id=ticket.assigned_officer_id,
                ))
                worker_db.add(Notification(
                    grievance_id=ticket.id,
                    recipient_type="District Magistrate",
                    channel="Email",
                    message=f"SLA breach alert for ticket {ticket.ticket_id}. Command review required.",
                ))
            worker_db.commit()
        except Exception as monitor_err:
            print(f"Background monitoring worker error encountered: {monitor_err}")
            worker_db.rollback()
        finally:
            worker_db.close()
        time.sleep(SLA_MONITOR_INTERVAL_SECONDS)

@app.on_event("startup")
def start_sla_compliance_monitor() -> None:
    global sla_monitor_thread
    bootstrap_database()
    if sla_monitor_thread and sla_monitor_thread.is_alive():
        return
    sla_monitor_thread = threading.Thread(target=run_sla_compliance_monitor, daemon=True)
    sla_monitor_thread.start()

@app.get("/health")
def health_check() -> Dict[str, str]:
    return {
        "status": "ok",
        "municipal_region": MUNICIPAL_REGION,
        "monsoon_command_state": MONSOON_COMMAND_STATE,
    }

@app.post("/api/v1/auth/login", status_code=status.HTTP_200_OK)
def staff_and_executive_login(
    payload: StaffLoginRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    officer = db.query(Officer).filter(Officer.email == payload.email).first()
    
    if officer is None or not verify_password(payload.password, officer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrative username or password configuration.",
        )

    return {
        "success": True,
        "user_id": officer.id,
        "role": enum_value(officer.role),
        "department_id": officer.department_id,
        "token": "mocked_staff_jwt_token_hash",
    }

@app.get("/api/grievances", response_model=List[GrievanceResponse])
def list_grievances(db: Session = Depends(get_db)) -> List[GrievanceResponse]:
    promote_high_upvote_tickets(db)
    tickets = db.query(Grievance).order_by(Grievance.created_at.desc()).all()
    return [serialize_grievance(ticket) for ticket in tickets]

@app.post("/api/grievances", response_model=GrievanceResponse, status_code=status.HTTP_201_CREATED)
def create_grievance(
    title: str = Form(...),
    description: str = Form(...),
    district: str = Form(...),
    block: str = Form(...),
    panchayat: str = Form(...),
    terrainRisk: str = Form(...),
    infrastructureType: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    citizenId: Optional[int] = Form(None),
    db: Session = Depends(get_db),
) -> GrievanceResponse:
    """Safe, robust multipart endpoint aligned to your true database schemas."""
    title = require_non_empty(title, "title")
    description = require_non_empty(description, "description")
    validate_location_hierarchy(district, block, panchayat)

    priority = evaluate_priority(terrainRisk)
    department_name = allocate_department_name(infrastructureType)
    department = get_or_create_department(db, department_name)
    district_obj = get_or_create_district(db, district)
    
    officer = find_assignment_officer(
        db=db,
        department_id=department.id,
        district_id=district_obj.id,
        block=block,
    )
    citizen = db.query(Citizen).filter(Citizen.id == citizenId).first() if citizenId else None
    ticket_id, now = ensure_unique_ticket_id(db, department.code)
    
    grievance = Grievance(
        ticket_id=ticket_id,
        citizen_id=citizen.id if citizen else None,
        department_id=department.id,
        assigned_officer_id=officer.id if officer else None,
        latitude=decimal_coord(latitude, district, 0),
        longitude=decimal_coord(longitude, district, 1),
        district_id=district_obj.id,
        district=district,
        block=block,
        panchayat=panchayat,
        terrain_risk=terrainRisk,
        infrastructure_type=infrastructureType,
        upvotes=0,
        title=title,
        description=description,
        intake_photo_url="",
        status="Pending",
        priority=priority,
        is_flagged_to_cmo=False,
        sla_due_date=now + timedelta(hours=SLA_HOURS_BY_PRIORITY[priority]),
        created_at=now,
        updated_at=now,
    )

    try:
        db.add(grievance)
        db.commit()
        db.refresh(grievance)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to commit grievance data record.",
        ) from exc

    return serialize_grievance(grievance)

@app.post("/api/grievances/{ticket_id}/upvote", response_model=GrievanceResponse)
def upvote_grievance(ticket_id: str, db: Session = Depends(get_db)) -> GrievanceResponse:
    grievance = db.query(Grievance).filter(Grievance.ticket_id == ticket_id).with_for_update().first()
    if grievance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance profile lookup failure.")

    grievance.upvotes = int(grievance.upvotes or 0) + 1
    apply_upvote_promotion(grievance)

    try:
        db.commit()
        db.refresh(grievance)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Upvote transaction commit error.") from exc
    return serialize_grievance(grievance)

@app.post("/api/grievances/{ticket_id}/resolve", response_model=GrievanceResolveResponse)
def resolve_grievance(
    ticket_id: str,
    payload: GrievanceResolveRequest,
    db: Session = Depends(get_db),
) -> GrievanceResolveResponse:
    resolution_notes = require_non_empty(payload.resolutionNotes, "resolutionNotes")
    validation_image_url = require_non_empty(payload.validationImageUrl, "validationImageUrl")

    grievance = db.query(Grievance).filter(Grievance.ticket_id == ticket_id).with_for_update().first()
    if grievance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance ticket not found.")

    previous_status = enum_value(grievance.status)
    if previous_status not in ACTIVE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ticket cannot be resolved from {previous_status} status.",
        )

    action_by_officer_id = payload.officerId or grievance.assigned_officer_id
    now = utc_now()
    grievance.status = "Verified Resolved"
    grievance.resolved_at = now
    grievance.resolution_notes = resolution_notes
    grievance.resolution_photo_url = validation_image_url

    log = GrievanceLog(
        grievance_id=grievance.id,
        previous_status=previous_status,
        new_status="Verified Resolved",
        remarks=resolution_notes,
        action_by_officer_id=action_by_officer_id,
    )

    try:
        db.add(log)
        db.commit()
        db.refresh(log)
        db.refresh(grievance)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve grievance ticket.",
        ) from exc

    return GrievanceResolveResponse(
        ticket_id=grievance.ticket_id,
        previous_status=previous_status,
        new_status=enum_value(grievance.status),
        resolved_at=grievance.resolved_at,
        log_id=log.id,
    )

@app.post("/api/grievances/{ticket_id}/veto", response_model=CitizenVetoResponse)
def file_citizen_veto(
    ticket_id: str,
    payload: CitizenVetoRequest,
    db: Session = Depends(get_db),
) -> CitizenVetoResponse:
    """Allow citizens to veto a resolved ticket with fresh ground evidence."""
    veto_remarks = require_non_empty(payload.veto_remarks, "veto_remarks")
    
    grievance = db.query(Grievance).filter(Grievance.ticket_id == ticket_id).with_for_update().first()
    if grievance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance ticket not found.")

    if enum_value(grievance.status) != "Verified Resolved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Citizen veto can only be filed on resolved tickets.",
        )

    # Get or create default citizen for veto
    citizen = db.query(Citizen).filter(Citizen.phone == "9999999999").first()
    
    previous_status = "Verified Resolved"
    now = utc_now()
    grievance.status = "Reopened via Citizen Veto"
    grievance.reopened_count = int(grievance.reopened_count or 0) + 1
    grievance.is_escalated_to_supervisor = True
    grievance.sla_due_date = now + timedelta(hours=24)

    veto_record = CitizenVeto(
        grievance_id=grievance.id,
        citizen_id=citizen.id if citizen else None,
        veto_remarks=veto_remarks,
        evidence_photo_url=payload.evidence_photo_url,
    )

    log = GrievanceLog(
        grievance_id=grievance.id,
        previous_status=previous_status,
        new_status="Reopened via Citizen Veto",
        remarks=f"Citizen veto filed: {veto_remarks}",
        action_by_officer_id=None,
    )

    try:
        db.add(veto_record)
        db.add(log)
        db.commit()
        db.refresh(grievance)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to file citizen veto.",
        ) from exc

    return CitizenVetoResponse(
        ticket_id=grievance.ticket_id,
        previous_status=previous_status,
        new_status=enum_value(grievance.status),
        veto_id=veto_record.id,
    )

@app.get("/api/cultural-assets", response_model=List[CulturalAssetResponse])
def list_cultural_assets(district: Optional[str] = None, db: Session = Depends(get_db)) -> List[CulturalAssetResponse]:
    """Fetch heritage content to fuel daily user engagement."""
    query = db.query(CulturalAsset)
    
    if district:
        query = query.join(District).filter(District.name == district)
    
    assets = query.order_by(CulturalAsset.created_at.desc()).all()
    
    return [
        CulturalAssetResponse(
            id=asset.id,
            district=asset.district.name if asset.district else "Unknown",
            asset_type=enum_value(asset.asset_type),
            title=asset.title,
            description=asset.description,
            image_url=asset.image_url,
            metadata=asset.metadata,
        )
        for asset in assets
    ]

@app.get("/api/admin/executive-alerts")
def executive_alerts(db: Session = Depends(get_db)) -> Dict[str, Any]:
    promote_high_upvote_tickets(db)
    metric_row = db.query(
        func.count(Grievance.id).label("total_grievances"),
        func.count(Grievance.id).filter(Grievance.status.in_(ACTIVE_STATUSES)).label("active_pending"),
        func.count(Grievance.id).filter(Grievance.status == "Verified Resolved").label("verified_resolved"),
        func.count(Grievance.id).filter(Grievance.upvotes > UPVOTE_CRITICAL_THRESHOLD).label("high_upvote_emergencies"),
    ).one()

    district_rows = db.query(
        Grievance.district,
        func.count(Grievance.id).label("total"),
        func.count(Grievance.id).filter(Grievance.upvotes > UPVOTE_CRITICAL_THRESHOLD).label("high_upvote"),
        func.count(Grievance.id).filter(Grievance.terrain_risk == "Landslide Vulnerable Link").label("landslide"),
        func.count(Grievance.id).filter(Grievance.infrastructure_type == "Connecting Bailey Bridge").label("bailey_bridge"),
    ).group_by(Grievance.district).order_by(func.count(Grievance.id).desc()).all()

    alert_details = []
    high_risk_tickets = db.query(Grievance).filter(
        Grievance.status.in_(ACTIVE_STATUSES),
        ((Grievance.upvotes > UPVOTE_CRITICAL_THRESHOLD) | (Grievance.priority == "critical") | (Grievance.sla_due_date < func.now())),
    ).order_by(Grievance.upvotes.desc(), Grievance.sla_due_date.asc()).limit(8).all()

    for ticket in high_risk_tickets:
        alert_details.append({
            "type": "monsoon_infrastructure_escalation",
            "severity": enum_value(ticket.priority),
            "message": f"{ticket.district} / {ticket.block}: {ticket.title} has {ticket.upvotes} upvotes.",
            "ticket_id": ticket.ticket_id,
            "district": ticket.district,
            "block": ticket.block,
            "panchayat": ticket.panchayat,
            "upvotes": ticket.upvotes,
            "terrainRisk": ticket.terrain_risk,
            "infrastructureType": ticket.infrastructure_type,
            "compositeScore": calculate_composite_score(ticket),
        })

    return {
        "generated_at": utc_now(),
        "metrics": {
            "total_grievances": metric_row.total_grievances,
            "high_upvote_emergencies": metric_row.high_upvote_emergencies,
            "active_pending": metric_row.active_pending,
            "verified_resolved": metric_row.verified_resolved,
        },
        "district_load": [
            {"district": r.district, "total": int(r.total or 0), "high_upvote": int(r.high_upvote or 0), "landslide_or_bridge": int(r.landslide or 0) + int(r.bailey_bridge or 0)}
            for r in district_rows
        ],
        "alerts": [item["message"] for item in alert_details],
        "alert_details": alert_details,
    }
