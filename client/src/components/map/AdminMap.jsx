  // src/components/map/AdminMap.jsx
  import React, { useEffect, useRef, useState } from 'react';
  import styled from 'styled-components';
  import KakaoMapWithZoomInfo from './AdminMapLevel';

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

  function AdminMap({
    fires = [],
    fitOnUpdate = false,
    center = { lat: 36, lng: 128 },
    level = 7,
    onRectClick,
  }) {
    const hostRef   = useRef(null);          // 컨테이너 관찰 용
    const mapDivRef = useRef(null);
    const mapRef    = useRef(null);
    const rectsRef  = useRef(new Map());
    const [mapReady, setMapReady] = useState(false);

    // 지도 초기화
    useEffect(() => {
      if (!mapDivRef.current) return;

      const boot = () => {
        const { kakao } = window;
        if (!kakao?.maps) {
          console.error('[AdminMap] Kakao SDK not ready');
          return;
        }
        const map = new kakao.maps.Map(mapDivRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level,
        });
        mapRef.current = map;
        setMapReady(true);
        console.info('[AdminMap] map ready');

        // 초기 레이아웃 안정 후 한 번 resize
        setTimeout(() => kakao.maps.event.trigger(map, 'resize'), 0);
      };

      if (window.kakao?.maps?.load) window.kakao.maps.load(boot);
      else boot();

      return () => {
        rectsRef.current.forEach(r => r.setMap(null));
        rectsRef.current.clear();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 컨테이너 크기 변동 관찰 → 카카오맵 resize 트리거
    useEffect(() => {
      if (!hostRef.current || !mapRef.current || !window.kakao?.maps) return;
      const ro = new ResizeObserver(() => {
        const map = mapRef.current;
        if (map) window.kakao.maps.event.trigger(map, 'resize');
      });
      ro.observe(hostRef.current);
      return () => ro.disconnect();
    }, [mapReady]);

    // fires 반영 (지도 준비된 뒤에만)
    useEffect(() => {
      const map = mapRef.current;
      const { kakao } = window;
      if (!mapReady || !map || !kakao?.maps) return;

      const allBounds = new kakao.maps.LatLngBounds();
      const incomingIds = new Set();

      console.log('AdminMap received fires:', fires);

      fires.forEach(item => {
        if (!item?.coords?.a || !item?.coords?.b) return;
        const id = String(item.id);
        incomingIds.add(id);

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
          });
          rect.setMap(map);
          rectsRef.current.set(id, rect);

          kakao.maps.event.addListener(rect, 'click', () => {
            if (onRectClick) onRectClick(item);
            else {
              alert(`[FIRE] ${item.meta?.fire_id ?? id}\n` +
                    `type=${item.severity}\n` +
                    `time=${item.start_at}`);
            }
          });
        } else {
          rect.setBounds(bounds);
          rect.setOptions({
            strokeColor: style.strokeColor,
            strokeStyle: style.strokeStyle,
            fillColor: style.fillColor,
            fillOpacity: style.fillOpacity,
          });
        }
      });

      // 삭제된 아이디 정리
      rectsRef.current.forEach((rect, id) => {
        if (!incomingIds.has(id)) {
          rect.setMap(null);
          rectsRef.current.delete(id);
        }
      });

      // 화면 맞춤 + 리사이즈 트리거
      if (fitOnUpdate && !allBounds.isEmpty()) {
        map.setBounds(allBounds);
        setTimeout(() => kakao.maps.event.trigger(map, 'resize'), 0);
      }

      console.info('[AdminMap] rectangles updated:', fires.length);
    }, [fires, fitOnUpdate, onRectClick, mapReady]);

    return (
      <Container ref={hostRef}>
        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
        {mapRef.current && <KakaoMapWithZoomInfo map={mapRef.current} />}
      </Container>
    );
  }

  export default AdminMap;
