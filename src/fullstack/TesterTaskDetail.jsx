import React, { useEffect, useRef, useState } from "react";
import { Card, Tag } from "../ui";
import {
  getTaskWithItems, updateTaskItem, uploadEvidenceImage, submitTask,
  taskStatus, TASK_STATUS_LABEL,
} from "./fullstackApi";

function ChecklistItem({ item, taskId, disabled, onChange }) {
  const [comment, setComment] = useState(item.comment || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const toggle = async () => {
    if (disabled) return;
    try {
      await updateTaskItem(item.id, { checked: !item.checked });
      onChange();
    } catch (e) { setError(e.message); }
  };

  const commitComment = async () => {
    if (disabled) return;
    try { await updateTaskItem(item.id, { comment }); } catch (e) { setError(e.message); }
  };

  const pickImage = async (e) => {
    const file = e.target.files[0];
    if (!file || disabled) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadEvidenceImage(taskId, item.id, file);
      await updateTaskItem(item.id, { image_url: url });
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <input type="checkbox" checked={item.checked} onChange={toggle} disabled={disabled}
          style={{width:20,height:20,marginTop:2,cursor: disabled?"default":"pointer"}} />
        <div style={{flex:1}}>
          <div style={{fontWeight:600,marginBottom:8}}>{item.label}</div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} onBlur={commitComment}
            disabled={disabled}
            placeholder="Optional comment…" rows={2}
            style={{ width:"100%", background:"var(--input-bg)", border:"1.5px solid var(--border)",
              borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:13,
              outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif", marginBottom:8 }} />
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            {!disabled && (
              <label style={{fontSize:12,color:"var(--muted)",cursor:"pointer",
                border:"1px solid var(--border)",borderRadius:8,padding:"6px 12px"}}>
                {uploading ? "Uploading…" : "Attach Image"}
                <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} disabled={uploading} style={{display:"none"}} />
              </label>
            )}
            {item.image_url && (
              <img src={item.image_url} alt="" style={{maxWidth:120,borderRadius:8,border:"1px solid var(--border)"}} />
            )}
          </div>
          {error && <div style={{color:"var(--danger)",fontSize:12,marginTop:6}}>{error}</div>}
        </div>
      </div>
    </Card>
  );
}

export default function TesterTaskDetail({ taskId, onBack }) {
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => getTaskWithItems(taskId).then(setTask).catch(e => setError(e.message));
  useEffect(() => { refresh(); }, [taskId]);

  if (error) return <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>;
  if (!task) return <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>;

  const submitted = !!task.submitted_at;
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

  return (
    <div>
      <button onClick={onBack}
        style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
          color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13,marginBottom:20}}>
        ← Back to My Tasks
      </button>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <h1 style={{fontSize:"clamp(20px,4vw,28px)",fontWeight:800}}>{task.name}</h1>
        <Tag color={meta.color}>{meta.label}</Tag>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
        {task.items.map(item => (
          <ChecklistItem key={item.id} item={item} taskId={taskId} disabled={submitted} onChange={refresh} />
        ))}
      </div>

      {error && <div style={{color:"var(--danger)",fontSize:13,marginBottom:12}}>{error}</div>}

      {submitted ? (
        <div style={{color:"var(--accent)",fontSize:14,fontWeight:700}}>✓ Submitted</div>
      ) : allChecked ? (
        <button onClick={submit} disabled={submitting}
          style={{ padding:"13px 26px", background:"linear-gradient(135deg,var(--accent),var(--accent2))",
            border:"none", borderRadius:10, color:"#000", fontWeight:800,
            fontSize:14, cursor: submitting?"default":"pointer", fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.03em", opacity: submitting?.6:1 }}>
          {submitting ? "Submitting…" : "Submit"}
        </button>
      ) : (
        <div style={{color:"var(--muted)",fontSize:13}}>Check every item to enable submit.</div>
      )}
    </div>
  );
}
