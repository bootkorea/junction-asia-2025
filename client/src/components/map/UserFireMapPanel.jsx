// src/components/map/UserFireMapPanel.jsx

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import UserMap from './UserMap.jsx';
import AlertModal from '../modal/AlertModal.jsx';
import TimeSlider from '../slider/TimeSlider.jsx';
import { sendDict, toRects } from '../../services/firePredictionService.js';
import { getDistance } from '../../utils/geo.js';
import { fetchDirections } from '../../services/directions';
// import { fetchCoordsByKeyword } from '../../services/directions';

const ALERT_RADIUS_KM = 10;

const PanelWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  gap: 12px;
`;

export default function UserFireMapPanel() {
  const [rows, setRows] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [alertShown, setAlertShown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [routeData, setRouteData] = useState(null);

  const [selectedTime, setSelectedTime] = useState(new Date());

  const [destinationQuery, setDestinationQuery] = useState('강남역');

  // 1) 데이터 로드
  useEffect(() => {
    sendDict({})
      .then(setRows)
      .catch(e => console.error('[FireMapPanel] API data load error:', e));
  }, []);

  // 2) 사용자 위치
  useEffect(() => {
    console.log('⚠️ 테스트 모드: 사용자 위치를 F001 산불 근처로 강제 설정');
    setUserLocation({ lat: 36.995, lng: 129.405 });

    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error('Error getting user location:', err)
    );
  }, []);

  // 3) 타임레인지 (rows에서 안전하게 추출)
  const timeRange = useMemo(() => {
    const candidates = (rows || []).map(r => {
        // "YYYY-MM-DD HH:MM:SS" 형식을 new Date()가 인식할 수 있게 변경
        const timestampStr = r.timestamp?.replace(' ', 'T');
        return new Date(timestampStr);
    }).filter(d => !isNaN(d));

    if (!candidates.length) {
      const now = Date.now();
      return { start: new Date(now - 24*3600*1000), end: new Date(now + 24*3600*1000) };
    }
    const min = new Date(Math.min(...candidates));
    const max = new Date(Math.max(...candidates));
    return { start: min, end: max };
  }, [rows]);

  // ‘표시용’ 범위를 최소 24시간으로 확장
  const displayRange = useMemo(() => {
    let { start, end } = timeRange;
    // 데이터가 없으면 현재 시간 기준으로 기본 6시간 범위를 보여줌
    if (!start || !end) {
      const now = Date.now();
      return { start: new Date(now - 3 * 3600 * 1000), end: new Date(now + 3 * 3600 * 1000) };
    }
  
    // 데이터 앞뒤로 1시간씩 여백(padding)을 추가합니다. (원하면 이 값을 조절)
    const PADDING_MS = 1 * 3600 * 1000; // 1시간
    const paddedStart = new Date(start.getTime() - PADDING_MS);
    const paddedEnd = new Date(end.getTime() + PADDING_MS);
  
    return { start: paddedStart, end: paddedEnd };
  }, [timeRange]);


  // 5) 관측(Observed) 시점 마크 만들기
  const observedMarks = useMemo(() => {
    return (rows || [])
      .filter(r => r.data_type === 'observed')
      .map(r => {
        const timestampStr = r.timestamp?.replace(' ', 'T');
        const at = new Date(timestampStr);
        return { at, kind: 'observed', label: r.fire_id };
      })
      .filter(m => !isNaN(m.at));
  }, [rows]);

  // 6) 슬라이더 시각에 맞춰 사각형 계산
  const fires = useMemo(() => toRects(rows, {
    time: selectedTime,
    mode: 'snapshot',
    includeTypes: ['observed', 'predicted']
  }), [rows, selectedTime]);

  // 7) 알림 & 로딩 해제
  useEffect(() => {
    if (fires.length > 0 && userLocation && !alertShown) {
      const nearby = fires.filter(fire => {
        const c = fire.coords.center; // center 좌표 사용
        return getDistance(userLocation, c) <= ALERT_RADIUS_KM;
      });
      if (nearby.length > 0) {
        setModalMessage(`현재 위치 ${ALERT_RADIUS_KM}km 내에 ${nearby.length}건의 산불(관측/예측) 정보가 있습니다.`);
        setIsModalOpen(true);
        setAlertShown(true);
      }
    }
    if (userLocation) setIsLoading(false);
  }, [fires, userLocation, alertShown]);

  // 8) 길찾기
  async function handleFindRoute() {
    if (!userLocation) return;
    const origin = { x: userLocation.lng, y: userLocation.lat, name: '내 위치' };
    const destination = { x: 127.027621, y: 37.497942, name: '강남역' };

    const payload = {
      origin,
      destination,
      priority: 'RECOMMEND',
      alternatives: false,
      road_details: false,
      summary: false,
    };
    try {
      const data = await fetchDirections(payload);
      setRouteData(data);
    } catch (e) {
      console.error(e);
      alert('길찾기 실패');
    }
  }

// // ✅ 수정: 길찾기 로직 변경
// async function handleFindRoute() {
//   if (!userLocation) {
//     alert('사용자 위치를 먼저 확인해주세요.');
//     return;
//   }
//   if (!destinationQuery.trim()) {
//     alert('목적지를 입력해주세요.');
//     return;
//   }

//   try {
//     // 1. 입력된 검색어로 좌표를 먼저 찾습니다.
//     const destinationCoords = await fetchCoordsByKeyword(destinationQuery);
    
//     if (!destinationCoords) {
//       alert(`'${destinationQuery}'에 대한 검색 결과를 찾을 수 없습니다.`);
//       return;
//     }
    
//     // 2. 찾은 좌표로 길찾기를 요청합니다.
//     const origin = { x: userLocation.lng, y: userLocation.lat, name: '내 위치' };
//     const destination = { x: destinationCoords.lng, y: destinationCoords.lat, name: destinationCoords.name };

//     const payload = {
//       origin,
//       destination,
//       priority: 'RECOMMEND',
//       alternatives: false,
//       road_details: false,
//       summary: false,
//     };

//     const data = await fetchDirections(payload);
//     setRouteData(data);

//   } catch (e) {
//     console.error(e);
//     alert('길찾기 중 오류가 발생했습니다.');
//   }
// }




  if (isLoading) return <div>사용자 위치와 산불 정보를 불러오는 중입니다...</div>;

 return (
    <>
      <PanelWrapper>
        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
          <button onClick={handleFindRoute}>🚗 강남역까지 길찾기</button>
        </div>

        <UserMap
          fires={fires}
          fitOnUpdate={true} // ✅ 이 옵션을 추가하여 자동 줌 기능 활성화
          center={userLocation}
          level={10}
          userLocation={userLocation}
          routeData={routeData}
        />

        <TimeSlider
          start={displayRange.start}
          end={displayRange.end}
          value={selectedTime}
          onChange={setSelectedTime}
          stepMinutes={5}
          marks={observedMarks}
          segmentUnit="minute"
          segmentStep={10}
        />
      </PanelWrapper>

      <AlertModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="🔥 주변 산불 경보"
        message={modalMessage}
      />
    </>
  );
}