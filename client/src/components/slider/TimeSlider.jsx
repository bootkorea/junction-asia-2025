// src/components/slider/TimeSlider.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';

// ---- palette ----
const COLORS = {
  cyan_blue: '#09B8C7',
  navy_blue: '#17364F',
  dark_navy: '#0D1A2F',
  purple: '#411E3A',
  red: '#BD0927',
  white: '#FFFFFF',
  grayLine: 'rgba(255,255,255,0.25)',
  faint: 'rgba(255,255,255,0.08)',
};

const MARK_COLORS = {
  observed: COLORS.red,
  predicted: COLORS.cyan_blue,
  ai: COLORS.purple,
};

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px 2px ${COLORS.red}55, 0 0 0px 0px ${COLORS.red}33; }
  50% { box-shadow: 0 0 12px 4px ${COLORS.red}88, 0 0 20px 8px ${COLORS.red}33; }
`;

// ---- styled ----
const Wrap = styled.div`
  width: 100%;
  background: transparent;
  color: ${COLORS.white};
  user-select: none;
  -webkit-user-select: none;
  &:focus { outline: none; }
`;

const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 12px;
`;

const Title = styled.div`
  font-weight: 700;
  letter-spacing: .2px;
  font-size: clamp(15px, 1.7vw, 18px);
  opacity: .9;
  color: #e8f1f5;
`;

const Frame = styled.div`
  position: relative;
  background: rgba(13, 26, 47, 0.5);
  border: 1px solid ${COLORS.grayLine};
  border-radius: 16px;
  padding: 12px 12px 16px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
  overscroll-behavior: contain;
`;

const Track = styled.div`
  position: relative;
  height: 40px;
  display: flex; align-items: center;
  overscroll-behavior: contain;
  touch-action: none;  /* 모바일 제스처로 페이지 스크롤되는 것 방지 */
`;

const BaseLine = styled.div`
  position: absolute; left:0; right:0; height: 8px; border-radius: 8px;
  background: linear-gradient(90deg, ${COLORS.navy_blue}, ${COLORS.dark_navy});
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
  pointer-events: none; /* 트랙에 휠이 도달하도록 */
`;

const Tick = styled.div`
  position: absolute; top: -6px; transform: translateX(-50%);
  width: ${p => p.major ? '2px' : '1px'};
  background: ${p => p.major ? COLORS.grayLine : 'rgba(255,255,255,.18)'};
  height: ${p => p.major ? '28px' : '14px'};
  border-radius: 1px;
  pointer-events: none;
`;

const MarkBar = styled.div`
  position: absolute; top: -2px; bottom: 0; transform: translateX(-50%);
  width: ${p => p.thick ? '4px' : '3px'};
  border-radius: 2px;
  background: ${p => MARK_COLORS[p.kind] || COLORS.red};
  opacity: .8;
  box-shadow: 0 0 10px ${p => (MARK_COLORS[p.kind] || COLORS.red)}55;
  pointer-events: none;
`;

const HandleLine = styled.div`
  position: absolute; top: -14px; bottom: -14px;
  width: 2px; transform: translateX(-50%);
  background: linear-gradient(to bottom, ${COLORS.red}, transparent);
  opacity: .9;
  pointer-events: none;
`;

const HandleDot = styled.button`
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 20px; height: 20px; border-radius: 50%;
  background: ${COLORS.red};
  border: 3px solid ${COLORS.white};
  box-shadow: 0 0 10px 2px ${COLORS.red}77;
  cursor: grab; z-index: 3;
  transition: transform .2s ease;
  &:active {
    cursor: grabbing;
    transform: translate(-50%, -50%) scale(1.1);
    animation: ${pulseGlow} 1.5s infinite;
  }
`;

const ZoomBar = styled.div`
  position: absolute; right: 10px; top: 10px;
  display: flex; gap: 6px;
`;

const ZoomBtn = styled.button`
  width: 28px; height: 28px;
  border-radius: 6px;
  background: rgba(0,0,0,.35);
  border: 1px solid ${COLORS.grayLine};
  color: ${COLORS.white};
  font-weight: 700;
  cursor: pointer;
  &:hover { border-color: ${COLORS.cyan_blue}; }
`;

// ---- utils ----
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const toDate = (d) => d instanceof Date ? d : new Date(d);
const fmtH = (d) => {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  const mm = String(m).padStart(2, '0');
  return `${h}:${mm} ${ampm}`;
};
const fmtDayShort = (d) => d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();

// 스마트 눈금 간격 선택 (뷰 윈도 길이에 따라 자동 변경)
function pickTickStepMs(span) {
  const M = 60 * 1000, H = 60 * M, D = 24 * H, W = 7 * D;
  if (span <= 3 * H)   return 10 * M;
  if (span <= 6 * H)   return 30 * M;
  if (span <= 24 * H)  return 1 * H;
  if (span <= 3 * D)   return 6 * H;
  if (span <= 14 * D)  return 1 * D;
  if (span <= 8 * W)   return 1 * W;
  return 2 * W;
}

function alignFloor(date, stepMs) {
  const d = new Date(date);
  d.setMilliseconds(0);
  if (stepMs >= 1000) d.setSeconds(0);
  if (stepMs >= 60*1000) d.setMinutes(Math.floor(d.getMinutes() / (stepMs/60000)) * (stepMs/60000));
  if (stepMs >= 3600000) d.setMinutes(0);
  if (stepMs >= 24*3600000) d.setHours(0);
  return d;
}

function buildTicksSmart(vs, ve) {
  const span = ve - vs;
  const step = pickTickStepMs(span);
  const ticks = [];
  const t0 = alignFloor(vs, step).getTime();
  for (let t = t0; t <= ve.getTime(); t += step) {
    ticks.push(new Date(t));
  }
  return { ticks, step };
}

const normalizeMarks = (marks) =>
  (marks || [])
    .map(m => {
      if (!m) return null;
      if (m.at || m.time) {
        const d = toDate(m.at || m.time);
        return isNaN(d) ? null : { at: d, kind: m.kind || 'observed', label: m.label };
      }
      const d = toDate(m);
      return isNaN(d) ? null : { at: d, kind: 'observed' };
    })
    .filter(Boolean)
    .sort((a,b) => a.at - b.at);

export default function TimeSlider({
  start = new Date(Date.now() - 2 * 24 * 3600 * 1000),
  end   = new Date(Date.now() + 2 * 24 * 3600 * 1000),
  value,
  defaultValue,
  stepMinutes = 30,
  onChange,
  marks = [],
}) {
  const trackRef = useRef(null);
  const isDragging = useRef(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const [internal, setInternal] = useState(() => (defaultValue ? toDate(defaultValue) : new Date()));
  const current = value ? toDate(value) : internal;

  const s = useMemo(() => toDate(start), [start]);
  const e = useMemo(() => toDate(end),   [end]);
  const normalizedMarks = useMemo(() => normalizeMarks(marks), [marks]);

  // ▼ 뷰 윈도우 (줌 영역)
  const [viewStart, setViewStart] = useState(s);
  const [viewEnd, setViewEnd]     = useState(e);

  // start/end 바뀌면 전체 범위로 리셋
  useEffect(() => { setViewStart(s); setViewEnd(e); }, [s, e]);

  const viewSpan = viewEnd - viewStart;

  // 눈금(스마트)
  const { ticks } = useMemo(() => buildTicksSmart(viewStart, viewEnd), [viewStart, viewEnd]);

  // 퍼센트 변환은 **뷰 윈도우 기준**
  const getLeftPercent = useCallback((d) => {
    if (!viewSpan) return 0;
    return clamp((d - viewStart) / viewSpan, 0, 1) * 100;
  }, [viewStart, viewSpan]);

  // 트랙 좌표 → 시간 (뷰 윈도우 기준)
  const getDateFromClientX = useCallback((clientX) => {
    const el = trackRef.current;
    if (!el || !viewSpan) return viewStart;
    const rect = el.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const ms = viewStart.getTime() + ratio * viewSpan;
    const step = stepMinutes * 60 * 1000;
    const snapped = Math.round(ms / step) * step;
    return new Date(snapped);
  }, [viewStart, viewSpan, stepMinutes]);

  const updateValue = useCallback((d) => {
    const clampedDate = new Date(clamp(d.getTime(), s.getTime(), e.getTime()));
    if (onChange) onChange(clampedDate);
    if (!value) setInternal(clampedDate);
  }, [e, s, onChange, value]);

  // 핸들 드래그
  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      updateValue(getDateFromClientX(x));
      e.preventDefault();
    };
    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsInteracting(false);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [getDateFromClientX, updateValue]);

  const onTrackDown = (e) => {
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    updateValue(getDateFromClientX(x));
    isDragging.current = true;
    setIsInteracting(true);
  };

  // 줌 로직
  const MIN_STEPS_VISIBLE = 8; // 최소 n 스텝은 보이도록
  const MIN_SPAN_MS = Math.max(stepMinutes * 60 * 1000 * MIN_STEPS_VISIBLE, 5 * 60 * 1000);
  const MAX_SPAN_MS = e - s;

  const applyZoom = useCallback((factor, centerDate) => {
    const center = centerDate ? toDate(centerDate) : current;
    const centerMs = clamp(center.getTime(), s.getTime(), e.getTime());
    const newSpan = clamp((viewEnd - viewStart) / factor, MIN_SPAN_MS, MAX_SPAN_MS);
    let vs = new Date(centerMs - newSpan / 2);
    let ve = new Date(centerMs + newSpan / 2);

    if (vs < s) { vs = new Date(s); ve = new Date(s.getTime() + newSpan); }
    if (ve > e) { ve = new Date(e); vs = new Date(e.getTime() - newSpan); }

    setViewStart(vs); setViewEnd(ve);
  }, [current, e, s, viewEnd, viewStart, MIN_SPAN_MS, MAX_SPAN_MS]);

  const zoomIn  = useCallback((center) => applyZoom(1.25, center), [applyZoom]);
  const zoomOut = useCallback((center) => applyZoom(1/1.25, center), [applyZoom]);
  const zoomFit = useCallback(() => { setViewStart(s); setViewEnd(e); }, [s, e]);

  // 휠로 줌 (트랙 요소에 네이티브 wheel 리스너)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const handler = (e) => {
      // 브라우저 전체 확대(Ctrl+Wheel)는 무시
      if (e.ctrlKey) return;

      // 페이지 스크롤/제스처 막기
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const targetMs = viewStart.getTime() + ratio * (viewEnd - viewStart);

      if (e.deltaY < 0) zoomIn(new Date(targetMs));
      else              zoomOut(new Date(targetMs));
    };

    // capture:true 로 상위 스크롤이 처리되기 전에 우리가 먼저 잡음
    el.addEventListener('wheel', handler, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', handler, { capture: true });
  }, [viewStart, viewEnd, zoomIn, zoomOut]);

  const handleLeftPercent = getLeftPercent(current);

  return (
    <Wrap tabIndex={0}>
      <Header>
        <Title>Timeline Control</Title>
      </Header>

      <Frame>
        {/* Zoom controls */}
        <ZoomBar>
          <ZoomBtn onClick={()=>zoomOut()}>−</ZoomBtn>
          <ZoomBtn onClick={()=>zoomIn()}>＋</ZoomBtn>
          <ZoomBtn onClick={zoomFit}>⤢</ZoomBtn>
        </ZoomBar>

        <Track
          ref={trackRef}
          onMouseDown={onTrackDown}
          onTouchStart={onTrackDown}
        >
          <BaseLine />

          {/* 스마트 시간 눈금 (뷰 윈도우 기준) */}
          {ticks.map((t, i) => {
            const isMajor = t.getHours() === 0 || (viewSpan <= 6*3600*1000 && t.getMinutes() === 0);
            return (
              <Tick key={i} style={{ left: `${getLeftPercent(t)}%` }} major={isMajor} />
            );
          })}

          {/* 관측/예측 마크 (뷰 윈도우 안만 표시) */}
          {normalizedMarks.map((m, i) => {
            if (m.at < viewStart || m.at > viewEnd) return null;
            return (
              <MarkBar
                key={i}
                style={{ left: `${getLeftPercent(m.at)}%` }}
                kind={m.kind}
                title={m.label || ''}
                thick={m.kind === 'observed'}
              />
            );
          })}

          {/* 현재 선택 핸들 */}
          <HandleLine style={{ left: `${handleLeftPercent}%` }} />
          <TooltipLike
            leftPct={handleLeftPercent}
            show={isInteracting}
            label={`${fmtH(current)} – ${fmtDayShort(current)}`}
          />
          <HandleDot
            style={{ left: `${handleLeftPercent}%` }}
            onMouseDown={(e)=> { isDragging.current = true; setIsInteracting(true); e.stopPropagation(); }}
            onTouchStart={(e)=> { isDragging.current = true; setIsInteracting(true); e.stopPropagation(); }}
            onMouseOver={() => setIsInteracting(true)}
            onMouseLeave={() => { if(!isDragging.current) setIsInteracting(false); }}
            aria-label="time handle"
          />
        </Track>
      </Frame>
    </Wrap>
  );
}

/** 작은 내부 컴포넌트: 툴팁 */
function TooltipLike({ leftPct, show, label }) {
  return (
    <div
      style={{
        position: 'absolute',
        transform: 'translate(-50%, -150%)',
        left: `${leftPct}%`,
        background: COLORS.dark_navy,
        color: COLORS.white,
        fontSize: 13,
        fontWeight: 700,
        border: `1px solid ${COLORS.grayLine}`,
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 8px 20px rgba(0,0,0,.4)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        opacity: show ? 1 : 0,
        transition: 'opacity .15s ease',
      }}
    >
      {label}
      <span
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -9,
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: `8px solid ${COLORS.dark_navy}`,
        }}
      />
    </div>
  );
}
