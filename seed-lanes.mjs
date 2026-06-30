/**
 * Seed script: populates freight_lanes and lane_carriers tables.
 * Run with: node seed-lanes.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Freight Lanes ────────────────────────────────────────────────────────────
const lanes = [
  // Asia → Europe
  {
    name: "Shanghai → Rotterdam",
    originRegion: "china",
    destinationRegion: "netherlands",
    originPort: "Shanghai",
    destinationPort: "Rotterdam",
    baseTransitDays: 30,
    costIndex: 2,
    zones: "red_sea,suez,strait_of_hormuz",
  },
  {
    name: "Guangzhou → Felixstowe",
    originRegion: "china",
    destinationRegion: "uk",
    originPort: "Guangzhou",
    destinationPort: "Felixstowe",
    baseTransitDays: 32,
    costIndex: 2,
    zones: "red_sea,suez,strait_of_hormuz",
  },
  {
    name: "Ningbo → Hamburg",
    originRegion: "china",
    destinationRegion: "germany",
    originPort: "Ningbo",
    destinationPort: "Hamburg",
    baseTransitDays: 31,
    costIndex: 2,
    zones: "red_sea,suez,strait_of_hormuz",
  },
  {
    name: "Ho Chi Minh → Antwerp",
    originRegion: "vietnam",
    destinationRegion: "belgium",
    originPort: "Ho Chi Minh",
    destinationPort: "Antwerp",
    baseTransitDays: 28,
    costIndex: 2,
    zones: "red_sea,suez,strait_of_hormuz",
  },
  {
    name: "Mumbai → Rotterdam",
    originRegion: "india",
    destinationRegion: "netherlands",
    originPort: "Mumbai",
    destinationPort: "Rotterdam",
    baseTransitDays: 22,
    costIndex: 2,
    zones: "red_sea,suez,strait_of_hormuz",
  },
  // Asia → USA
  {
    name: "Shanghai → Los Angeles",
    originRegion: "china",
    destinationRegion: "usa",
    originPort: "Shanghai",
    destinationPort: "Los Angeles",
    baseTransitDays: 16,
    costIndex: 2,
    zones: "pacific",
  },
  {
    name: "Guangzhou → Long Beach",
    originRegion: "china",
    destinationRegion: "usa",
    originPort: "Guangzhou",
    destinationPort: "Long Beach",
    baseTransitDays: 17,
    costIndex: 2,
    zones: "pacific",
  },
  {
    name: "Busan → Seattle",
    originRegion: "korea",
    destinationRegion: "usa",
    originPort: "Busan",
    destinationPort: "Seattle",
    baseTransitDays: 12,
    costIndex: 2,
    zones: "pacific",
  },
  {
    name: "Tokyo → New York",
    originRegion: "japan",
    destinationRegion: "usa",
    originPort: "Tokyo",
    destinationPort: "New York",
    baseTransitDays: 20,
    costIndex: 2,
    zones: "pacific",
  },
  {
    name: "Ho Chi Minh → Los Angeles",
    originRegion: "vietnam",
    destinationRegion: "usa",
    originPort: "Ho Chi Minh",
    destinationPort: "Los Angeles",
    baseTransitDays: 18,
    costIndex: 2,
    zones: "pacific",
  },
  // Middle East → Europe / USA
  {
    name: "Jebel Ali → Rotterdam",
    originRegion: "uae",
    destinationRegion: "netherlands",
    originPort: "Jebel Ali",
    destinationPort: "Rotterdam",
    baseTransitDays: 20,
    costIndex: 2,
    zones: "strait_of_hormuz,red_sea,suez",
  },
  {
    name: "Jebel Ali → Los Angeles",
    originRegion: "uae",
    destinationRegion: "usa",
    originPort: "Jebel Ali",
    destinationPort: "Los Angeles",
    baseTransitDays: 28,
    costIndex: 2,
    zones: "strait_of_hormuz,red_sea,suez",
  },
  {
    name: "Bandar Abbas → Hamburg",
    originRegion: "iran",
    destinationRegion: "germany",
    originPort: "Bandar Abbas",
    destinationPort: "Hamburg",
    baseTransitDays: 25,
    costIndex: 3,
    zones: "strait_of_hormuz,red_sea,suez",
  },
  // Intra-Asia
  {
    name: "Shanghai → Singapore",
    originRegion: "china",
    destinationRegion: "singapore",
    originPort: "Shanghai",
    destinationPort: "Singapore",
    baseTransitDays: 5,
    costIndex: 1,
    zones: "malacca",
  },
  {
    name: "Busan → Hong Kong",
    originRegion: "korea",
    destinationRegion: "hong_kong",
    originPort: "Busan",
    destinationPort: "Hong Kong",
    baseTransitDays: 3,
    costIndex: 1,
    zones: "",
  },
  // Europe → USA
  {
    name: "Rotterdam → New York",
    originRegion: "netherlands",
    destinationRegion: "usa",
    originPort: "Rotterdam",
    destinationPort: "New York",
    baseTransitDays: 10,
    costIndex: 2,
    zones: "atlantic",
  },
  {
    name: "Hamburg → Baltimore",
    originRegion: "germany",
    destinationRegion: "usa",
    originPort: "Hamburg",
    destinationPort: "Baltimore",
    baseTransitDays: 12,
    costIndex: 2,
    zones: "atlantic",
  },
  // South Asia → Europe
  {
    name: "Colombo → Felixstowe",
    originRegion: "sri_lanka",
    destinationRegion: "uk",
    originPort: "Colombo",
    destinationPort: "Felixstowe",
    baseTransitDays: 24,
    costIndex: 2,
    zones: "red_sea,suez",
  },
  {
    name: "Chittagong → Rotterdam",
    originRegion: "bangladesh",
    destinationRegion: "netherlands",
    originPort: "Chittagong",
    destinationPort: "Rotterdam",
    baseTransitDays: 26,
    costIndex: 2,
    zones: "red_sea,suez",
  },
  // Trans-Pacific premium
  {
    name: "Shanghai → New York",
    originRegion: "china",
    destinationRegion: "usa",
    originPort: "Shanghai",
    destinationPort: "New York",
    baseTransitDays: 25,
    costIndex: 3,
    zones: "suez,red_sea",
  },
];

// ─── Lane Carriers ────────────────────────────────────────────────────────────
// carrierId must match IDs in the existing ShippingLines carrier list
const laneCarrierMap = {
  // Asia → Europe (Red Sea / Suez lanes)
  "Shanghai → Rotterdam": [
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 30,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 31,
      reliabilityScore: 78,
      costIndex: 2,
    },
    {
      carrierId: "cma-cgm",
      carrierName: "CMA CGM",
      transitDays: 30,
      reliabilityScore: 80,
      costIndex: 2,
    },
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 32,
      reliabilityScore: 75,
      costIndex: 1,
    },
    {
      carrierId: "hapag-lloyd",
      carrierName: "Hapag-Lloyd",
      transitDays: 29,
      reliabilityScore: 85,
      costIndex: 3,
    },
    {
      carrierId: "cosco",
      carrierName: "COSCO",
      transitDays: 31,
      reliabilityScore: 74,
      costIndex: 1,
    },
  ],
  "Guangzhou → Felixstowe": [
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 32,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 33,
      reliabilityScore: 78,
      costIndex: 2,
    },
    {
      carrierId: "cma-cgm",
      carrierName: "CMA CGM",
      transitDays: 32,
      reliabilityScore: 80,
      costIndex: 2,
    },
    {
      carrierId: "hapag-lloyd",
      carrierName: "Hapag-Lloyd",
      transitDays: 31,
      reliabilityScore: 85,
      costIndex: 3,
    },
  ],
  "Ningbo → Hamburg": [
    {
      carrierId: "hapag-lloyd",
      carrierName: "Hapag-Lloyd",
      transitDays: 30,
      reliabilityScore: 85,
      costIndex: 3,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 31,
      reliabilityScore: 78,
      costIndex: 2,
    },
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 32,
      reliabilityScore: 75,
      costIndex: 1,
    },
    {
      carrierId: "cosco",
      carrierName: "COSCO",
      transitDays: 31,
      reliabilityScore: 74,
      costIndex: 1,
    },
  ],
  "Ho Chi Minh → Antwerp": [
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 28,
      reliabilityScore: 78,
      costIndex: 2,
    },
    {
      carrierId: "cma-cgm",
      carrierName: "CMA CGM",
      transitDays: 28,
      reliabilityScore: 80,
      costIndex: 2,
    },
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 30,
      reliabilityScore: 75,
      costIndex: 1,
    },
  ],
  "Mumbai → Rotterdam": [
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 22,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 23,
      reliabilityScore: 78,
      costIndex: 2,
    },
    {
      carrierId: "hapag-lloyd",
      carrierName: "Hapag-Lloyd",
      transitDays: 21,
      reliabilityScore: 85,
      costIndex: 3,
    },
    {
      carrierId: "cma-cgm",
      carrierName: "CMA CGM",
      transitDays: 22,
      reliabilityScore: 80,
      costIndex: 2,
    },
  ],
  // Asia → USA (Pacific lanes)
  "Shanghai → Los Angeles": [
    {
      carrierId: "cosco",
      carrierName: "COSCO",
      transitDays: 16,
      reliabilityScore: 74,
      costIndex: 1,
    },
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 16,
      reliabilityScore: 75,
      costIndex: 1,
    },
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 15,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "yang-ming",
      carrierName: "Yang Ming",
      transitDays: 17,
      reliabilityScore: 70,
      costIndex: 1,
    },
    {
      carrierId: "one",
      carrierName: "ONE",
      transitDays: 16,
      reliabilityScore: 73,
      costIndex: 2,
    },
  ],
  "Guangzhou → Long Beach": [
    {
      carrierId: "cosco",
      carrierName: "COSCO",
      transitDays: 17,
      reliabilityScore: 74,
      costIndex: 1,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 17,
      reliabilityScore: 78,
      costIndex: 2,
    },
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 16,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 18,
      reliabilityScore: 75,
      costIndex: 1,
    },
  ],
  "Busan → Seattle": [
    {
      carrierId: "one",
      carrierName: "ONE",
      transitDays: 12,
      reliabilityScore: 73,
      costIndex: 2,
    },
    {
      carrierId: "yang-ming",
      carrierName: "Yang Ming",
      transitDays: 13,
      reliabilityScore: 70,
      costIndex: 1,
    },
    {
      carrierId: "hapag-lloyd",
      carrierName: "Hapag-Lloyd",
      transitDays: 11,
      reliabilityScore: 85,
      costIndex: 3,
    },
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 12,
      reliabilityScore: 75,
      costIndex: 1,
    },
  ],
  "Tokyo → New York": [
    {
      carrierId: "one",
      carrierName: "ONE",
      transitDays: 20,
      reliabilityScore: 73,
      costIndex: 2,
    },
    {
      carrierId: "hapag-lloyd",
      carrierName: "Hapag-Lloyd",
      transitDays: 19,
      reliabilityScore: 85,
      costIndex: 3,
    },
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 20,
      reliabilityScore: 82,
      costIndex: 2,
    },
  ],
  "Ho Chi Minh → Los Angeles": [
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 18,
      reliabilityScore: 75,
      costIndex: 1,
    },
    {
      carrierId: "cosco",
      carrierName: "COSCO",
      transitDays: 18,
      reliabilityScore: 74,
      costIndex: 1,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 17,
      reliabilityScore: 78,
      costIndex: 2,
    },
  ],
  // Middle East
  "Jebel Ali → Rotterdam": [
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 20,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 21,
      reliabilityScore: 78,
      costIndex: 2,
    },
    {
      carrierId: "hapag-lloyd",
      carrierName: "Hapag-Lloyd",
      transitDays: 19,
      reliabilityScore: 85,
      costIndex: 3,
    },
    {
      carrierId: "cma-cgm",
      carrierName: "CMA CGM",
      transitDays: 20,
      reliabilityScore: 80,
      costIndex: 2,
    },
  ],
  "Jebel Ali → Los Angeles": [
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 28,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 29,
      reliabilityScore: 78,
      costIndex: 2,
    },
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 30,
      reliabilityScore: 75,
      costIndex: 1,
    },
  ],
  "Bandar Abbas → Hamburg": [
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 25,
      reliabilityScore: 65,
      costIndex: 3,
    },
    {
      carrierId: "cma-cgm",
      carrierName: "CMA CGM",
      transitDays: 26,
      reliabilityScore: 68,
      costIndex: 3,
    },
  ],
  // Intra-Asia
  "Shanghai → Singapore": [
    {
      carrierId: "cosco",
      carrierName: "COSCO",
      transitDays: 5,
      reliabilityScore: 74,
      costIndex: 1,
    },
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 5,
      reliabilityScore: 75,
      costIndex: 1,
    },
    {
      carrierId: "one",
      carrierName: "ONE",
      transitDays: 5,
      reliabilityScore: 73,
      costIndex: 1,
    },
  ],
  "Busan → Hong Kong": [
    {
      carrierId: "one",
      carrierName: "ONE",
      transitDays: 3,
      reliabilityScore: 73,
      costIndex: 1,
    },
    {
      carrierId: "yang-ming",
      carrierName: "Yang Ming",
      transitDays: 3,
      reliabilityScore: 70,
      costIndex: 1,
    },
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 3,
      reliabilityScore: 75,
      costIndex: 1,
    },
  ],
  // Europe → USA
  "Rotterdam → New York": [
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 10,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "hapag-lloyd",
      carrierName: "Hapag-Lloyd",
      transitDays: 9,
      reliabilityScore: 85,
      costIndex: 3,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 10,
      reliabilityScore: 78,
      costIndex: 2,
    },
  ],
  "Hamburg → Baltimore": [
    {
      carrierId: "hapag-lloyd",
      carrierName: "Hapag-Lloyd",
      transitDays: 12,
      reliabilityScore: 85,
      costIndex: 3,
    },
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 12,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 13,
      reliabilityScore: 78,
      costIndex: 2,
    },
  ],
  // South Asia
  "Colombo → Felixstowe": [
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 24,
      reliabilityScore: 78,
      costIndex: 2,
    },
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 23,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "cma-cgm",
      carrierName: "CMA CGM",
      transitDays: 24,
      reliabilityScore: 80,
      costIndex: 2,
    },
  ],
  "Chittagong → Rotterdam": [
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 26,
      reliabilityScore: 78,
      costIndex: 2,
    },
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 25,
      reliabilityScore: 82,
      costIndex: 2,
    },
    {
      carrierId: "evergreen",
      carrierName: "Evergreen",
      transitDays: 27,
      reliabilityScore: 75,
      costIndex: 1,
    },
  ],
  // Trans-Pacific premium
  "Shanghai → New York": [
    {
      carrierId: "maersk",
      carrierName: "Maersk",
      transitDays: 25,
      reliabilityScore: 82,
      costIndex: 3,
    },
    {
      carrierId: "hapag-lloyd",
      carrierName: "Hapag-Lloyd",
      transitDays: 24,
      reliabilityScore: 85,
      costIndex: 3,
    },
    {
      carrierId: "msc",
      carrierName: "MSC",
      transitDays: 26,
      reliabilityScore: 78,
      costIndex: 3,
    },
  ],
};

// ─── Insert ───────────────────────────────────────────────────────────────────
console.log("Seeding freight_lanes...");
for (const lane of lanes) {
  const [existing] = await conn.execute(
    "SELECT id FROM freight_lanes WHERE name = ?",
    [lane.name]
  );
  if (existing.length > 0) {
    console.log(`  Skip (exists): ${lane.name}`);
    continue;
  }
  const [result] = await conn.execute(
    `INSERT INTO freight_lanes (name, originRegion, destinationRegion, originPort, destinationPort, baseTransitDays, costIndex, zones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lane.name,
      lane.originRegion,
      lane.destinationRegion,
      lane.originPort,
      lane.destinationPort,
      lane.baseTransitDays,
      lane.costIndex,
      lane.zones ?? "",
    ]
  );
  const laneId = result.insertId;
  console.log(`  Inserted lane [${laneId}]: ${lane.name}`);

  const carriers = laneCarrierMap[lane.name] ?? [];
  for (const c of carriers) {
    await conn.execute(
      `INSERT INTO lane_carriers (laneId, carrierId, carrierName, transitDays, reliabilityScore, costIndex)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        laneId,
        c.carrierId,
        c.carrierName,
        c.transitDays,
        c.reliabilityScore,
        c.costIndex,
      ]
    );
    console.log(`    + ${c.carrierName}`);
  }
}

await conn.end();
console.log("\nSeed complete.");
