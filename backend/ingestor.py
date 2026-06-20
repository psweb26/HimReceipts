import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Dict, Iterable, List, Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database import SessionLocal
from models import TransitRoute, WeatherStation

logger = logging.getLogger(__name__)


@dataclass
class WeatherReading:
    station_name: str
    district: str
    elevation_m: int
    terrain_type: str
    rainfall_1hr_mm: float
    temperature_c: float
    river_stage_m: float = 0.0
    landslide_sensor_triggered: bool = False
    debris_flow_detected: bool = False
    current_season: str = "Monsoon"
    temp_day_ceiling: float = 20.0
    temp_night_floor: float = 8.0


@dataclass
class TransitAlert:
    route_name: str
    origin: str
    destination: str
    key_hazard_zone: str
    hazard_profile: str
    current_status: str
    roznamcha_remarks: str
    relay_state: str = "Jagrit"


class WeatherProvider:
    def fetch(self) -> List[WeatherReading]:
        raise NotImplementedError


class TransitProvider:
    def fetch(self) -> List[TransitAlert]:
        raise NotImplementedError


class OpenWeatherMapProvider(WeatherProvider):
    def __init__(self) -> None:
        self.api_key = os.getenv("OPENWEATHERMAP_API_KEY", "").strip()
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"
        self.locations = [
            {"station_name": "Shimla Node", "district": "Shimla", "terrain_type": "Mid Himalayan", "elevation_m": 2205, "lat": 31.1048, "lon": 77.1734},
            {"station_name": "Kullu Node", "district": "Kullu", "terrain_type": "Mountain Valley", "elevation_m": 1279, "lat": 31.9579, "lon": 77.1095},
            {"station_name": "Mandi Node", "district": "Mandi", "terrain_type": "River Basin", "elevation_m": 760, "lat": 31.7087, "lon": 76.9320},
            {"station_name": "Dharamshala Node", "district": "Kangra", "terrain_type": "Lesser Himalaya", "elevation_m": 1457, "lat": 32.2190, "lon": 76.3234},
            {"station_name": "Kaza Node", "district": "Spiti", "terrain_type": "Trans-Himalayan", "elevation_m": 3650, "lat": 32.2231, "lon": 78.0717},
        ]

    def fetch(self) -> List[WeatherReading]:
        if not self.api_key:
            logger.info("OPENWEATHERMAP_API_KEY is not configured; skipping weather ingestion.")
            return []

        readings: List[WeatherReading] = []
        for location in self.locations:
            try:
                reading = self._fetch_location(location)
                if reading:
                    readings.append(reading)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Weather ingestion failed for %s: %s", location["station_name"], exc)
        return readings

    def _fetch_location(self, location: Dict[str, object]) -> Optional[WeatherReading]:
        query = urlencode(
            {
                "appid": self.api_key,
                "lat": location["lat"],
                "lon": location["lon"],
                "units": "metric",
            }
        )
        request = Request(url=f"{self.base_url}?{query}", method="GET")
        with urlopen(request, timeout=15) as response:  # nosec B310
            payload = json.loads(response.read().decode("utf-8"))

        rain = float(payload.get("rain", {}).get("1h", 0.0))
        temperature = float(payload.get("main", {}).get("temp", 0.0))
        weather_desc = " ".join((item.get("main", "") for item in payload.get("weather", []))).lower()
        landslide_signal = rain > 75 or "thunderstorm" in weather_desc

        return WeatherReading(
            station_name=str(location["station_name"]),
            district=str(location["district"]),
            elevation_m=int(location["elevation_m"]),
            terrain_type=str(location["terrain_type"]),
            rainfall_1hr_mm=rain,
            temperature_c=temperature,
            river_stage_m=min(round(rain / 50, 2), 4.5),
            landslide_sensor_triggered=landslide_signal,
            debris_flow_detected=rain > 90,
        )


class ConfigurableTransitProvider(TransitProvider):
    """
    Reads transit alerts from HRTC/PWD integration bridge.
    For now this expects TRANSIT_ALERTS_JSON to contain an array payload from connector jobs.
    """

    def fetch(self) -> List[TransitAlert]:
        raw = os.getenv("TRANSIT_ALERTS_JSON", "").strip()
        if not raw:
            logger.info("TRANSIT_ALERTS_JSON not configured; skipping transit ingestion.")
            return []
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.warning("TRANSIT_ALERTS_JSON invalid JSON: %s", exc)
            return []

        alerts: List[TransitAlert] = []
        for item in payload if isinstance(payload, list) else []:
            route_name = str(item.get("route_name", "")).strip()
            if not route_name:
                continue
            alerts.append(
                TransitAlert(
                    route_name=route_name,
                    origin=str(item.get("origin", "Unknown")),
                    destination=str(item.get("destination", "Unknown")),
                    key_hazard_zone=str(item.get("key_hazard_zone", "Unknown")),
                    hazard_profile=str(item.get("hazard_profile", "Unavailable")),
                    current_status=str(item.get("current_status", "Operational")),
                    roznamcha_remarks=str(item.get("roznamcha_remarks", "Ingestion bridge update")),
                    relay_state=str(item.get("relay_state", "Jagrit")),
                )
            )
        return alerts


class IngestionService:
    def __init__(self, weather_provider: WeatherProvider, transit_provider: TransitProvider) -> None:
        self.weather_provider = weather_provider
        self.transit_provider = transit_provider

    def run_weather_sync(self) -> None:
        readings = self.weather_provider.fetch()
        if not readings:
            return
        self._safe_db_update(self._upsert_weather, readings)

    def run_transit_sync(self) -> None:
        alerts = self.transit_provider.fetch()
        if not alerts:
            return
        self._safe_db_update(self._upsert_transit, alerts)

    def _safe_db_update(self, sync_fn, payload: Iterable[object]) -> None:
        db = SessionLocal()
        try:
            sync_fn(db, payload)
            db.commit()
        except SQLAlchemyError as exc:
            db.rollback()
            logger.error("Ingestion database transaction rolled back: %s", exc)
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            logger.error("Ingestion runtime failure: %s", exc)
        finally:
            db.close()

    def _upsert_weather(self, db: Session, readings: Iterable[WeatherReading]) -> None:
        for reading in readings:
            record = (
                db.query(WeatherStation)
                .filter(WeatherStation.station_name == reading.station_name)
                .one_or_none()
            )
            if record is None:
                record = WeatherStation(station_name=reading.station_name)
                db.add(record)
            record.district = reading.district
            record.elevation_m = int(reading.elevation_m)
            record.terrain_type = reading.terrain_type
            record.current_season = reading.current_season
            record.temp_day_ceiling = Decimal(f"{reading.temp_day_ceiling:.1f}")
            record.temp_night_floor = Decimal(f"{reading.temp_night_floor:.1f}")
            record.rainfall_1hr_mm = Decimal(f"{reading.rainfall_1hr_mm:.2f}")
            record.temperature_c = Decimal(f"{reading.temperature_c:.1f}")
            record.river_stage_m = Decimal(f"{reading.river_stage_m:.2f}")
            record.landslide_sensor_triggered = bool(reading.landslide_sensor_triggered)
            record.debris_flow_detected = bool(reading.debris_flow_detected)
            record.last_ping = datetime.utcnow()

    def _upsert_transit(self, db: Session, alerts: Iterable[TransitAlert]) -> None:
        for alert in alerts:
            record = (
                db.query(TransitRoute)
                .filter(TransitRoute.route_name == alert.route_name)
                .one_or_none()
            )
            if record is None:
                record = TransitRoute(route_name=alert.route_name)
                db.add(record)
            record.origin = alert.origin
            record.destination = alert.destination
            record.key_hazard_zone = alert.key_hazard_zone
            record.hazard_profile = alert.hazard_profile
            record.current_status = alert.current_status
            record.roznamcha_remarks = alert.roznamcha_remarks
            record.relay_state = alert.relay_state
            record.updated_at = datetime.utcnow()


def build_ingestion_service() -> IngestionService:
    return IngestionService(
        weather_provider=OpenWeatherMapProvider(),
        transit_provider=ConfigurableTransitProvider(),
    )
