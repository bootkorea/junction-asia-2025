import React from 'react';
import styled from 'styled-components';
import AdminFireMapPanel from '../components/map/AdminFireMapPanel.jsx';
import TimeSlider from '../components/slider/TimeSlider.jsx';

const Wrapper = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: 0 16px;
  padding: flex-start; /* 그대로 둠 */
`;

const Head = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px; color: #fff;
`;

const Title = styled.h2`
  font-size: 1.6rem; font-weight: 700; letter-spacing: 0.5px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr; /* 모바일: 1열 스택 */
  }
`;

const SquareCard = styled.div`
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 12px;
  margin-top: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  aspect-ratio: 1 / 1;

  @supports not (aspect-ratio: 1 / 1) {
    position: relative;
    &:before { content: ""; display: block; padding-top: 100%; }
    > .square-inner { position: absolute; inset: 12px; }
  }
`;

const SquareInner = styled.div`
  width: 100%; height: 100%;
  border-radius: 12px; overflow: hidden;
`;

const Panel = styled.div`
  display: flex; flex-direction: column; gap: 12px;
`;

const Card = styled.div`
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 16px;
  color: #e8f1f5;
`;

const CardTitle = styled.div`
  font-weight: 700; margin-bottom: 8px;
`;

/* ▼ 맨 바닥 타임슬라이더 영역만 추가 */
const Bottom = styled.div`
  margin-top: 20px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 16px;
`;

function MainDashboard() {
  return (
    <Wrapper>
      <Grid>
        <SquareCard>
          <SquareInner className="square-inner">
            <AdminFireMapPanel />
          </SquareInner>
        </SquareCard>

        <Panel>
          <Card>
            <CardTitle>실시간 이벤트</CardTitle>
            <div>최근 10분 내 3건의 변경 사항이 감지되었습니다.</div>
          </Card>

          <Card>
            <CardTitle>시스템 상태</CardTitle>
            <div>API 응답 지연: 정상</div>
            <div>데이터 동기화: 최신</div>
          </Card>

          <Card>
            <CardTitle>공지</CardTitle>
            <div>8/23 13:00 KST — 데이터 소스 점검 예정</div>
          </Card>
        </Panel>
      </Grid>

      {/* ▼ 맨 바닥 TimeSlider */}
      <Bottom>
        <TimeSlider />
        {/*
          필요하면 제어형으로:
          <TimeSlider value={selectedTime} onChange={setSelectedTime} />
        */}
      </Bottom>
    </Wrapper>
  );
}

export default MainDashboard;
