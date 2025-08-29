import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import MainDashboard from '../features/MainDashboard';

const Container = styled.div`
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  height: 100vh; width: 100%;
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  color: white;
`;

const Title = styled.h1`
  font-size: 3rem; font-weight: 700; margin-bottom: 40px; letter-spacing: 2px;
`;

const ButtonWrapper = styled.div` display: flex; gap: 20px; `;

const RoleButton = styled.button`
  background-color: rgba(255, 255, 255, 0.1);
  color: white; font-size: 1.2rem; font-weight: 600;
  padding: 15px 30px; border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px; cursor: pointer; transition: all 0.3s ease;
  &:hover { background-color: rgba(255, 255, 255, 0.25); transform: translateY(-3px); }
`;

function Main() {
  const navigate = useNavigate();
  return (
    <Container>
      <Title>🚀 FlareFlow</Title>
      <ButtonWrapper>
        <RoleButton onClick={() => navigate('/user')}>사용자</RoleButton>
        <RoleButton onClick={() => navigate('/admin')}>관리자</RoleButton>
      </ButtonWrapper>
    </Container>
  );
}

export default Main;