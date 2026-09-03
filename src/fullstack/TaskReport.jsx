import React, { useEffect, useState } from "react";
import { Card, Tag } from "../ui";
import {
  getTaskWithItems, taskStatus, TASK_STATUS_LABEL, trashTask, assigneeEmails,
  listTesters, addTaskAssignee, removeTaskAssignee,
} from "./fullstackApi";
import ChecklistItemEditor from "./ChecklistItemEditor";
import ReportPreview from "./ReportPreview";

function ManageAssignees({ task, onChange }) {
  const [testers, setTesters] = useState([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { listTesters().then(setTesters).catch(e => setError(e.message)); }, []);

  const assignedIds = new Set((task.assignees || []).map(a => a.tester?.id));
  const available = testers.filter(t => !t.blocked && !assignedIds.has(t.id));

  useEffect(() => {
    setSelected(available[0]?.id || "");
  }, [testers.length, task.assignees]);

  const add = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await addTaskAssignee(task.id, selected);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (testerId) => {
    setBusy(true);
    setError("");
    try {
      await removeTaskAssignee(task.id, testerId);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{marginBottom:20}}>
      <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,fontWeight:700}}>
        Manage Testers
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
        {(task.assignees || []).length === 0 && (
          <span style={{color:"var(--muted)",fontSize:13}}>No testers assigned.</span>
        )}
        {(task.assignees || []).map(a => a.tester && (
          <span key={a.tester.id} style={{display:"flex",alignItems:"center",gap:6,
            background:"var(--surface)",border:"1px solid var(--border)",borderRadius:20,
            padding:"5px 6px 5px 12px",fontSize:13}}>
            {a.tester.email}
            <button onClick={() => remove(a.tester.id)} disabled={busy}
              style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",
                fontSize:15,padding:"0 4px",lineHeight:1}}
              title="Remove">×</button>
          </span>
        ))}
      </div>
      {available.length > 0 ? (
        <div style={{display:"flex",gap:8}}>
          <select value={selected} onChange={e => setSelected(e.target.value)}
            style={{flex:1, background:"var(--input-bg)", border:"1.5px solid var(--border)",
              borderRadius:8, padding:"8px 12px", color:"var(--text)", fontSize:13, outline:"none",
              fontFamily:"'DM Sans',sans-serif"}}>
            {available.map(t => <option key={t.id} value={t.id}>{t.email}</option>)}
          </select>
          <button onClick={add} disabled={busy}
            style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,
              color:"var(--text)",cursor: busy?"default":"pointer",padding:"0 16px",fontSize:13,
              fontWeight:700,fontFamily:"'Syne',sans-serif"}}>
            + Add
          </button>
        </div>
      ) : (
        <div style={{color:"var(--muted)",fontSize:12}}>All active testers are already assigned.</div>
      )}
      {error && <div style={{color:"var(--danger)",fontSize:12,marginTop:8}}>{error}</div>}
    </Card>
  );
}

export default function TaskReport({ taskId, onBack }) {
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");
  const [trashing, setTrashing] = useState(false);
  const [mode, setMode] = useState("view");
  const [showAssignees, setShowAssignees] = useState(false);

  const refresh = () => getTaskWithItems(taskId).then(setTask).catch(e => setError(e.message));
  useEffect(() => { refresh(); }, [taskId]);

  if (error) return <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>;
  if (!task) return <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>;

  const status = taskStatus({ submitted_at: task.submitted_at, task_items: task.items });
  const meta = TASK_STATUS_LABEL[status];

  const moveToTrash = async () => {
    if (!confirm(`Move "${task.name}" to trash?`)) return;
    setTrashing(true);
    try {
      await trashTask(taskId);
      onBack();
    } catch (e) {
      setError(e.message);
      setTrashing(false);
    }
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={onBack}
          style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
            color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13}}>
          ← Back to Tasks
        </button>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
            <button onClick={() => setMode("view")}
              style={{padding:"8px 16px",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",
                background: mode==="view" ? "var(--accent-solid)" : "none", color: mode==="view" ? "var(--on-solid)" : "var(--muted)"}}>
              View
            </button>
            <button onClick={() => setMode("edit")}
              style={{padding:"8px 16px",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",
                background: mode==="edit" ? "var(--accent-solid)" : "none", color: mode==="edit" ? "var(--on-solid)" : "var(--muted)"}}>
              Edit
            </button>
          </div>
          <button onClick={() => setShowAssignees(s => !s)}
            style={{background: showAssignees ? "var(--accent-solid)" : "none",border:"1px solid var(--border)",borderRadius:8,
              color: showAssignees ? "var(--on-solid)" : "var(--text)",cursor:"pointer",padding:"8px 16px",fontSize:12,fontWeight:700}}>
            Manage Testers
          </button>
          <button onClick={moveToTrash} disabled={trashing}
            style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
              color:"var(--danger)",cursor: trashing?"default":"pointer",padding:"8px 16px",fontSize:13,
              opacity: trashing?.6:1}}>
            {trashing ? "Moving…" : "Move to Trash"}
          </button>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6,flexWrap:"wrap"}}>
        <h1 style={{fontSize:"clamp(20px,4vw,28px)",fontWeight:800}}>{task.name}</h1>
        <Tag color={meta.color}>{meta.label}</Tag>
      </div>
      <div style={{color:"var(--muted)",fontSize:13,marginBottom:24}}>
        {task.group?.name} · Assigned to {assigneeEmails(task)}
        {task.submitted_at && ` · Submitted ${new Date(task.submitted_at).toLocaleString()}`}
      </div>

      {error && <div style={{color:"var(--danger)",fontSize:13,marginBottom:12}}>{error}</div>}

      {showAssignees && <ManageAssignees task={task} onChange={refresh} />}

      {mode === "view" ? (
        <ReportPreview task={task} />
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {task.items.map(item => (
            <ChecklistItemEditor key={item.id} item={item} taskId={taskId} onChange={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
