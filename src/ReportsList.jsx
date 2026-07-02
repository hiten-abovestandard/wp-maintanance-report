import React, { useEffect, useState } from "react";
import { Card, Tag } from "./ui";
import { listReports, deleteReport } from "./reportsApi";

function monthLabel(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

function groupByMonth(reports) {
  const groups = [];
  let current = null;
  for (const r of reports) {
    const label = monthLabel(r.report_date);
    if (!current || current.label !== label) {
      current = { label, reports: [] };
      groups.push(current);
    }
    current.reports.push(r);
  }
  return groups;
}

export default function ReportsList({ onOpen, onNew }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    setLoading(true);
    setError("");
    listReports()
      .then(setReports)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const remove = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this report? This can't be undone.")) return;
    await deleteReport(id);
    setReports(rs => rs.filter(r => r.id !== id));
  };

  const groups = groupByMonth(reports);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"var(--accent)",
              boxShadow:"0 0 10px var(--accent)"}} />
            <span style={{fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",
              color:"var(--accent)",fontWeight:700,fontFamily:"'Syne',sans-serif"}}>
              WordPress Maintenance
            </span>
          </div>
          <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800}}>Reports</h1>
        </div>
        <button onClick={onNew}
          style={{ padding:"12px 22px", background:"linear-gradient(135deg,var(--accent),var(--accent2))",
            border:"none", borderRadius:10, color:"#000", fontWeight:800,
            fontSize:14, cursor:"pointer", fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.03em" }}>
          + New Report
        </button>
      </div>

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {error && <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>}
      {!loading && !error && groups.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No reports yet. Start with "+ New Report".</div></Card>
      )}

      {groups.map(group => (
        <div key={group.label} style={{marginBottom:32}}>
          <h2 style={{fontSize:13,letterSpacing:"0.1em",textTransform:"uppercase",
            color:"var(--muted)",fontWeight:700,marginBottom:14}}>{group.label}</h2>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {group.reports.map(r => {
              const updated = (r.data.updatedPlugins||[]).filter(p=>p.name?.trim()).length;
              const pending = (r.data.pendingPlugins||[]).filter(p=>p.name?.trim()).length;
              return (
                <Card key={r.id} style={{cursor:"pointer",display:"flex",alignItems:"center",
                  justifyContent:"space-between",gap:16,flexWrap:"wrap"}}
                  onClick={()=>onOpen(r)}>
                  <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:14}}>{r.report_date}</span>
                    <Tag color={r.status==="final" ? "var(--accent2)" : "var(--warn)"}>
                      {r.status==="final" ? "Final" : "Draft"}
                    </Tag>
                    {r.data.stagingUrl && (
                      <span style={{color:"var(--muted)",fontSize:13}}>{r.data.stagingUrl}</span>
                    )}
                    <span style={{color:"var(--muted)",fontSize:12}}>
                      {updated} updated{pending ? `, ${pending} pending` : ""}
                    </span>
                  </div>
                  <button onClick={(e)=>remove(e, r.id)}
                    style={{background:"none",border:"none",color:"var(--danger)",
                      cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
                    Delete
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
