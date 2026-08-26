import React, { useEffect, useState } from "react";
import { Card } from "../ui";
import { listTrashedTasks, restoreTask, permanentlyDeleteTask, assigneeEmails } from "./fullstackApi";

export default function TaskTrash({ onBack }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    setLoading(true);
    listTrashedTasks().then(setTasks).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const restore = async (t) => {
    try { await restoreTask(t.id); refresh(); } catch (e) { setError(e.message); }
  };

  const destroy = async (t) => {
    if (!confirm(`Permanently delete "${t.name}"? This can't be undone.`)) return;
    try { await permanentlyDeleteTask(t.id); refresh(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <button onClick={onBack}
        style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
          color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13,marginBottom:20}}>
        ← Back to Tasks
      </button>

      <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,marginBottom:24}}>Trash</h1>

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {error && <div style={{color:"var(--danger)",fontSize:14,marginBottom:12}}>{error}</div>}
      {!loading && tasks.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>Trash is empty.</div></Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {tasks.map(t => (
          <Card key={t.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <span style={{fontWeight:700}}>{t.name}</span>
              <span style={{color:"var(--muted)",fontSize:12}}>{t.group?.name}</span>
              <span style={{color:"var(--muted)",fontSize:12}}>{assigneeEmails(t)}</span>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={() => restore(t)}
                style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
                  color:"var(--muted)",cursor:"pointer",padding:"6px 12px",fontSize:12}}>
                Restore
              </button>
              <button onClick={() => destroy(t)}
                style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:13}}>
                Delete Permanently
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
