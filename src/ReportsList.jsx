import React, { useEffect, useMemo, useState } from "react";
import { Card, Tag, Input } from "./ui";
import { listReports, deleteReport } from "./reportsApi";

function monthLabel(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

function currentMonthLabel() {
  return new Date().toLocaleString("default", { month: "long", year: "numeric" });
}

function siteTitle(url) {
  if (!url) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
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

function reportLink(id) {
  return `${location.origin}${import.meta.env.BASE_URL}#/report/${id}`;
}

const CLIENT_STATUS = {
  not_started: { label: "Get Client Report", color: "var(--danger-solid)" },
  draft: { label: "Client Report: Draft", color: "var(--warn-solid)" },
  sent: { label: "Client Report: Sent", color: "var(--accent-solid)" },
};

export default function ReportsList({ onOpen, onNew, onOpenClient }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState(currentMonthLabel());
  const [copiedId, setCopiedId] = useState(null);

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

  const copyLink = async (e, id) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(reportLink(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const months = useMemo(() => {
    const seen = new Map();
    for (const r of reports) {
      const label = monthLabel(r.report_date);
      if (!seen.has(label)) seen.set(label, r.report_date);
    }
    const curLabel = currentMonthLabel();
    if (!seen.has(curLabel)) seen.set(curLabel, new Date().toISOString().slice(0, 10));
    return [...seen.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([label]) => label);
  }, [reports]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter(r => {
      if (monthFilter !== "all" && monthLabel(r.report_date) !== monthFilter) return false;
      if (!q) return true;
      const haystack = [
        r.report_date,
        r.data.stagingUrl,
        ...(r.data.updatedPlugins || []).map(p => p.name),
        ...(r.data.pendingPlugins || []).map(p => p.name),
        ...(r.data.themes || []).map(t => t.name),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [reports, search, monthFilter]);

  const groups = groupByMonth(filtered);

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
          style={{ padding:"12px 22px", background:"linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",
            border:"none", borderRadius:10, color:"var(--on-solid)", fontWeight:800,
            fontSize:14, cursor:"pointer", fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.03em" }}>
          + New Report
        </button>
      </div>

      <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <div style={{flex:"2 1 260px"}}>
          <Input value={search} onChange={setSearch} placeholder="Search by date, staging URL, plugin or theme name…" />
        </div>
        <select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}
          style={{ flex:"1 1 180px", background:"var(--input-bg)", border:"1.5px solid var(--border)",
            borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
            outline:"none", fontFamily:"'DM Sans',sans-serif" }}>
          <option value="all">All months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {error && <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>}
      {!loading && !error && groups.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>
          {reports.length===0
            ? `No reports yet. Start with "+ New Report".`
            : (monthFilter !== "all" && !search.trim())
              ? `No reports for ${monthFilter}. Select "All months" above to see all reports.`
              : "No reports match your search/filter."}
        </div></Card>
      )}

      {groups.map(group => (
        <div key={group.label} style={{marginBottom:32}}>
          <h2 style={{fontSize:13,letterSpacing:"0.1em",textTransform:"uppercase",
            color:"var(--muted)",fontWeight:700,marginBottom:14}}>{group.label}</h2>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {group.reports.map(r => {
              const updated = (r.data.updatedPlugins||[]).filter(p=>p.name?.trim()).length;
              const pending = (r.data.pendingPlugins||[]).filter(p=>p.name?.trim()).length;
              const clientStatus = CLIENT_STATUS[r.client_report_status || "not_started"];
              return (
                <Card key={r.id} style={{cursor:"pointer",display:"flex",
                  flexDirection:"column",alignItems:"stretch",gap:12}}
                  onClick={()=>onOpen(r)}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",minWidth:0}}>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15}}>
                        {siteTitle(r.data.stagingUrl) || "Untitled"}
                      </span>
                      {r.data.stagingUrl && (
                        <span style={{color:"var(--muted)",fontSize:13,overflow:"hidden",
                          textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{r.data.stagingUrl}</span>
                      )}
                      <span style={{color:"var(--muted)",fontSize:12}}>
                        {updated} updated{pending ? `, ${pending} pending` : ""}
                      </span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"var(--muted)"}}>{r.report_date}</span>
                      <Tag color={r.status==="final" ? "var(--accent2)" : "var(--warn)"}>
                        {r.status==="final" ? "Final" : "Draft"}
                      </Tag>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <button onClick={(e)=>{ e.stopPropagation(); onOpenClient(r); }}
                      style={{background:clientStatus.color, border:"none", borderRadius:8,
                        color:"var(--on-solid)", cursor:"pointer", padding:"7px 14px", fontSize:12, fontWeight:700,
                        fontFamily:"'Syne',sans-serif", letterSpacing:"0.02em"}}>
                      {clientStatus.label}
                    </button>
                    <button onClick={(e)=>copyLink(e, r.id)}
                      style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
                        color:"var(--muted)",cursor:"pointer",padding:"6px 12px",fontSize:12,
                        fontFamily:"'DM Sans',sans-serif"}}>
                      {copiedId===r.id ? "✓ Copied" : "Copy Link"}
                    </button>
                    <button onClick={(e)=>remove(e, r.id)}
                      style={{background:"none",border:"none",color:"var(--danger)",
                        cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
                      Delete
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
