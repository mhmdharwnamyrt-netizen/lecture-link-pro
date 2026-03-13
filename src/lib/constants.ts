// BSUT GPS coordinates (Beni Suef Technological University)
export const UNIVERSITY_COORDS = {
  latitude: 29.0661,
  longitude: 31.0994,
};

export const MAX_DISTANCE_METERS = 400;

// Haversine formula
function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function getDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function checkWithinUniversity(lat: number, lon: number): { within: boolean; distance: number } {
  const distance = getDistanceMeters(lat, lon, UNIVERSITY_COORDS.latitude, UNIVERSITY_COORDS.longitude);
  return { within: distance <= MAX_DISTANCE_METERS, distance: Math.round(distance) };
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });
  });
}

export const DEPARTMENTS = [
  'Information Technology',
  'Mechatronics',
  'Electronics',
  'Renewable Energy',
  'Industrial Process Control',
  'Refrigeration & Air Conditioning',
  'Railway',
  'Marketing',
] as const;

export const LEVELS = [1, 2, 3, 4] as const;

export const LECTURE_HALLS = Array.from({ length: 31 }, (_, i) => 100 + i); // 100-130
export const SECTION_HALLS = Array.from({ length: 51 }, (_, i) => 150 + i); // 150-200

export const EXCUSE_REASONS = [
  'Medical - Illness',
  'Medical - Hospital Visit',
  'Family Emergency',
  'Travel',
  'Official University Event',
  'Military Service',
  'Other',
] as const;

export const ACADEMIC_TITLES = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
  'Teaching Assistant',
] as const;

// University secret key for doctor registration verification
export const DOCTOR_SECRET_KEY = 'BSUT2024';
