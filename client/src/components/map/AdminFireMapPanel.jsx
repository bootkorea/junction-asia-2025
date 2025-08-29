// src/components/map/AdminFireMapPanel.jsx

import React, { useEffect, useMemo, useState } from 'react';
import AdminMap from './AdminMap.jsx';
// ⛔️ 변경 전
// import { loadCSV, toRects } from '../../services/firePredictionService.js';
// ✅ 변경 후: loadCSV 대신 sendDict를 import 합니다.
import { sendDict, toRects } from '../../services/firePredictionService.js';

export default function AdminFireMapPanel({
  time = new Date(),
  mode = 'cumulative',
  includeTypes = ['observed','predicted'],
  fitOnUpdate = true,
}) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // ⛔️ 변경 전
        // const r = await loadCSV();

        // ✅ 변경 후: sendDict 함수를 호출하여 API로부터 데이터를 가져옵니다.
        const r = await sendDict({});
        
        if (mounted) setRows(r);
      } catch (e) {
        // 에러 메시지도 함께 수정해주는 것이 좋습니다.
        console.error('[AdminFireMapPanel] API data load error:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fires = useMemo(
    () => toRects(rows, { time, mode, includeTypes, prefer: 'predicted' }),
    [rows, time, mode, includeTypes]
  );

  return <AdminMap fires={fires} fitOnUpdate={fitOnUpdate} />;
}