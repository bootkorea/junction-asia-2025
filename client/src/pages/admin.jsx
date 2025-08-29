import React from "react";
import DashboardShell from "../components/layout/DashboardShell";
import MainDashboard from "../features/MainDashboard";

function Admin() {
  return (
    <DashboardShell role="Admin">
      {/* 메인 대시보드 삽입 */}
      <MainDashboard />
    </DashboardShell>
  );
}

export default Admin;
