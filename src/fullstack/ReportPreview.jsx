import React, { useState } from "react";
import { Card } from "../ui";
import { taskStatus, TASK_STATUS_LABEL, assigneeEmails, buildReportText } from "./fullstackApi";

export default function ReportPreview({ task }) {
  const [copied, setCopied] = useState(false);
  const [generatedAt] = useState(() => new Date());
  const status = taskStatus({ submitted_at: task.submitted_at, task_items: task.items });
  const meta = TASK_STATUS_LABEL[status];

  const copy = async () => {
    await navigator.clipboard.writeText(buildReportText(task, generatedAt));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{color:"var(--muted)",fontSize:12}}>
          {generatedAt.toLocaleDateString()} · {meta.label} · {assigneeEmails(task)}
        </div>
        <button onClick={copy}
          style={{background: copied ? "var(--accent-solid)" : "none", border:"1px solid var(--border)", borderRadius:8,
            color: copied ? "var(--on-solid)" : "var(--muted)", cursor:"pointer", padding:"8px 16px", fontSize:12, fontWeight:700}}>
          {copied ? "✓ Copied" : "Copy Report"}
        </button>
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
                  <img src={item.image_url} alt="" style={{maxWidth:200,borderRadius:8,border:"1px solid var(--border)"}} />
                )}
                {item.updated_by_profile?.email && (
                  <div style={{color:"var(--muted)",fontSize:11,marginTop:8}}>By {item.updated_by_profile.email}</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {task.additional_note?.trim() && (
        <Card style={{marginTop:10}}>
          <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,fontWeight:700}}>
            Additional Note
          </div>
          <div style={{fontSize:14,whiteSpace:"pre-wrap"}}>{task.additional_note}</div>
        </Card>
      )}
    </div>
  );
}
