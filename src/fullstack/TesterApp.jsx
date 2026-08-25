import React, { useEffect, useState } from "react";
import { Card, Tag } from "../ui";
import { listMyTasks, taskStatus, TASK_STATUS_LABEL } from "./fullstackApi";
import TesterTaskDetail from "./TesterTaskDetail";

function MyTasks({ userId, onOpen }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listMyTasks(userId).then(setTasks).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [userId]);

  return (
    <div>
      <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,marginBottom:24}}>My Tasks</h1>

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {error && <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>}
      {!loading && !error && tasks.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No tasks assigned to you yet.</div></Card>
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
              onClick={() => onOpen(t.id)}>
              <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <span style={{fontWeight:700}}>{t.name}</span>
                <Tag color={meta.color}>{meta.label}</Tag>
                <span style={{color:"var(--muted)",fontSize:12}}>{t.group?.name}</span>
              </div>
              <span style={{color:"var(--muted)",fontSize:13}}>{done}/{total} checked</span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function TesterApp({ route, profile, nav }) {
  if (route.name === "fs-task-detail" && route.id) {
    return <TesterTaskDetail taskId={route.id} onBack={nav.goFsMyTasks} />;
  }
  return <MyTasks userId={profile.id} onOpen={nav.goFsTaskDetail} />;
}
