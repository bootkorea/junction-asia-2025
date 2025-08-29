import React from "react";
import DashboardShell from "../components/layout/DashboardShell";
import UserContent from "../features/UserContent";

function User() {

  return (
    <DashboardShell role="User">
      <UserContent />
    </DashboardShell>
  );
}

export default User;
