# backend/ledger.py

from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import text, func

from models import (
    Incident,
    Evidence,
    EventStateTransition,
    DataSource,
)


STATE_RANK = {
    "Forecast": 1,
    "Warning": 2,
    "Active": 3,
    "Critical": 4,
    "Resolved": 5,
}


def process_evidence(
    db: Session,
    asset_id: int,
    event_type: str,
    source_id: int,
    summary: str,
    payload: dict,
):
    try:


        cutoff = datetime.utcnow() - timedelta(hours=24)

        incident = (
            db.query(Incident)
            .filter(
                Incident.asset_id == asset_id,
                Incident.event_type == event_type,
                Incident.created_at > cutoff,
            )
            .first()
        )



        if not incident:
            incident = Incident(
                asset_id=asset_id,
                event_type=event_type,
                current_state="Forecast",
            )

            db.add(incident)
            db.flush()

            # Initial audit entry
            db.add(
                EventStateTransition(
                    incident_id=incident.id,
                    from_state=None,
                    to_state="Forecast",
                    actor_type="System",
                    reason="Initial incident creation",
                )
            )


        evidence = Evidence(
            incident_id=incident.id,
            source_id=source_id,
            evidence_type="Report",
            summary=summary,
            payload=payload,
            source_timestamp=datetime.utcnow(),
        )

        db.add(evidence)
        db.flush()


        source = (
            db.query(DataSource)
            .filter(DataSource.id == source_id)
            .first()
        )


        new_state = incident.current_state

        if source:

            # Government / High Priority
            if source.source_priority >= 90:
                new_state = "Active"

            # Citizen / Medium Priority
            elif (
                source.source_priority >= 40
                and incident.current_state == "Forecast"
            ):
                new_state = "Warning"



        current_rank = STATE_RANK.get(
            incident.current_state,
            0
        )

        new_rank = STATE_RANK.get(
            new_state,
            0
        )

        if new_rank > current_rank:

            db.add(
                EventStateTransition(
                    incident_id=incident.id,
                    from_state=incident.current_state,
                    to_state=new_state,
                    actor_type=source.name if source else "Unknown",
                    reason=summary,
                    evidence_id=evidence.id,
                )
            )

            incident.current_state = new_state

        incident.updated_at = datetime.utcnow()


        db.commit()

        db.refresh(incident)

        return incident

    except Exception:
        db.rollback()
        raise