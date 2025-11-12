// src/components/KeepTableLink.jsx
import { Link, useLocation } from "react-router-dom";
import { withTable } from "../hooks/useTableParam";

/** Link ที่จะเติม ?table=... จาก URL ปัจจุบันให้อัตโนมัติ */
export default function KeepTableLink({ to, ...props }) {
  const loc = useLocation();
  const finalTo = withTable(loc.search, to);
  return <Link to={finalTo} {...props} />;
}
