from database import SessionLocal
from models import Asset, DataSource

ASSETS = [
    {
        "asset_type": "Road",
        "name": "Jalori Pass Road",
        "district": "Kullu",
        "lat": 31.560,
        "lon": 77.340,
    },
    {
        "asset_type": "Road",
        "name": "NH-5 Wangtu Section",
        "district": "Kinnaur",
        "lat": 31.531,
        "lon": 78.024,
    },
    {
        "asset_type": "Heritage",
        "name": "Naggar Castle",
        "district": "Kullu",
        "lat": 32.115,
        "lon": 77.135,
    },
    {
        "asset_type": "AWS",
        "name": "IMD Shimla Node",
        "district": "Shimla",
        "lat": 31.104,
        "lon": 77.173,
    },
]

DATA_SOURCES = [
    {
        "name": "PWD Kullu",
        "source_priority": 90,
        "relay_state": "Jagrit",
    },
    {
        "name": "Citizen",
        "source_priority": 40,
        "relay_state": "Jagrit",
    },
    {
        "name": "IMD Shimla",
        "source_priority": 95,
        "relay_state": "Jagrit",
    },
]


def seed_assets(db):
    for asset_data in ASSETS:

        exists = (
            db.query(Asset)
            .filter(Asset.name == asset_data["name"])
            .first()
        )

        if not exists:
            db.add(Asset(**asset_data))


def seed_data_sources(db):
    for source_data in DATA_SOURCES:

        exists = (
            db.query(DataSource)
            .filter(DataSource.name == source_data["name"])
            .first()
        )

        if not exists:
            db.add(DataSource(**source_data))


def seed():
    db = SessionLocal()

    try:
        seed_assets(db)
        seed_data_sources(db)

        db.commit()

        print("Assets and DataSources seeded successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()