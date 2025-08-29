export async function fetchDirections(payload) {
  const base = process.env.REACT_APP_API_BASE || 'http://192.168.0.220:4000';
  const r = await fetch(`${base}/services/directions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`directions failed: ${r.status}`);
  return r.json();
}

// /**
//  * ✅ 추가: 키워드(장소이름)로 검색하여 좌표를 가져옵니다.
//  * @param {string} query - 검색할 장소 이름
//  * @returns {Promise<{lat: number, lng: number, name: string} | null>} - 검색 결과 좌표 또는 null
//  */
// export async function fetchCoordsByKeyword(query) {
//   const encodedQuery = encodeURIComponent(query);
//   const r = await fetch(`${BASE}/services/search-keyword?query=${encodedQuery}`);
  
//   if (!r.ok) throw new Error(`search failed: ${r.status}`);
  
//   const json = await r.json();
  
//   // 검색 결과가 있고, 첫 번째 결과에 x, y 좌표가 있으면 반환
//   if (json.documents && json.documents.length > 0) {
//     const firstResult = json.documents[0];
//     return {
//       lat: parseFloat(firstResult.y),
//       lng: parseFloat(firstResult.x),
//       name: firstResult.place_name,
//     };
//   }
  
//   return null; // 검색 결과가 없으면 null 반환
// }