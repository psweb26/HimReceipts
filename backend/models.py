from sqlalchemy import (
    Boolean,
    Column,
    DDL,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    event,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM, TIMESTAMP
from sqlalchemy.orm import relationship

from database import Base


post_status_enum = ENUM(
    "Pending",
    "Under Verification",
    "In Progress",
    "Verified Resolved",
    "Reopened",
    "Rejected",
    name="post_status",
    validate_strings=True,
)

post_priority_enum = ENUM(
    "low",
    "medium",
    "high",
    "critical",
    name="post_priority",
    validate_strings=True,
)

post_role_enum = ENUM(
    "Officer",
    "Supervisor",
    "District Magistrate",
    "CMO_Monitor",
    name="post_role",
    validate_strings=True,
)

comm_channel_enum = ENUM(
    "SMS",
    "Email",
    "WhatsApp",
    name="comm_channel",
    validate_strings=True,
)


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    officers = relationship("Officer", back_populates="service_district")
    grievances = relationship("Grievance", back_populates="district_record")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)

    subcategories = relationship("Subcategory", back_populates="department")
    officers = relationship("Officer", back_populates="department")
    grievances = relationship("Grievance", back_populates="department")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    subcategories = relationship("Subcategory", back_populates="category")
    grievances = relationship("Grievance", back_populates="category")


class Subcategory(Base):
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True)
    category_id = Column(
        Integer,
        ForeignKey("categories.id"),
        nullable=False,
    )
    department_id = Column(
        Integer,
        ForeignKey("departments.id"),
        nullable=False,
    )
    name = Column(String, nullable=False)
    sla_hours = Column(
        Integer,
        nullable=False,
        server_default=text("72"),
    )
    base_priority = Column(post_priority_enum, nullable=False)

    category = relationship("Category", back_populates="subcategories")
    department = relationship("Department", back_populates="subcategories")
    grievances = relationship("Grievance", back_populates="subcategory")


class Citizen(Base):
    __tablename__ = "citizens"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    otp_hash = Column(String, nullable=True)

    grievances = relationship("Grievance", back_populates="citizen")


class Officer(Base):
    __tablename__ = "officers"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    department_id = Column(
        Integer,
        ForeignKey("departments.id"),
        nullable=False,
    )
    service_district_id = Column(
        Integer,
        ForeignKey("districts.id"),
        nullable=True,
    )
    block = Column(String, nullable=True)
    role = Column(
        post_role_enum,
        nullable=False,
        server_default=text("'Officer'"),
    )
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    department = relationship("Department", back_populates="officers")
    service_district = relationship("District", back_populates="officers")
    assigned_grievances = relationship(
        "Grievance",
        back_populates="assigned_officer",
    )
    grievance_logs = relationship(
        "GrievanceLog",
        back_populates="action_by_officer",
    )


class Grievance(Base):
    __tablename__ = "grievances"
    __table_args__ = (
        Index("ix_grievances_status", "status"),
        Index("ix_grievances_priority", "priority"),
        Index("ix_grievances_sla_due_date", "sla_due_date"),
        Index("ix_grievances_district", "district"),
        Index("ix_grievances_block", "block"),
        Index("ix_grievances_terrain_risk", "terrain_risk"),
        Index("ix_grievances_department_id", "department_id"),
        Index("ix_grievances_assigned_officer_id", "assigned_officer_id"),
        Index("ix_grievances_upvotes", "upvotes"),
        Index("ix_grievances_created_at", "created_at"),
    )

    id = Column(Integer, primary_key=True)
    ticket_id = Column(String(40), unique=True, index=True, nullable=False)
    citizen_id = Column(Integer, ForeignKey("citizens.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    subcategory_id = Column(
        Integer,
        ForeignKey("subcategories.id"),
        nullable=True,
    )
    department_id = Column(
        Integer,
        ForeignKey("departments.id"),
        nullable=False,
    )
    assigned_officer_id = Column(
        Integer,
        ForeignKey("officers.id"),
        nullable=True,
    )
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    district = Column(String, nullable=False)
    block = Column(String, nullable=False)
    panchayat = Column(String, nullable=False)
    terrain_risk = Column(String, nullable=False)
    infrastructure_type = Column(String, nullable=False)
    upvotes = Column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    intake_photo_url = Column(String(255), nullable=False, server_default="")
    status = Column(
        post_status_enum,
        nullable=False,
        server_default=text("'Pending'"),
    )
    priority = Column(
        post_priority_enum,
        nullable=False,
        server_default=text("'medium'"),
    )
    is_escalated_to_supervisor = Column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    is_escalated_to_dm = Column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    is_flagged_to_cmo = Column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    reopened_count = Column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    sla_due_date = Column(TIMESTAMP(timezone=False), nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=False),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        TIMESTAMP(timezone=False),
        nullable=False,
        server_default=func.now(),
    )
    resolved_at = Column(TIMESTAMP(timezone=False), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolution_photo_url = Column(String(255), nullable=True)

    citizen = relationship("Citizen", back_populates="grievances")
    category = relationship("Category", back_populates="grievances")
    subcategory = relationship("Subcategory", back_populates="grievances")
    department = relationship("Department", back_populates="grievances")
    assigned_officer = relationship(
        "Officer",
        back_populates="assigned_grievances",
    )
    district_record = relationship("District", back_populates="grievances")
    logs = relationship("GrievanceLog", back_populates="grievance")
    notifications = relationship("Notification", back_populates="grievance")


class GrievanceLog(Base):
    __tablename__ = "grievance_logs"

    id = Column(Integer, primary_key=True)
    grievance_id = Column(
        Integer,
        ForeignKey("grievances.id"),
        nullable=False,
    )
    previous_status = Column(post_status_enum, nullable=False)
    new_status = Column(post_status_enum, nullable=False)
    remarks = Column(Text, nullable=False)
    action_by_officer_id = Column(
        Integer,
        ForeignKey("officers.id"),
        nullable=True,
    )
    changed_at = Column(
        TIMESTAMP(timezone=False),
        nullable=False,
        server_default=func.now(),
    )

    grievance = relationship("Grievance", back_populates="logs")
    action_by_officer = relationship(
        "Officer",
        back_populates="grievance_logs",
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    grievance_id = Column(
        Integer,
        ForeignKey("grievances.id"),
        nullable=False,
    )
    recipient_type = Column(String(30), nullable=False)
    channel = Column(comm_channel_enum, nullable=False)
    message = Column(Text, nullable=False)
    sent_at = Column(
        TIMESTAMP(timezone=False),
        nullable=False,
        server_default=func.now(),
    )

    grievance = relationship("Grievance", back_populates="notifications")


update_modified_column = DDL(
    """
    CREATE OR REPLACE FUNCTION update_modified_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """
)

drop_grievances_updated_at_trigger = DDL(
    """
    DROP TRIGGER IF EXISTS set_grievances_updated_at ON grievances;
    """
)

create_grievances_updated_at_trigger = DDL(
    """
    CREATE TRIGGER set_grievances_updated_at
    BEFORE UPDATE ON grievances
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
    """
)

event.listen(Grievance.__table__, "after_create", update_modified_column)
event.listen(
    Grievance.__table__,
    "after_create",
    drop_grievances_updated_at_trigger,
)
event.listen(
    Grievance.__table__,
    "after_create",
    create_grievances_updated_at_trigger,
)
