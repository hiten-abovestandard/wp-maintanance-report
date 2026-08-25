import React, { useEffect, useState } from "react";
import { Card, Tag } from "../ui";
import { listTasks, taskStatus, TASK_STATUS_LABEL } from "./fullstackApi";

export default function TaskList({ onNew, onOpenReport }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listTasks().then(setTasks).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800}}>Tasks</h1>
        <button onClick={onNew}
          style={{ padding:"12px 22px", background:"linear-gradient(135deg,var(--accent),var(--accent2))",
            border:"none", borderRadius:10, color:"#000", fontWeight:800,
            fontSize:14, cursor:"pointer", fontFamily:"'Syne',sans-serif", letterSpacing:"0.03em" }}>
          + New Task
        </button>
      </div>

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {error && <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>}
      {!loading && !error && tasks.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No tasks yet. Start with "+ New Task".</div></Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {tasks.map(t => {
          const status = taskStatus(t);
          const meta = TASK_STATUS_LABEL[status];
          const total = t.task_items?.length || 0;
          const done = t.task_items?.filter(i => i.checked).length || 0;
          return (
            <Card key={t.id} style={{cursor:"pointer",display:"flex",alignItems:"center",
              justifyContent:"space-between",gap:16,flexWrap:"wrap"}}
              onClick={() => onOpenReport(t.id)}>
              <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <span style={{fontWeight:700}}>{t.name}</span>
                <Tag color={meta.color}>{meta.label}</Tag>
                <span style={{color:"var(--muted)",fontSize:12}}>{t.group?.name}</span>
                <span style={{color:"var(--muted)",fontSize:12}}>{done}/{total} checked</span>
              </div>
              <div style={{color:"var(--muted)",fontSize:13}}>{t.assigned?.email}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
