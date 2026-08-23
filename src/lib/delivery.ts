export interface DeliveryZone {
  id: string;
  nameBn: string;
  nameEn: string;
  minDistance: number;
  maxDistance: number;
  fee: number;
  isActive: boolean;
}

export interface StoreLocation {
  address: string;
  lat: number;
  lng: number;
}

export const DEFAULT_STORE_LOCATION: StoreLocation = {
  address: "Chanchkoir Bazar, Gurudaspur, Natore, Bangladesh",
  lat: 24.3686,
  lng: 89.0234
};

export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "zone_0_3",
    nameBn: "লোকাল জোন (০ - ৩ কিমি)",
    nameEn: "Local Zone (0 - 3 km)",
    minDistance: 0,
    maxDistance: 3,
    fee: 35,
    isActive: true
  },
  {
    id: "zone_3_5",
    nameBn: "সিটি জোন (৩ - ৫ কিমি)",
    nameEn: "City Zone (3 - 5 km)",
    minDistance: 3,
    maxDistance: 5,
    fee: 50,
    isActive: true
  },
  {
    id: "zone_5_10",
    nameBn: "সাব-আরবান জোন (৫ - ১০ কিমি)",
    nameEn: "Sub-urban Zone (5 - 10 km)",
    minDistance: 5,
    maxDistance: 10,
    fee: 80,
    isActive: true
  }
];

export const DEFAULT_ABOVE_MAX_FEE = 120;

/**
 * Calculates straight-line Haversine distance in KM between two lat/lng coordinates.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place (e.g. 2.4 km)
}

export interface DeliveryCalculationResult {
  fee: number;
  matchedZone: DeliveryZone | null;
  distanceKm: number;
  isAvailable: boolean;
  messageBn: string;
  messageEn: string;
  isFreeByThreshold: boolean;
}

/**
 * Calculates delivery fee based on customer distance (km), subtotal, and dynamic admin settings.
 */
export function calculateDeliveryFeeFromSettings(
  distanceKm: number,
  subtotal: number = 0,
  settings: any = null
): DeliveryCalculationResult {
  // Fetch active zones or defaults
  const rawZones = Array.isArray(settings?.deliveryZones) && settings.deliveryZones.length > 0
    ? settings.deliveryZones
    : DEFAULT_DELIVERY_ZONES;

  const activeZones: DeliveryZone[] = rawZones.filter((z: DeliveryZone) => z.isActive !== false);

  // Sort ascending by maxDistance
  activeZones.sort((a, b) => a.maxDistance - b.maxDistance);

  const aboveMaxFee = typeof settings?.aboveMaxDistanceFee === "number"
    ? settings.aboveMaxDistanceFee
    : DEFAULT_ABOVE_MAX_FEE;

  const unavailableAboveMax = !!settings?.deliveryUnavailableAboveMax;

  const freeThreshold = typeof settings?.freeDeliveryThreshold === "number"
    ? settings.freeDeliveryThreshold
    : 0;

  // Check if subtotal qualifies for free delivery rule
  if (freeThreshold > 0 && subtotal >= freeThreshold) {
    return {
      fee: 0,
      matchedZone: null,
      distanceKm,
      isAvailable: true,
      messageBn: `৳${freeThreshold} টাকার অধিক অর্ডারে ফ্রি ডেলিভারি!`,
      messageEn: `Free delivery on orders above ৳${freeThreshold}!`,
      isFreeByThreshold: true
    };
  }

  // Find matching zone: minDistance < distance <= maxDistance
  let matchedZone: DeliveryZone | null = null;
  for (const zone of activeZones) {
    if (distanceKm <= zone.maxDistance) {
      matchedZone = zone;
      break;
    }
  }

  if (matchedZone) {
    return {
      fee: Number(matchedZone.fee) || 0,
      matchedZone,
      distanceKm,
      isAvailable: true,
      messageBn: `${matchedZone.nameBn} (ডেলিভারি ফি: ৳${matchedZone.fee})`,
      messageEn: `${matchedZone.nameEn} (Delivery Fee: ৳${matchedZone.fee})`,
      isFreeByThreshold: false
    };
  }

  // Distance > highest zone maxDistance
  if (unavailableAboveMax) {
    return {
      fee: 0,
      matchedZone: null,
      distanceKm,
      isAvailable: false,
      messageBn: `অনুরোধকৃত দূরত্বে (${distanceKm} কিমি) ডেলিভারি সার্ভিস উপলব্ধ নয়।`,
      messageEn: `Delivery is unavailable for this distance (${distanceKm} km).`,
      isFreeByThreshold: false
    };
  }

  return {
    fee: aboveMaxFee,
    matchedZone: null,
    distanceKm,
    isAvailable: true,
    messageBn: `বিশেষ ডেলিভারি জোন (${distanceKm} কিমি, ফি: ৳${aboveMaxFee})`,
    messageEn: `Special Distance Zone (${distanceKm} km, Fee: ৳${aboveMaxFee})`,
    isFreeByThreshold: false
  };
}
