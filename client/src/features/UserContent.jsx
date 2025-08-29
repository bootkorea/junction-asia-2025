// src/pages/UserContent.jsx

import React from 'react';
import styled from 'styled-components';
import UserFireMapPanel from '../components/map/UserFireMapPanel.jsx';
// TimeSlider is no longer needed here

const Wrapper = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto; // Center the content
  padding: 0 16px;
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
    grid-template-columns: 1fr;
  }
`;

// This now wraps the UserFireMapPanel, which contains both map and slider
const MapPanelContainer = styled.div`
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  
  /* Make it span both columns in the grid */
  grid-column: 1 / -1; 
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

function UserContent() {
  return (
    <Wrapper>
      {/* The Grid can be simplified or changed as the main panel is now self-contained */}
      <Grid>
        {/* The map and slider are now together inside UserFireMapPanel */}
        <MapPanelContainer>
            <UserFireMapPanel />
        </MapPanelContainer>
      </Grid>
    </Wrapper>
  );
}

export default UserContent;