import React, { useEffect, useState } from "react";
import { Tag } from "../ui";
import { getTaskWithItems, submitTask, updateTaskNote, taskStatus, TASK_STATUS_LABEL, assigneeEmails } from "./fullstackApi";
import ChecklistItemEditor from "./ChecklistItemEditor";
import ReportPreview from "./ReportPreview";

export default function TesterTaskDetail({ taskId, onBack }) {
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [showReport, setShowReport] = useState(false);

  const refresh = () => getTaskWithItems(taskId).then(t => {
    setTask(t);
    setNote(t.additional_note || "");
  }).catch(e => setError(e.message));
  useEffect(() => { refresh(); }, [taskId]);

  if (error) return <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>;
  if (!task) return <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>;

  const allChecked = task.items.length > 0 && task.items.every(i => i.checked);
  const status = taskStatus({ submitted_at: task.submitted_at, task_items: task.items });
  const meta = TASK_STATUS_LABEL[status];

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await submitTask(taskId);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const commitNote = async () => {
    if (note === (task.additional_note || "")) return;
    try { await updateTaskNote(taskId, note); } catch (e) { setError(e.message); }
  };

  if (showReport) {
    return (
      <div>
        <button onClick={() => setShowReport(false)}
          style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
            color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13,marginBottom:20}}>
          ← Back to Checklist
        </button>
        <h1 style={{fontSize:"clamp(20px,4vw,28px)",fontWeight:800,marginBottom:20}}>{task.name} — Report</h1>
        <ReportPreview task={{ ...task, additional_note: note }} />
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack}
        style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
          color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13,marginBottom:20}}>
        ← Back to My Tasks
      </button>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:6,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <h1 style={{fontSize:"clamp(20px,4vw,28px)",fontWeight:800}}>{task.name}</h1>
          <Tag color={meta.color}>{meta.label}</Tag>
        </div>
        <button onClick={() => setShowReport(true)}
          style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
            color:"var(--text)",cursor:"pointer",padding:"8px 16px",fontSize:12,fontWeight:700}}>
          Generate Report
        </button>
      </div>
      <div style={{color:"var(--muted)",fontSize:13,marginBottom:24}}>
        Assigned to {assigneeEmails(task)}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        {task.items.map(item => (
          <ChecklistItemEditor key={item.id} item={item} taskId={taskId} onChange={refresh} />
        ))}
      </div>

      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,fontWeight:700}}>
          Additional Note
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={commitNote}
          placeholder="Anything else worth noting about this task…" rows={3}
          style={{ width:"100%", background:"var(--input-bg)", border:"1.5px solid var(--border)",
            borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:13,
            outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif" }} />
      </div>

      {error && <div style={{color:"var(--danger)",fontSize:13,marginBottom:12}}>{error}</div>}

      {!task.submitted_at && (
        allChecked ? (
          <button onClick={submit} disabled={submitting}
            style={{ padding:"13px 26px", background:"linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",
              border:"none", borderRadius:10, color:"var(--on-solid)", fontWeight:800,
              fontSize:14, cursor: submitting?"default":"pointer", fontFamily:"'Syne',sans-serif",
              letterSpacing:"0.03em", opacity: submitting?.6:1 }}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        ) : (
          <div style={{color:"var(--muted)",fontSize:13}}>Check every item to enable submit.</div>
        )
      )}
      {task.submitted_at && (
        <div style={{color:"var(--muted)",fontSize:12}}>
          Submitted {new Date(task.submitted_at).toLocaleString()} — you can still make changes if needed.
        </div>
      )}
    </div>
  );
}
