// src/utils/geo.js

/**
 * 두 GPS 좌표 간의 거리를 Haversine 공식을 사용해 km 단위로 반환합니다.
 * @param {{lat: number, lng: number}} pos1
 * @param {{lat: number, lng: number}} pos2
 * @returns {number} km 단위 거리
 */
export function getDistance(pos1, pos2) {
  if (!pos1 || !pos2) return Infinity;

  const R = 6371; // 지구 반지름 (km)
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLon = toRad(pos2.lng - pos1.lng);
  const lat1 = toRad(pos1.lat);
  const lat2 = toRad(pos2.lat);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value) {
  return value * Math.PI / 180;
}