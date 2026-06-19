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
    Department,
    District,
    Grievance,
    GrievanceLog,
    Notification,
    Officer,
    Subcategory,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


DELETE_SEQUENCE = (
    Notification,
    GrievanceLog,
    Grievance,
    Officer,
    Citizen,
    Subcategory,
    Category,
    Department,
    District,
)

SEQUENCE_TABLES = (
    "districts",
    "departments",
    "categories",
    "subcategories",
    "citizens",
    "officers",
    "grievances",
    "grievance_logs",
    "notifications",
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
    """Safely resets the auto-increment indexing primary key boundaries across PostgreSQL engines."""
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
    for model in DELETE_SEQUENCE:
        deleted_count = session.query(model).delete(synchronize_session=False)
        logger.info("Deleted %s row(s) from %s.", deleted_count, model.__tablename__)
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
            Department(
                id=DEPARTMENT_IDS[name],
                name=name,
                code=DEPARTMENT_CODES[name],
            )
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
            Subcategory(
                id=1,
                category_id=1,
                department_id=1,
                name="Bailey Bridge Distress",
                sla_hours=8,
                base_priority="critical",
            ),
            Subcategory(
                id=2,
                category_id=2,
                department_id=2,
                name="Drinking Water Line Washout",
                sla_hours=24,
                base_priority="high",
            ),
            Subcategory(
                id=3,
                category_id=1,
                department_id=3,
                name="Highway Landslide Corridor",
                sla_hours=24,
                base_priority="high",
            ),
            Subcategory(
                id=4,
                category_id=2,
                department_id=4,
                name="Power Grid Access Failure",
                sla_hours=24,
                base_priority="high",
            ),
        ],
    )
    logger.info("Structural lookup seed staged.")


def seed_simulator_personas(session) -> None:
    logger.info("Seeding HP citizen and field officer personas.")
    
    # Generate secure, salted cryptographic hash signatures for our standard credentials
    secure_hashed_fallback = hash_password("password")
    
    add_records(
        session,
        [
            Citizen(
                id=1,
                name="Rina Thakur",
                phone="9999999999",
                otp_hash="demo_hash",
            ),
            Officer(
                id=1,
                name="Officer Dev Negi",
                department_id=1,
                service_district_id=1,
                block="Bhuntar",
                role="Officer",
                email="dev.negi@hp.gov.example",
                password_hash=secure_hashed_fallback,
                is_active=True,
            ),
            Officer(
                id=2,
                name="Officer Meera Rana",
                department_id=2,
                service_district_id=1,
                block="Anni",
                role="Officer",
                email="meera.rana@hp.gov.example",
                password_hash=secure_hashed_fallback,
                is_active=True,
            ),
            Officer(
                id=3,
                name="Officer Arjun Chauhan",
                department_id=3,
                service_district_id=2,
                block="Seraj",
                role="Officer",
                email="arjun.chauhan@hp.gov.example",
                password_hash=secure_hashed_fallback,
                is_active=True,
            ),
            Officer(
                id=4,
                name="Officer Tashi Dolma",
                department_id=4,
                service_district_id=5,
                block="Kaza",
                role="Officer",
                email="tashi.dolma@hp.gov.example",
                password_hash=secure_hashed_fallback,
                is_active=True,
            ),
        ],
    )
    logger.info("Simulator personas staged.")


def build_grievance_rows(now: datetime) -> list[Grievance]:
    rows = []
    payloads = [
        {
            "id": 1,
            "ticket_id": "HP-2026-PWD-BAILEY-001",
            "department_id": 1,
            "assigned_officer_id": 1,
            "district_id": 1,
            "district": "Kullu",
            "block": "Bhuntar",
            "panchayat": "Sainj",
            "terrain_risk": "Flash Flood Khud Proximity",
            "infrastructure_type": "Connecting Bailey Bridge",
            "title": "Bailey bridge deck plates buckling near Sainj market",
            "description": (
                "Community crossing over the khud is vibrating under school "
                "bus traffic after overnight rainfall."
            ),
            "upvotes": 42,
            "lat": 31.7768,
            "lon": 77.3442,
            "hours_ago": 3,
        },
        {
            "id": 2,
            "ticket_id": "HP-2026-NHW-LANDSLIDE-002",
            "department_id": 3,
            "assigned_officer_id": 3,
            "district_id": 2,
            "district": "Mandi",
            "block": "Seraj",
            "panchayat": "Thunag",
            "terrain_risk": "Landslide Vulnerable Link",
            "infrastructure_type": "NH Highway Link",
            "title": "Road retaining wall slipping on Seraj orchard link",
            "description": (
                "The lower shoulder has opened a visible crack and loose "
                "stone is falling onto the bus route."
            ),
            "upvotes": 29,
            "lat": 31.5534,
            "lon": 77.1735,
            "hours_ago": 10,
        },
        {
            "id": 3,
            "ticket_id": "HP-2026-JSV-WATER-003",
            "department_id": 2,
            "assigned_officer_id": 2,
            "district_id": 1,
            "district": "Kullu",
            "block": "Anni",
            "panchayat": "Draman",
            "terrain_risk": "Flash Flood Khud Proximity",
            "infrastructure_type": "Drinking Water Line",
            "title": "Gravity water line washed out above Draman",
            "description": (
                "Two hamlets are reporting no drinking water after the "
                "exposed pipe snapped at the nala crossing."
            ),
            "upvotes": 18,
            "lat": 31.3976,
            "lon": 77.3401,
            "hours_ago": 6,
        },
        {
            "id": 4,
            "ticket_id": "HP-2026-HPSEBL-POWER-004",
            "department_id": 4,
            "assigned_officer_id": 4,
            "district_id": 5,
            "district": "Lahaul & Spiti",
            "block": "Kaza",
            "panchayat": "Kibber",
            "terrain_risk": "High-Alpine Alpine Track",
            "infrastructure_type": "Power Grid Substation",
            "title": "Snowmelt erosion along Kibber service track",
            "description": (
                "High-altitude track shoulders are narrowing and emergency "
                "vehicle access is now unreliable."
            ),
            "upvotes": 12,
            "lat": 32.3324,
            "lon": 78.0138,
            "hours_ago": 20,
        },
    ]

    for payload in payloads:
        created_at = now - timedelta(hours=payload["hours_ago"])
        priority = evaluate_priority(payload["terrain_risk"])
        if payload["upvotes"] > 30:
            priority = "critical"
        rows.append(
            Grievance(
                id=payload["id"],
                ticket_id=payload["ticket_id"],
                citizen_id=1,
                category_id=1,
                subcategory_id=min(payload["id"], 4),
                department_id=payload["department_id"],
                assigned_officer_id=payload["assigned_officer_id"],
                latitude=decimal_coord(payload["lat"]),
                longitude=decimal_coord(payload["lon"]),
                district_id=payload["district_id"],
                district=payload["district"],
                block=payload["block"],
                panchayat=payload["panchayat"],
                terrain_risk=payload["terrain_risk"],
                infrastructure_type=payload["infrastructure_type"],
                upvotes=payload["upvotes"],
                title=payload["title"],
                description=payload["description"],
                intake_photo_url="https://example.com/hp/monsoon-evidence.jpg",
                status="Pending",
                priority=priority,
                is_flagged_to_cmo=payload["upvotes"] > 30,
                reopened_count=0,
                sla_due_date=created_at + timedelta(hours=SLA_HOURS_BY_PRIORITY[priority]),
                created_at=created_at,
                updated_at=created_at,
            )
        )

    return rows


def seed_anomaly_transactions(session) -> None:
    logger.info("Seeding HP monsoon infrastructure transactions.")
    now = datetime.utcnow().replace(microsecond=0)
    grievance_rows = build_grievance_rows(now)

    add_records(session, grievance_rows)
    logger.info("Staged %s terrain-aware grievances.", len(grievance_rows))


def repair_sequences(session) -> None:
    logger.info("Resetting PostgreSQL serial sequences after explicit IDs.")
    for table_name in SEQUENCE_TABLES:
        reset_serial_sequence(session, table_name)


def seed_database() -> int:
    session = SessionLocal()
    try:
        logger.info("Ensuring database schema exists.")
        Base.metadata.create_all(bind=engine)

        clear_database(session)

        logger.info("Beginning fresh HP seed insert transaction.")
        seed_structural_data(session)
        seed_simulator_personas(session)
        session.flush()

        seed_anomaly_transactions(session)
        session.flush()

        repair_sequences(session)
        session.commit()

        logger.info("HP monsoon database seed completed successfully.")
        return 0

    except SQLAlchemyError:
        session.rollback()
        logger.exception("Database seed failed. Transaction was rolled back cleanly.")
        return 1
    except Exception:
        session.rollback()
        logger.exception("Unexpected seed failure. Transaction was rolled back cleanly.")
        return 1
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(seed_database())