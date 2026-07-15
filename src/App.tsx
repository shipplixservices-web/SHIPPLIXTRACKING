import React from "react";
import CustomerApp from "../tracking-portal/src/CustomerApp.tsx";
import AdminApp from "../admin-portal/src/AdminApp.tsx";

export default function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");

  if (isAdmin) {
    return <AdminApp />;
  }

  return <CustomerApp />;
}
