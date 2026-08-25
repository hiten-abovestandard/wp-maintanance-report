import React, { useEffect, useState } from "react";
import { Card, Tag } from "../ui";
import { getTaskWithItems, taskStatus, TASK_STATUS_LABEL } from "./fullstackApi";

export default function TaskReport({ taskId, onBack }) {
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getTaskWithItems(taskId).then(setTask).catch(e => setError(e.message));
  }, [taskId]);

  if (error) return <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>;
  if (!task) return <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>;

  const status = taskStatus({ submitted_at: task.submitted_at, task_items: task.items });
  const meta = TASK_STATUS_LABEL[status];

  return (
    <div>
      <button onClick={onBack}
        style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
          color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13,marginBottom:20}}>
        ← Back to Tasks
      </button>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6,flexWrap:"wrap"}}>
        <h1 style={{fontSize:"clamp(20px,4vw,28px)",fontWeight:800}}>{task.name}</h1>
        <Tag color={meta.color}>{meta.label}</Tag>
      </div>
      <div style={{color:"var(--muted)",fontSize:13,marginBottom:24}}>
        {task.group?.name} · Assigned to {task.assigned?.email}
        {task.submitted_at && ` · Submitted ${new Date(task.submitted_at).toLocaleString()}`}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {task.items.map(item => (
          <Card key={item.id}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <span style={{fontSize:18,lineHeight:1}}>{item.checked ? "✅" : "⬜"}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,marginBottom: (item.comment||item.image_url) ? 8 : 0}}>{item.label}</div>
                {item.comment && (
                  <div style={{color:"var(--muted)",fontSize:13,marginBottom: item.image_url ? 8 : 0}}>{item.comment}</div>
                )}
                {item.image_url && (
                  <img src={item.image_url} alt="" style={{maxWidth:220,borderRadius:8,border:"1px solid var(--border)"}} />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
