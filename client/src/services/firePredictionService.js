/// src/services/firePredictionService.js

import proj4 from 'proj4';

// API 요청을 보낼지, 목업 데이터를 사용할지 결정하는 스위치
const USE_MOCK_DATA = false;

// API 요청을 보낼 실제 외부 서버의 주소
const BASE = 'http://72.155.72.202:8000';

// --- 좌표 변환 설정 ---
// ✅ 1. 소스 좌표계를 EPSG:5181로 변경
const sourceProjection = 'EPSG:5181';
const destProjection = 'EPSG:5181'; // WGS84 (일반적인 위도/경도)

// ✅ 2. EPSG:5181에 맞는 좌표계 정의로 수정 (Korea 2000 / Central Belt)
proj4.defs(sourceProjection, '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');

/**
 * EPSG:5181 좌표를 위도/경도로 변환하는 헬퍼 함수
 * @param {object} row - 서버에서 받은 원본 데이터 행
 * @returns {object} - 위도/경도가 변환된 데이터 행
 */
function convertRowCoordinates(row) {
  try {
    //const [lngMin, latMin] = proj4(sourceProjection, destProjection, [row.longitude_min, row.latitude_min]);
    //const [lngMax, latMax] = proj4(sourceProjection, destProjection, [row.longitude_max, row.latitude_max]);

    const latMin = row.latitude_min;
    const latMax = row.latitude_max;
    const lngMin = row.longitude_min;
    const lngMax = row.longitude_max;

    return {
      ...row,
      latMin: latMin,
      latMax: latMax,
      lngMin: lngMin,
      lngMax: lngMax,
    };
  } catch (error) {
    console.error('좌표 변환 실패:', row, error);
    return null; // 변환 실패 시 해당 데이터를 제외하기 위해 null 반환
  }
}

/**
 * 외부 서버로 산불 관련 데이터를 보내고 예측 결과를 받습니다.
 */
export async function sendDict(payload, { baseUrl = BASE } = {}) {
  if (USE_MOCK_DATA) {
    console.log("🔥 Using Mock Fire Data for Testing 🔥");
    return Promise.resolve([]);
  }

  const res = await fetch(`${baseUrl}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || json.status !== 'success') {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  const rawData = json.data ?? [];
  const processedData = rawData
    .map(convertRowCoordinates) // 좌표 변환 적용
    .filter(Boolean); // 변환에 실패한 데이터(null) 제거

  return processedData;
}

/**
 * Row 데이터를 지도에 표시할 사각형(Rect) 데이터로 변환합니다.
 */
export function toRects(rows, {
  time = new Date(),
  mode = 'snapshot',
  includeTypes = ['observed', 'predicted'],
  prefer = 'predicted',
} = {}) {
  const filtered = rows.filter(r => {
      const timestampStr = r.timestamp.replace(' ', 'T');
      return includeTypes.includes(r.data_type) && new Date(timestampStr) <= time;
  });

  if (mode === 'cumulative') {
    return filtered.map(rowToRect);
  }

  const byId = new Map();
  for (const r of filtered) {
    const prev = byId.get(r.fire_id);
    const rTimestamp = new Date(r.timestamp.replace(' ', 'T'));
    
    if (!prev || rTimestamp > new Date(prev.timestamp.replace(' ', 'T'))) {
      byId.set(r.fire_id, r);
    } else if (rTimestamp.getTime() === new Date(prev.timestamp.replace(' ', 'T')).getTime()) {
      if (prefer === 'predicted' && r.data_type === 'predicted') {
        byId.set(r.fire_id, r);
      } else if (prefer === 'observed' && r.data_type === 'observed') {
        byId.set(r.fire_id, r);
      }
    }
  }
  return Array.from(byId.values()).map(rowToRect);
}

/**
 * 단일 Row를 Rect 형식으로 변환하는 헬퍼 함수입니다.
 */
function rowToRect(r) {
  const timestamp = new Date(r.timestamp.replace(' ', 'T'));
  const id = `${r.fire_id}-${r.data_type}-${timestamp.toISOString()}`;
  return {
    id,
    kind: r.data_type,
    severity: r.data_type,
    start_at: timestamp.toISOString(),
    coords: {
      a: { lat: Math.min(r.latMin, r.latMax), lng: Math.min(r.lngMin, r.lngMax) }, // 남서(SW) 좌표
      b: { lat: Math.max(r.latMin, r.latMax), lng: Math.max(r.lngMin, r.lngMax) }, // 북동(NE) 좌표
      center: { lat: (r.latMin + r.latMax) / 2, lng: (r.lngMin + r.lngMax) / 2 }
    },
    meta: { fire_id: r.fire_id, data_type: r.data_type }
  };
}