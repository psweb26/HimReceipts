export const MOCK_LGD_DATABASE = [
  { id: 2001, district: "Kangra", bodyType: "Municipal Corporation", name: "Palampur Municipal Corporation", lgdCode: 275031 },
  { id: 2002, district: "Kangra", bodyType: "Municipal Corporation", name: "Dharamshala Municipal Corporation", lgdCode: 275032 },
  { id: 2003, district: "Kangra", bodyType: "Gram Panchayat", name: "Panchrukhi Gram Panchayat", lgdCode: 142310 },
  { id: 2004, district: "Kangra", bodyType: "Gram Panchayat", name: "Bhawarna Gram Panchayat", lgdCode: 142311 },
  { id: 3001, district: "Kullu", bodyType: "Gram Panchayat", name: "Sainj Gram Panchayat", lgdCode: 153201 },
  { id: 3002, district: "Kullu", bodyType: "Gram Panchayat", name: "Naggar Gram Panchayat", lgdCode: 153202 },
  { id: 9001, district: "Shimla", bodyType: "Municipal Corporation", name: "Shimla Municipal Corporation", lgdCode: 275001 },
];

export const ALL_DISTRICTS = [
  "Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu",
  "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una",
];

export const HIMACHAL_ADMIN_HIERARCHY = {
  Kullu: {
    Anni: ["Draman", "Kungash", "Lajheri"],
    Bhuntar: ["Bari", "Sainj", "Jari"],
    Nirmand: ["Arsu", "Deem", "Bagi Sarahan"],
  },
  Mandi: {
    Seraj: ["Bali Chowki", "Thunag", "Janjehli"],
    Drang: ["Katindhi", "Pali", "Uhal"],
    Balh: ["Kummi", "Gagal", "Ratti"],
  },
  Shimla: {
    Rohru: ["Chirgaon", "Samoli", "Pujarli"],
    Mashobra: ["Baldeyan", "Bhont", "Dhalli"],
    Theog: ["Matiana", "Kiari", "Deha"],
  },
  Kangra: {
    Baijnath: ["Paprola", "Bir", "Kothi Kohar"],
    Dharamshala: ["Rakkar", "Tang Narwana", "Sidhpur"],
    Nurpur: ["Rehan", "Sadwan", "Bassa Waziran"],
  },
  "Lahaul & Spiti": {
    Keylong: ["Sissu", "Gondhla", "Jispa"],
    Kaza: ["Kibber", "Langza", "Tabo"],
    Udaipur: ["Triloknath", "Miyar", "Tindi"],
  },
};

export const TERRAIN_RISKS = [
  "Landslide Vulnerable Link",
  "Flash Flood Khud Proximity",
  "High-Alpine Alpine Track",
  "Standard Rural Road",
];

export const INFRASTRUCTURE_TYPES = [
  "Connecting Bailey Bridge",
  "Drinking Water Line",
  "NH Highway Link",
  "Power Grid Substation",
];
