// server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 헬퍼 함수
function num(n) { return n == null ? NaN : (typeof n === 'number' ? n : parseFloat(String(n).replace(',', '.'))); }
function toDate(v) { const d = new Date(v); return isNaN(+d) ? null : d; }

dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
}));
app.use(express.json({ limit: '1mb' }));

const REST_KEY = process.env.KAKAO_REST_KEY;
if (!REST_KEY) {
  console.error('[ERR] KAKAO_REST_KEY not set in .env');
  process.exit(1);
}


// // ✅ 추가: 키워드로 장소를 검색하는 API 프록시
// app.get('/services/search-keyword', async (req, res) => {
//   try {
//     const { query } = req.query;
//     if (!query) {
//       return res.status(400).json({ message: 'query parameter is required' });
//     }
    
//     // URL 인코딩
//     const encodedQuery = encodeURIComponent(query);
    
//     const r = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodedQuery}`, {
//       method: 'GET',
//       headers: {
//         'Authorization': `KakaoAK ${REST_KEY}`,
//       },
//     });

//     const data = await r.json();
//     if (!r.ok) return res.status(r.status).json(data);
//     res.json(data);

//   } catch (err) {
//     console.error('[search-keyword proxy error]', err);
//     res.status(500).json({ message: 'proxy error', error: String(err) });
//   }
// });


/**
 * 카카오모빌리티 길찾기 API를 프록시하는 엔드포인트입니다.
 * 이 기능은 계속 이 서버에서 담당합니다.
 */
app.post('/services/directions', async (req, res) => {
  try {
    const r = await fetch('https://apis-navi.kakaomobility.com/v1/waypoints/directions', {
      method: 'POST',
      headers: {
        'Authorization': `KakaoAK ${REST_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (err) {
    console.error('[proxy error]', err);
    res.status(500).json({ message: 'proxy error', error: String(err) });
  }
});

/**
 * ⚠️ 참고: 이 엔드포인트는 더 이상 프론트엔드에서 직접 호출하지 않습니다.
 * 프론트엔드의 `sendDict` 함수가 외부 서버(72.155.72.202:8000)를 직접 호출하도록
 * 변경되었기 때문에, 이 로직은 현재 사용되지 않는 상태입니다.
 */
app.post('/services/infer/dict', async (req, res) => {
  try {
    const payload = req.body;
    const list = Array.isArray(payload) ? payload
      : Array.isArray(payload?.items) ? payload.items
        : [payload];

    const rows = [];
    for (const it of list) {
      const fire_id = it.fire_id;
      const ts = toDate(it.timestamp);
      const type = String(it.data_type || '').toLowerCase();
      const latMin = num(it.latitude_min);
      const latMax = num(it.latitude_max);
      const lngMin = num(it.longitude_min);
      const lngMax = num(it.longitude_max);

      if (!fire_id || !ts || ![latMin, latMax, lngMin, lngMax].every(isFinite)) continue;

      rows.push({
        fire_id,
        timestamp: ts,
        data_type: type,
        latMin: Math.min(latMin, latMax),
        latMax: Math.max(latMin, latMax),
        lngMin: Math.min(lngMin, lngMax),
        lngMax: Math.max(lngMin, lngMax),
      });
    }

    return res.json({ ok: true, rows: rows, rowsCount: rows.length });

  } catch (e) {
    console.error('[infer/dict error]', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`[server] http://localhost:${port}`);
});