import React, { useState } from "react";
import { Card } from "./ui";

export default function ReportView({ data, onBack }) {
  const updatedPlugins = data.updatedPlugins.filter(p=>p.name.trim());
  const pendingPlugins = data.pendingPlugins.filter(p=>p.name.trim());
  const themes = data.themes.filter(t=>t.name.trim());
  const total = updatedPlugins.length + pendingPlugins.length;
  const [copied, setCopied] = useState(false);

  const lines = [];
  const l = (s="") => lines.push(s);

  l(`Monthly Maintenance Report:- ${data.date}`);
  l();
  l(`Staging Details`);
  l(`Staging Environment Created (Before Updates): ${data.stagingUrl}`);
  if(data.deletedStaging.trim()) l(`Deleted Staging Environment(s): ${data.deletedStaging}`);
  l();
  l(`Plugin Updates`);
  l(`Total Plugins with Available Updates: ${total}`);
  l(`Plugins Successfully Updated: ${updatedPlugins.length}`);
  l();
  if(updatedPlugins.length) {
    l(`Updated Plugins:`);
    updatedPlugins.forEach((p,i) => l(`${i+1}. ${p.name}`));
    l();
  }
  if(pendingPlugins.length) {
    l(`Pending Plugin Updates`);
    pendingPlugins.forEach((p,i) => {
      l(`${i+1}. ${p.name}`);
      if(p.extra?.trim()) l(`Reason Not Updated: -> ${p.extra}`);
    });
    l();
  }
  l(`Theme Update`);
  if(themes.length) {
    themes.forEach((t,i) => l(`${i+1}. ${t.name}`));
  } else {
    l(`Theme is already up to date.`);
  }
  l();
  l(`WordPress Core Update`);
  if(data.wpFrom.trim() && data.wpTo.trim()) {
    l(`From ${data.wpFrom} -> WordPress ${data.wpTo}`);
  } else {
    l(`WordPress core is already updated.`);
  }
  l();
  l(`Summary`);
  l(`All major updates completed successfully.`);
  if(pendingPlugins.length) l(`Pending updates require manual action or license validation.`);
  l(`Website functionality tested after updates and working as expected.`);
  if(data.additionalNotes.trim()) {
    l();
    l(`Additional Notes`);
    l(data.additionalNotes);
  }

  const text = lines.join("\n");

  const copy = () => {
    navigator.clipboard.writeText(text).then(()=>{
      setCopied(true); setTimeout(()=>setCopied(false),2000);
    });
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,
          background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,
          color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
          ← Back to Editor
        </button>
        <button onClick={copy} style={{display:"flex",alignItems:"center",gap:6,
          background: copied?"var(--accent-solid)":"var(--accent2-solid)",border:"none",borderRadius:8,
          color:"var(--on-solid)",cursor:"pointer",padding:"9px 20px",
          fontSize:13,fontWeight:600,fontFamily:"'Syne',sans-serif",transition:"all .2s"}}>
          {copied ? "✓ Copied!" : "⎘ Copy Report"}
        </button>
      </div>
      <Card style={{position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,
          background:"linear-gradient(90deg,var(--accent-solid),var(--accent2-solid))",borderRadius:"12px 12px 0 0"}} />
        <pre style={{ fontFamily:"'DM Mono',monospace", fontSize:13, lineHeight:1.7,
          color:"var(--text)", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
          {text}
        </pre>
      </Card>
    </div>
  );
}
