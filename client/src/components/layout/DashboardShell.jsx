import React, { useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

/* ---------- Layout Wrappers ---------- */
const Wrap = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 56px 1fr;
  grid-template-areas:
    "sidebar topbar"
    "sidebar main";
  height: 100vh;
  background: #0e1116; /* 배경 살짝 어두운 앱느낌 */
  color: #e9eef6;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: 56px 1fr;
    grid-template-areas:
      "topbar"
      "main";
  }
`;

const Sidebar = styled.aside`
  grid-area: sidebar;
  background: linear-gradient(180deg, #101722 0%, #0b1118 100%);
  border-right: 1px solid rgba(255,255,255,0.06);
  padding: 14px 10px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;

  @media (max-width: 768px) {
    display: ${({ $open }) => ($open ? "block" : "none")};
    position: fixed;
    top: 56px;
    left: 0;
    width: 86%;
    height: calc(100vh - 56px);
    z-index: 1000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    border-right: none;
    border-top: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    border-radius: 0 16px 16px 0;
  }
`;

const Topbar = styled.header`
  grid-area: topbar;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(6px);
  position: sticky;
  top: 0;
  z-index: 900;
`;

const Main = styled.main`
  grid-area: main;
  padding: 16px;
  overflow-y: auto;
`;

/* ---------- UI Bits ---------- */
const Brand = styled.div`
  font-weight: 800;
  letter-spacing: .5px;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GhostIconBtn = styled.button`
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  color: #e9eef6;
  padding: 6px 10px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;

  &:hover { background: rgba(255,255,255,0.06); }
`;

const NavGroupTitle = styled.div`
  font-size: 12px;
  opacity: .7;
  padding: 10px 12px;
`;

const NavItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin: 4px 8px;
  border-radius: 10px;
  color: #e9eef6;
  text-decoration: none;
  border: 1px solid transparent;

  &:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.08);
  }
`;

const Spacer = styled.div` flex: 1; `;

const Grid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(12, 1fr);

  /* 데스크탑 카드 배치 */
  & > section { grid-column: span 4; }

  /* 태블릿 */
  @media (max-width: 1024px) {
    & > section { grid-column: span 6; }
  }
  /* 모바일 */
  @media (max-width: 768px) {
    & > section { grid-column: span 12; }
  }
`;

const Card = styled.section`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 14px;

  h3 {
    font-size: 16px;
    margin-bottom: 8px;
    opacity: .92;
  }
  p {
    opacity: .8;
    line-height: 1.5;
    font-size: 14px;
  }
`;

/* ---------- Shell Component ---------- */
export default function DashboardShell({
  role = "User",
  sidebarContent,
  children,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Wrap>
      <Topbar>
        <GhostIconBtn onClick={() => setOpen(o => !o)} aria-label="Toggle menu">☰</GhostIconBtn>
        <Brand><span className="material-symbols-outlined md-red md-20">flare</span> FlareFlow <span style={{opacity:.6, fontWeight:600}}>{role}</span></Brand>
        <Spacer />
        <GhostIconBtn as={Link} to="/">홈</GhostIconBtn>
      </Topbar>

      <Sidebar $open={open}>
        {sidebarContent}
      </Sidebar>

      <Main>
        {typeof children === "function" ? children({ Grid, Card }) : children}
      </Main>
    </Wrap>
  );
}

/* 재사용 카드/그리드 export (선택) */
export { Grid, Card, NavItem, NavGroupTitle };
