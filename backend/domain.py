from typing import Dict, List


HIMACHAL_ADMIN_HIERARCHY: Dict[str, Dict[str, List[str]]] = {
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


def evaluate_priority(terrain_risk: str) -> str:
    priority = TERRAIN_PRIORITY.get(terrain_risk)
    if priority is None:
        raise ValueError(
            f"terrainRisk must be one of: {', '.join(TERRAIN_PRIORITY.keys())}."
        )
    return priority


def allocate_department_name(infrastructure_type: str) -> str:
    department_name = DEPARTMENT_BY_INFRASTRUCTURE_TYPE.get(infrastructure_type)
    if department_name is None:
        raise ValueError(
            "infrastructureType must be one of: "
            f"{', '.join(DEPARTMENT_BY_INFRASTRUCTURE_TYPE.keys())}."
        )
    return department_name
