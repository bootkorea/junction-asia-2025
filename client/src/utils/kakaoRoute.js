// client/src/utils/kakaoRoute.js
export function vertexesToPath(kakao, vertexes) {
  const path = [];
  for (let i = 0; i < vertexes.length; i += 2) {
    const x = vertexes[i];       // lng
    const y = vertexes[i + 1];   // lat
    path.push(new kakao.maps.LatLng(y, x));
  }
  return path;
}

export function buildPolylineFromRoutes(kakao, map, routes, opts = {}) {
  const lines = [];
  const bounds = new kakao.maps.LatLngBounds();

  // 일반적으로 routes[0]에 주 경로가 들어옵니다.
  routes?.[0]?.sections?.forEach(section => {
    section.roads?.forEach(road => {
      const path = vertexesToPath(kakao, road.vertexes);
      path.forEach(latlng => bounds.extend(latlng));
      const polyline = new kakao.maps.Polyline({
        path,
        strokeWeight: opts.strokeWeight ?? 6,
        strokeColor:  opts.strokeColor  ?? '#BD0927',
        strokeOpacity:opts.strokeOpacity?? 0.95,
        strokeStyle:  opts.strokeStyle  ?? 'solid',
      });
      polyline.setMap(map);
      lines.push(polyline);
    });
  });

  if (!bounds.isEmpty()) map.setBounds(bounds);
  return lines;
}
