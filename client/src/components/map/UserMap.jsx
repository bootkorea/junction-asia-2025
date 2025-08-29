import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { COLORS } from '../../styles/colors';
import { buildPolylineFromRoutes } from '../../utils/kakaoRoute';

const Container = styled.div`
  width: 100%;
  height: 100%;
  min-height: 400px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255,255,255,0.04);
`;

const STYLE_BY_KIND = {
  observed:  { strokeColor:'#BD0927', fillColor:'#BD0927', fillOpacity:0.32, strokeStyle:'solid' },
  predicted: { strokeColor:'#09B8C7', fillColor:'#09B8C7', fillOpacity:0.18, strokeStyle:'shortdash' },
  high:      { strokeColor:'#BD0927', fillColor:'#BD0927', fillOpacity:0.32, strokeStyle:'solid' },
  medium:    { strokeColor:'#09B8C7', fillColor:'#09B8C7', fillOpacity:0.22, strokeStyle:'shortdash' },
  low:       { strokeColor:'#411E3A', fillColor:'#411E3A', fillOpacity:0.18, strokeStyle:'shortdot' },
};

function UserMap({
  fires = [],
  fitOnUpdate = false,
  center = { lat: 36, lng: 128 },
  level = 7,
  onRectClick,
  userLocation,
  routeData,     // ✅ 추가
}) {
  const hostRef         = useRef(null);
  const mapDivRef       = useRef(null);
  const mapRef          = useRef(null);
  const rectsRef        = useRef(new Map());

  const drawingMgrRef   = useRef(null);
  const userMarkerRef   = useRef(null);
  const userOverlayRef  = useRef(null);

  const polylinesRef    = useRef([]);      // ✅ 경로 폴리라인

  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapDivRef.current) return;

    const boot = () => {
      const { kakao } = window;
      if (!kakao?.maps) {
        console.error('[UserMap] Kakao SDK not ready');
        return;
      }
      const map = new kakao.maps.Map(mapDivRef.current, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level,
      });
      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => kakao.maps.event.trigger(map, 'resize'), 0);
    };

    if (window.kakao?.maps?.load) window.kakao.maps.load(boot);
    else boot();

    return () => {
      rectsRef.current.forEach(r => r.setMap(null));
      rectsRef.current.clear();

      if (drawingMgrRef.current) {
        try { drawingMgrRef.current.cancel(); } catch {}
        drawingMgrRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (userOverlayRef.current?.setMap) {
        userOverlayRef.current.setMap(null);
        userOverlayRef.current = null;
      }
      // ✅ 폴리라인 정리
      polylinesRef.current.forEach(pl => pl.setMap(null));
      polylinesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hostRef.current || !mapRef.current || !window.kakao?.maps) return;
    const ro = new ResizeObserver(() => {
      window.kakao.maps.event.trigger(mapRef.current, 'resize');
    });
    ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, [mapReady]);

  // 내 위치
  useEffect(() => {
    const { kakao } = window;
    const map = mapRef.current;
    if (!mapReady || !map || !userLocation) return;

    const pos = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    const hasDrawing = !!(kakao?.maps?.drawing?.DrawingManager);

    if (hasDrawing) {
      if (!drawingMgrRef.current) {
        drawingMgrRef.current = new kakao.maps.drawing.DrawingManager({
          map,
          drawingMode: [kakao.maps.drawing.OverlayType.MARKER],
          markerOptions: {
            draggable: false,
            removable: false,
            zIndex: 100000,
            markerImage: new kakao.maps.MarkerImage(
              `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${COLORS.red}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10z"/>
                  <circle cx="12" cy="11" r="2.5" fill="white"/>
                </svg>
              `)}`,
              new kakao.maps.Size(28, 28),
              { offset: new kakao.maps.Point(14, 28) }
            ),
          },
        });
      }
      try { drawingMgrRef.current.cancel(); } catch {}
      drawingMgrRef.current.put(
        kakao.maps.drawing.OverlayType.MARKER,
        [{ x: userLocation.lng, y: userLocation.lat }]
      );
      const ov = drawingMgrRef.current.getOverlays();
      userOverlayRef.current = Array.isArray(ov?.marker) ? ov.marker.at(-1) : null;
      if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null; }
    } else {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new kakao.maps.Marker({ position: pos, map, zIndex: 100000 });
        const markerImage = new kakao.maps.MarkerImage(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${COLORS.red}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10z"/>
              <circle cx="12" cy="11" r="2.5" fill="white"/>
            </svg>
          `)}`,
          new kakao.maps.Size(28, 28),
          { offset: new kakao.maps.Point(14, 28) }
        );
        userMarkerRef.current.setImage(markerImage);
      } else {
        userMarkerRef.current.setPosition(pos);
        userMarkerRef.current.setZIndex(100000);
      }
    }
  }, [userLocation, mapReady]);

  // 사각형
  useEffect(() => {
    const { kakao } = window;
    const map = mapRef.current;
    if (!mapReady || !map || !kakao?.maps) return;

    const allBounds = new kakao.maps.LatLngBounds();
    const incoming = new Set();

    fires.forEach(item => {
      if (!item?.coords?.a || !item?.coords?.b) return;
      const id = String(item.id);
      incoming.add(id);

      const a = item.coords.a, b = item.coords.b;
      const sw = new kakao.maps.LatLng(Math.min(a.lat, b.lat), Math.min(a.lng, b.lng));
      const ne = new kakao.maps.LatLng(Math.max(a.lat, b.lat), Math.max(a.lng, b.lng));
      const bounds = new kakao.maps.LatLngBounds(sw, ne);
      allBounds.extend(sw); allBounds.extend(ne);

      const key = (item.severity || 'observed').toLowerCase();
      const style = STYLE_BY_KIND[key] || STYLE_BY_KIND.observed;

      let rect = rectsRef.current.get(id);
      if (!rect) {
        rect = new kakao.maps.Rectangle({
          bounds,
          strokeWeight: 2,
          strokeColor: style.strokeColor,
          strokeOpacity: 0.95,
          strokeStyle: style.strokeStyle,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity,
          zIndex: 10,
        });
        rect.setMap(map);
        rectsRef.current.set(id, rect);
        kakao.maps.event.addListener(rect, 'click', () => onRectClick && onRectClick(item));
      } else {
        rect.setBounds(bounds);
        rect.setOptions({
          strokeColor: style.strokeColor,
          strokeStyle: style.strokeStyle,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity,
          strokeWeight: 2,
          strokeOpacity: 0.95,
          zIndex: 10,
        });
      }
    });

    rectsRef.current.forEach((rect, id) => {
      if (!incoming.has(id)) {
        rect.setMap(null);
        rectsRef.current.delete(id);
      }
    });

    if (fitOnUpdate && !allBounds.isEmpty()) {
      map.setBounds(allBounds);
      setTimeout(() => kakao.maps.event.trigger(map, 'resize'), 0);
    }

    if (userMarkerRef.current) userMarkerRef.current.setZIndex(100000);
    if (userOverlayRef.current?.setZIndex) userOverlayRef.current.setZIndex(100000);
  }, [fires, fitOnUpdate, onRectClick, mapReady]);

  // ✅ 경로(폴리라인) 렌더링
  useEffect(() => {
    const { kakao } = window;
    const map = mapRef.current;
    if (!mapReady || !map) return;

    // 기존 라인 제거
    polylinesRef.current.forEach(pl => pl.setMap(null));
    polylinesRef.current = [];

    if (!routeData?.routes?.length) return;

    const newLines = buildPolylineFromRoutes(kakao, map, routeData.routes, {
      strokeColor: '#BD0927',
      strokeWeight: 6,
      strokeOpacity: 0.95,
    });
    polylinesRef.current = newLines;
  }, [routeData, mapReady]);

  return (
    <Container ref={hostRef}>
      <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
    </Container>
  );
}

export default UserMap;
