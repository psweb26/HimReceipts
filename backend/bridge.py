# backend/bridge.py
import logging
from ingestor import IngestionService, ConfigurableTransitProvider
from database import SessionLocal
from models import Grievance, Notification, TransitRoute
from ingestor import TransitAlert
from sqlalchemy.orm import Session
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

logger = logging.getLogger(__name__)

def run_live_transit_bridge():
    """
    This function will be the entry point for your automated cron/task.
    It fetches raw data from a source (HRTC/PWD bulletin), 
    normalizes it, and pushes it to the IngestionService.
    """
    # 1. Fetch raw data (Placeholder for real web-scraper/API call)
    raw_data = fetch_latest_hrtc_bulletin() 
    
    # 2. Normalize raw data into our TransitAlert format
    normalized_alerts = normalize_to_transit_alerts(raw_data)
    
    # 3. Use your existing IngestionService
    # We pass a custom provider that uses our normalized data
    provider = ConfigurableTransitProvider()
    service = IngestionService(weather_provider=None, transit_provider=provider)
    
    # Trigger the update
    service._safe_db_update(service._upsert_transit, normalized_alerts)
    logger.info("Transit bridge sync completed successfully.")

def fetch_latest_hrtc_bulletin():
    # TODO: Implement scraping or API call here
    pass

def normalize_to_transit_alerts(raw_data):
    # TODO: Mapping logic (Raw government text -> TransitAlert objects)
    pass

def process_emergency_alerts(normalized_alerts):
    db = SessionLocal()
    try:
        for alert in normalized_alerts:
            # 1. Update/Create the Transit Route record[cite: 1, 3]
            record = db.query(TransitRoute).filter(TransitRoute.route_name == alert.route_name).one_or_none()
            if record is None:
                record = TransitRoute(route_name=alert.route_name)
                db.add(record)
            
            record.current_status = alert.current_status
            record.roznamcha_remarks = alert.roznamcha_remarks
            
            # 2. Trigger the escalation logic[cite: 2, 3]
            check_for_emergency_escalation(alert, db)
            
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bridge sync failed: {e}")
    finally:
        db.close()

def check_for_emergency_escalation(alert: TransitAlert, db: Session):
    """
    Scans the normalized alert for critical keywords. 
    If found, it forces the grievance priority to 'critical' 
    and triggers a system notification.
    """
    danger_keywords = ["blocked", "avalanche", "flash flood", "collapsed"]
    
    if any(keyword in alert.current_status.lower() or keyword in alert.roznamcha_remarks.lower() 
           for keyword in danger_keywords):
        
        # Link this back to your existing Grievance and Notification system
        grievance = db.query(Grievance).filter(Grievance.ticket_id == alert.route_name).first()
        if grievance:
            grievance.priority = "critical"
            grievance.is_flagged_to_cmo = True
            db.add(Notification(
                grievance_id=grievance.id,
                recipient_type="District Magistrate",
                channel="Email",
                message=f"CRITICAL ALERT: {alert.route_name} is {alert.current_status}. Immediate action required."
            ))
            logger.warning(f"Escalation triggered for: {alert.route_name}")
