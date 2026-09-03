import React, { useState } from "react";
import { Card, Tag, ErrorMsg } from "./ui";
import { buildClientReportBody } from "./clientReportTemplate";
import { saveClientReport } from "./reportsApi";
import { draftClientNote } from "./aiApi";
import { useAutosave } from "./useAutosave";

export default function ClientReport({ report, onBack }) {
  const [topNote, setTopNote] = useState(report.client_top_note || "");
  const [bottomNote, setBottomNote] = useState(report.client_bottom_note || "");
  const [status, setStatus] = useState(report.client_report_status || "not_started");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");

  const body = buildClientReportBody(report.data, report.report_date);
  const finalized = report.status === "final";

  const draftWithAI = async () => {
    if (topNote.trim() && !confirm("Replace your current note with an AI draft?")) return;
    setDrafting(true);
    setDraftError("");
    try {
      setTopNote(await draftClientNote(body));
    } catch (e) {
      setDraftError(e.message || "Couldn't generate a draft. Try again.");
    } finally {
      setDrafting(false);
    }
  };

  const persist = async (nextStatus) => {
    setSaving(true);
    try {
      await saveClientReport({
        id: report.id,
        client_top_note: topNote,
        client_bottom_note: bottomNote,
        client_report_status: nextStatus,
      });
      setStatus(nextStatus);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  useAutosave(topNote + "||" + bottomNote, () => {
    persist("draft");
  });

  const saveDraft = async () => {
    await persist("draft");
  };

  const fullText = () => [topNote, body, bottomNote].filter(s => s.trim()).join("\n\n");

  const copy = async () => {
    await navigator.clipboard.writeText(fullText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    await persist("sent");
  };

  const statusColor = status === "sent" ? "var(--accent)" : status === "draft" ? "var(--warn)" : "var(--danger)";
  const statusLabel = status === "sent" ? "Sent" : status === "draft" ? "Draft" : "Not Started";

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,
          background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,
          color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
          ← Back to Reports
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {saving
            ? <span style={{fontSize:12,color:"var(--muted)"}}>Saving…</span>
            : savedAt && <span style={{fontSize:12,color:"var(--accent)"}}>✓ Saved</span>}
          <Tag color={statusColor}>{statusLabel}</Tag>
        </div>
      </div>

      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:"clamp(20px,3vw,28px)",fontWeight:800}}>Client Report</h1>
        <div style={{color:"var(--muted)",fontSize:13,marginTop:4}}>
          {report.report_date} · edit the notes below, the middle section is generated automatically
        </div>
      </div>

      {!finalized && (
        <div style={{background:"#ffc74411",border:"1px solid var(--warn)",borderRadius:10,
          padding:"14px 18px",marginBottom:20,color:"var(--warn)",fontSize:13}}>
          ⚠ This report hasn't been finalized yet (still an internal draft). You can preview and prepare the
          client message, but copying is disabled until the report is generated/finalized.
        </div>
      )}

      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",
            color:"var(--muted)"}}>Add before the summary (optional)</div>
          <button onClick={draftWithAI} disabled={drafting}
            style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
              color:"var(--muted)",cursor: drafting ? "default" : "pointer",padding:"5px 12px",fontSize:12,
              fontFamily:"'DM Sans',sans-serif",opacity: drafting ? .6 : 1,flexShrink:0}}>
            {drafting ? "Drafting…" : "✨ Draft with AI"}
          </button>
        </div>
        <textarea value={topNote} onChange={e=>setTopNote(e.target.value)}
          placeholder="e.g. Hi [Client name], hope you're doing well! Here's this month's update:"
          rows={3}
          style={{ width:"100%", background:"var(--input-bg)", border:"1.5px solid var(--border)",
            borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
            outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif" }} />
        <ErrorMsg msg={draftError} />
      </Card>

      <Card style={{marginBottom:16,position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,
          background:"linear-gradient(90deg,var(--accent-solid),var(--accent2-solid))",borderRadius:"12px 12px 0 0"}} />
        <pre style={{ fontFamily:"'DM Mono',monospace", fontSize:13, lineHeight:1.7,
          color:"var(--text)", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
          {body}
        </pre>
      </Card>

      <Card style={{marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",
          color:"var(--muted)",marginBottom:8}}>Add after the summary (optional)</div>
        <textarea value={bottomNote} onChange={e=>setBottomNote(e.target.value)}
          placeholder="e.g. Let us know if you have any questions. Best, Support Team"
          rows={3}
          style={{ width:"100%", background:"var(--input-bg)", border:"1.5px solid var(--border)",
            borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
            outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif" }} />
      </Card>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <button onClick={saveDraft} disabled={saving}
          style={{ flex:"1 1 160px", padding:"14px", background:"var(--surface)",
            border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontWeight:700,
            fontSize:14, cursor: saving ? "default" : "pointer", fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.03em", opacity: saving ? .6 : 1 }}>
          Save Draft
        </button>
        <button onClick={copy} disabled={saving || !finalized}
          title={!finalized ? "Finalize the report before copying" : undefined}
          style={{ flex:"2 1 260px", padding:"15px",
            background: !finalized ? "var(--border)" : copied ? "var(--accent-solid)" : "linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",
            border:"none", borderRadius:10, color: !finalized ? "var(--muted)" : "var(--on-solid)", fontWeight:800,
            fontSize:15, cursor: (saving || !finalized) ? "default" : "pointer", fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.05em", textTransform:"uppercase" }}>
          {copied ? "✓ Copied!" : "⎘ Copy Client Report"}
        </button>
      </div>
    </div>
  );
}
