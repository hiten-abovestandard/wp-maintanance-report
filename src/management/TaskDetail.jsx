import React, { useEffect, useState } from "react";
import { Card, Section, Tag, ErrorMsg } from "../ui";
import { getTask, PRIORITY_LABEL, STATUS_LABEL, isOverdue, assigneeNames,
  sendInstantEmail, listTaskEmailHistory } from "./managementApi";

function fmt(dt) {
  return dt ? new Date(dt).toLocaleString() : "—";
}

export default function TaskDetail({ taskId, onBack, onEdit }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emailHistory, setEmailHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  const refresh = () => {
    setLoading(true);
    Promise.all([getTask(taskId), listTaskEmailHistory(taskId)])
      .then(([t, h]) => { setTask(t); setEmailHistory(h); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, [taskId]);

  const sendInstant = async () => {
    setSending(true);
    setSendError("");
    setSendSuccess(false);
    try {
      await sendInstantEmail(taskId);
      setSendSuccess(true);
      listTaskEmailHistory(taskId).then(setEmailHistory).catch(() => {});
    } catch (e) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>;
  if (error) return <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>;
  if (!task) return null;

  const overdue = isOverdue(task);
  const priority = PRIORITY_LABEL[task.priority];
  const status = STATUS_LABEL[task.status];

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,
          background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,
          color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
          ← Back to Tasks
        </button>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button onClick={sendInstant} disabled={sending}
            style={{background:"linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",border:"none",
              borderRadius:8,color:"var(--on-solid)",cursor:sending?"default":"pointer",padding:"8px 16px",
              fontSize:13,fontWeight:700,fontFamily:"'Syne',sans-serif",opacity:sending?.6:1}}>
            {sending ? "Sending…" : "✉ Send Instant Email"}
          </button>
          <button onClick={()=>onEdit(task.id)}
            style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,
              color:"var(--text)",cursor:"pointer",padding:"8px 16px",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
            Edit Task
          </button>
        </div>
      </div>

      <ErrorMsg msg={sendError} />
      {sendSuccess && (
        <div style={{color:"var(--accent)",fontSize:13,fontWeight:600,marginBottom:16}}>
          ✓ Instant email sent successfully.
        </div>
      )}

      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:"clamp(20px,3vw,28px)",fontWeight:800,marginBottom:10}}>{task.title}</h1>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <Tag color={priority.color}>{priority.label} Priority</Tag>
          <Tag color={status.color}>{status.label}</Tag>
          {overdue && <Tag color="var(--danger)">Overdue</Tag>}
        </div>
      </div>

      {task.description && (
        <Card style={{marginBottom:16}}>
          <Section title="Description" accent="var(--muted)">
            <div style={{color:"var(--text)",fontSize:14,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {task.description}
            </div>
          </Section>
        </Card>
      )}

      {task.image_url && (
        <Card style={{marginBottom:16}}>
          <Section title="Attachment" accent="var(--muted)">
            <img src={task.image_url} alt="" style={{maxWidth:"100%",borderRadius:8,border:"1px solid var(--border)"}} />
          </Section>
        </Card>
      )}

      <Card style={{marginBottom:16}}>
        <Section title="Details" accent="var(--accent2)">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,fontSize:14}}>
            <div><div style={{color:"var(--muted)",fontSize:11,textTransform:"uppercase",marginBottom:4}}>Assigned To</div>{assigneeNames(task)}</div>
            <div><div style={{color:"var(--muted)",fontSize:11,textTransform:"uppercase",marginBottom:4}}>Expected Delivery</div>
              {task.expected_delivery_date}{task.expected_delivery_time ? ` at ${task.expected_delivery_time}` : ""}</div>
            <div><div style={{color:"var(--muted)",fontSize:11,textTransform:"uppercase",marginBottom:4}}>Created</div>{fmt(task.created_at)}</div>
            <div><div style={{color:"var(--muted)",fontSize:11,textTransform:"uppercase",marginBottom:4}}>Started</div>{fmt(task.started_at)}</div>
            <div><div style={{color:"var(--muted)",fontSize:11,textTransform:"uppercase",marginBottom:4}}>Completed</div>{fmt(task.completed_at)}</div>
            <div><div style={{color:"var(--muted)",fontSize:11,textTransform:"uppercase",marginBottom:4}}>Last Updated</div>{fmt(task.updated_at)}</div>
          </div>
          {task.cowork_link && (
            <div style={{marginTop:16}}>
              <a href={task.cowork_link} target="_blank" rel="noreferrer"
                style={{color:"var(--accent2)",fontSize:14,fontWeight:600}}>
                ⎘ Open Cowork Link
              </a>
            </div>
          )}
        </Section>
      </Card>

      <Card style={{marginBottom:16}}>
        <Section title="Notification Settings" accent="var(--muted)">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,fontSize:14,color:"var(--text)"}}>
            <div><div style={{color:"var(--muted)",fontSize:11,textTransform:"uppercase",marginBottom:4}}>Morning Email</div>{task.notify_morning === null ? "Priority default" : task.notify_morning ? "Yes" : "No"}</div>
            <div><div style={{color:"var(--muted)",fontSize:11,textTransform:"uppercase",marginBottom:4}}>Evening Email</div>{task.notify_evening === null ? "Priority default" : task.notify_evening ? "Yes" : "No"}</div>
            <div><div style={{color:"var(--muted)",fontSize:11,textTransform:"uppercase",marginBottom:4}}>Reminders Sent</div>{task.notify_sent_count}{task.notify_max_count ? ` / ${task.notify_max_count}` : ""}</div>
            <div><div style={{color:"var(--muted)",fontSize:11,textTransform:"uppercase",marginBottom:4}}>Stops on Complete</div>{task.notify_stop_on_complete ? "Yes" : "No"}</div>
          </div>
        </Section>
      </Card>

      <Card>
        <Section title="Email History" accent="var(--muted)">
          {emailHistory.length === 0 && (
            <div style={{color:"var(--muted)",fontSize:13}}>No emails have been sent for this task yet.</div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {emailHistory.map(h => (
              <div key={h.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                gap:12,flexWrap:"wrap",fontSize:13,borderBottom:"1px solid var(--border)",paddingBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <Tag color={h.email_type==="instant" ? "var(--accent2)" : "var(--muted)"}>
                    {h.email_type==="instant" ? "Instant" : "Scheduled"}
                  </Tag>
                  <Tag color={h.status==="sent" ? "var(--accent)" : "var(--danger)"}>
                    {h.status==="sent" ? "Sent" : "Failed"}
                  </Tag>
                  <span style={{color:"var(--muted)"}}>{(h.recipients||[]).length} recipient(s)</span>
                  {h.sender?.email && <span style={{color:"var(--muted)"}}>by {h.sender.name || h.sender.email}</span>}
                </div>
                <span style={{color:"var(--muted)",fontFamily:"'DM Mono',monospace"}}>{fmt(h.sent_at)}</span>
              </div>
            ))}
          </div>
        </Section>
      </Card>
    </div>
  );
}
