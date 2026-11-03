import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlanView from "../components/PlanView";
import { ErrorBox, Skeleton } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { api } from "../services/api";
import type { Plan } from "../types";

export default function SharedTrip() {
  const { token = "" } = useParams();
  const [data, setData] = useState<{ title: string; plan: Plan } | null>(null);
  const [err, setErr] = useState("");
  useSeo({ title: data?.title ?? "Shared trip" });
  useEffect(() => { api.shared(token).then(setData).catch((e: Error) => setErr(e.message)); }, [token]);
  return (
    <div className="container page">
      {err && <><ErrorBox message={err} /><p><Link className="btn" to="/plan">Plan your own trip</Link></p></>}
      {!data && !err && <Skeleton height={300} />}
      {data && <><p className="notice warn small no-print">This is a shared, read-only trip plan. <Link to={`/plan?destination=${data.plan.destination.id}&days=${data.plan.request.days}`}>Make your own copy</Link>.</p><PlanView plan={data.plan} readOnly /></>}
    </div>
  );
}
