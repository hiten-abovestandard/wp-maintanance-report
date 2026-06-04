import React, { useState } from "react";
import ReactDOM from "react-dom/client";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');`;

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0d0f14;
    --surface: #13161e;
    --card: #181c27;
    --border: #252a38;
    --accent: #4fffb0;
    --accent2: #7c6dfa;
    --danger: #ff5f6d;
    --warn: #ffc744;
    --text: #e8eaf0;
    --muted: #6b7280;
    --input-bg: #0f1119;
  }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }
  h1,h2,h3,h4 { font-family: 'Syne', sans-serif; }
  code, .mono { font-family: 'DM Mono', monospace; }
`;

// ── tiny helpers ──────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 8); }
function today() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
}
function pad2(n){ return String(n).padStart(2,"0"); }

// ── sub-components ────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label style={{ display:"block", fontSize:11, fontWeight:600, letterSpacing:"0.08em",
      textTransform:"uppercase", color:"var(--muted)", marginBottom:6, fontFamily:"'Syne',sans-serif" }}>
      {children}{required && <span style={{color:"var(--danger)",marginLeft:3}}>*</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, style={}, ...rest }) {
  return (
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%", background:"var(--input-bg)", border:"1.5px solid var(--border)",
        borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
        outline:"none", transition:"border .2s", fontFamily:"'DM Sans',sans-serif", ...style }}
      onFocus={e=>e.target.style.borderColor="var(--accent)"}
      onBlur={e=>e.target.style.borderColor="var(--border)"}
      {...rest}
    />
  );
}

function Tag({ children, color="var(--accent)" }) {
  return (
    <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20,
      background:color+"22", color, fontSize:11, fontWeight:600,
      letterSpacing:"0.06em", textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>
      {children}
    </span>
  );
}

function Section({ title, accent="var(--accent)", children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ width:3, height:18, borderRadius:2, background:accent }} />
        <h3 style={{ fontSize:13, letterSpacing:"0.1em", textTransform:"uppercase", color:accent, fontWeight:700 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Card({ children, style={} }) {
  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--border)",
      borderRadius:12, padding:"20px 22px", ...style }}>
      {children}
    </div>
  );
}

function ErrorMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6,
      color:"var(--danger)", fontSize:12, fontWeight:500 }}>
      <span style={{fontSize:14}}>⚠</span> {msg}
    </div>
  );
}

// ── Dynamic list input ────────────────────────────────────
function DynamicList({ items, onChange, placeholder, extraField=null, accent="var(--accent)" }) {
  // items: [{id, name, extra?}]
  const update = (id, key, val) => {
    onChange(items.map(it => it.id===id ? {...it,[key]:val} : it));
  };
  const remove = (id) => {
    const next = items.filter(it=>it.id!==id);
    if(next.length===0) next.push({id:uid(), name:"", extra:""});
    onChange(next);
  };
  const addIfNeeded = (id, val) => {
    update(id,"name",val);
    const idx = items.findIndex(it=>it.id===id);
    if(val.trim() && idx===items.length-1) {
      onChange([...items, {id:uid(), name:"", extra:""}]);
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {items.map((it,i) => (
        <div key={it.id} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
          <div style={{display:"flex",alignItems:"center",minWidth:24,paddingTop:12,
            color:"var(--muted)",fontSize:12,fontFamily:"'DM Mono',monospace"}}>
            {i+1}.
          </div>
          <div style={{flex:1}}>
            <Input
              value={it.name}
              onChange={val => addIfNeeded(it.id, val)}
              placeholder={placeholder}
            />
            {extraField && it.name.trim() && (
              <textarea value={it.extra||""} onChange={e=>update(it.id,"extra",e.target.value)}
                placeholder={extraField}
                rows={2}
                style={{ marginTop:6, width:"100%", background:"var(--input-bg)",
                  border:"1.5px solid var(--border)", borderRadius:8,
                  padding:"10px 14px", color:"var(--text)", fontSize:13,
                  outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif" }}
                onFocus={e=>e.target.style.borderColor=accent}
                onBlur={e=>e.target.style.borderColor="var(--border)"}
              />
            )}
          </div>
          {items.length > 1 && it.name.trim() && (
            <button onClick={()=>remove(it.id)}
              style={{ marginTop:8, background:"none", border:"none", color:"var(--muted)",
                cursor:"pointer", fontSize:16, padding:"2px 6px", lineHeight:1 }}
              title="Remove">×</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Report renderer ───────────────────────────────────────
function ReportView({ data, onBack }) {
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
          background: copied?"var(--accent)":"var(--accent2)",border:"none",borderRadius:8,
          color: copied?"#000":"#fff",cursor:"pointer",padding:"9px 20px",
          fontSize:13,fontWeight:600,fontFamily:"'Syne',sans-serif",transition:"all .2s"}}>
          {copied ? "✓ Copied!" : "⎘ Copy Report"}
        </button>
      </div>
      <Card style={{position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,
          background:"linear-gradient(90deg,var(--accent),var(--accent2))",borderRadius:"12px 12px 0 0"}} />
        <pre style={{ fontFamily:"'DM Mono',monospace", fontSize:13, lineHeight:1.7,
          color:"var(--text)", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
          {text}
        </pre>
      </Card>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("form"); // "form" | "report"
  const [errors, setErrors] = useState({});

  const [date, setDate] = useState(today());
  const [stagingUrl, setStagingUrl] = useState("");
  const [deletedStaging, setDeletedStaging] = useState("");
  const [updatedPlugins, setUpdatedPlugins] = useState([{id:uid(),name:"",extra:""}]);
  const [pendingPlugins, setPendingPlugins] = useState([{id:uid(),name:"",extra:""}]);
  const [themes, setThemes] = useState([{id:uid(),name:"",extra:""}]);
  const [wpFrom, setWpFrom] = useState("");
  const [wpTo, setWpTo] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const validate = () => {
    const e = {};
    if(!date.trim()) e.date = "Date is required.";
    if(!stagingUrl.trim()) e.stagingUrl = "Staging URL is required.";
    const hasUpdated = updatedPlugins.some(p=>p.name.trim());
    const hasPending = pendingPlugins.some(p=>p.name.trim());
    if(!hasUpdated && !hasPending) e.plugins = "Add at least one updated or pending plugin.";
    const pendingMissingReason = pendingPlugins.filter(p=>p.name.trim() && !p.extra?.trim());
    if(pendingMissingReason.length) e.pendingReason = `Add reason for: ${pendingMissingReason.map(p=>p.name).join(", ")}`;
    return e;
  };

  const generate = () => {
    const e = validate();
    setErrors(e);
    if(Object.keys(e).length===0) setView("report");
  };

  const data = { date, stagingUrl, deletedStaging, updatedPlugins, pendingPlugins,
    themes, wpFrom, wpTo, additionalNotes };

  const updatedCount = updatedPlugins.filter(p=>p.name.trim()).length;
  const pendingCount = pendingPlugins.filter(p=>p.name.trim()).length;
  const totalCount = updatedCount + pendingCount;

  if(view==="report") return (
    <div style={{maxWidth:780,margin:"0 auto",padding:"40px 20px"}}>
      <style>{FONTS}{css}</style>
      <ReportView data={data} onBack={()=>setView("form")} />
    </div>
  );

  return (
    <div style={{maxWidth:820,margin:"0 auto",padding:"40px 20px 80px"}}>
      <style>{FONTS}{css}</style>

      {/* Header */}
      <div style={{marginBottom:36}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"var(--accent)",
            boxShadow:"0 0 10px var(--accent)"}} />
          <span style={{fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",
            color:"var(--accent)",fontWeight:700,fontFamily:"'Syne',sans-serif"}}>
            WordPress Maintenance
          </span>
        </div>
        <h1 style={{fontSize:"clamp(24px,4vw,36px)",fontWeight:800,lineHeight:1.2,
          background:"linear-gradient(135deg,var(--text) 0%,var(--muted) 100%)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          Monthly Report Generator
        </h1>
      </div>

      {/* Stats bar */}
      {totalCount > 0 && (
        <div style={{display:"flex",gap:10,marginBottom:28,flexWrap:"wrap"}}>
          <Tag color="var(--text)">Total: {totalCount}</Tag>
          <Tag color="var(--accent)">Updated: {updatedCount}</Tag>
          {pendingCount>0 && <Tag color="var(--warn)">Pending: {pendingCount}</Tag>}
        </div>
      )}

      <Card style={{marginBottom:24}}>
        <Section title="Report Details">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <Label required>Report Date</Label>
              <Input value={date} onChange={setDate} placeholder="DD-MM-YYYY" />
              <ErrorMsg msg={errors.date} />
            </div>
            <div style={{opacity:.5,display:"flex",alignItems:"flex-end",paddingBottom:2}}>
              <small style={{color:"var(--muted)",fontSize:12}}>Format: DD-MM-YYYY</small>
            </div>
          </div>
        </Section>
      </Card>

      <Card style={{marginBottom:24}}>
        <Section title="Staging Details" accent="var(--accent2)">
          <div style={{marginBottom:16}}>
            <Label required>Staging Environment URL (Created Before Updates)</Label>
            <Input value={stagingUrl} onChange={setStagingUrl}
              placeholder="https://example.com/staging-04-06-26" />
            <ErrorMsg msg={errors.stagingUrl} />
          </div>
          <div>
            <Label>Deleted Staging Environment(s)</Label>
            <Input value={deletedStaging} onChange={setDeletedStaging}
              placeholder="staging-03-04-26, staging-02-03-26" />
            <div style={{marginTop:5,fontSize:11,color:"var(--muted)"}}>
              Comma-separated if multiple. Leave blank if none.
            </div>
          </div>
        </Section>
      </Card>

      <Card style={{marginBottom:24}}>
        <Section title="Updated Plugins" accent="var(--accent)">
          <DynamicList
            items={updatedPlugins}
            onChange={setUpdatedPlugins}
            placeholder="Plugin name…"
            accent="var(--accent)"
          />
          <div style={{marginTop:8,fontSize:11,color:"var(--muted)"}}>
            Type a plugin name → next field appears automatically.
          </div>
        </Section>

        <div style={{borderTop:"1px solid var(--border)",margin:"20px 0"}} />

        <Section title="Pending Plugin Updates" accent="var(--warn)">
          <DynamicList
            items={pendingPlugins}
            onChange={setPendingPlugins}
            placeholder="Plugin name…"
            extraField="Reason not updated…"
            accent="var(--warn)"
          />
          <ErrorMsg msg={errors.pendingReason} />
          <div style={{marginTop:8,fontSize:11,color:"var(--muted)"}}>
            Reason field appears after you enter a plugin name. Leave blank if no pending.
          </div>
        </Section>
        <ErrorMsg msg={errors.plugins} />
      </Card>

      <Card style={{marginBottom:24}}>
        <Section title="Theme Updates" accent="var(--accent2)">
          <DynamicList
            items={themes}
            onChange={setThemes}
            placeholder="Theme name and version e.g. Twenty Twenty-Five Version: 1.5"
            accent="var(--accent2)"
          />
          <div style={{marginTop:8,fontSize:11,color:"var(--muted)"}}>
            Leave blank if themes are already up to date.
          </div>
        </Section>
      </Card>

      <Card style={{marginBottom:24}}>
        <Section title="WordPress Core Update" accent="var(--accent)">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <Label>Current Version (From)</Label>
              <Input value={wpFrom} onChange={setWpFrom} placeholder="e.g. 6.9.4" />
            </div>
            <div>
              <Label>New Version (To)</Label>
              <Input value={wpTo} onChange={setWpTo} placeholder="e.g. 7.0" />
            </div>
          </div>
          <div style={{marginTop:8,fontSize:11,color:"var(--muted)"}}>
            Leave both blank if WordPress core is already updated.
          </div>
        </Section>
      </Card>

      <Card style={{marginBottom:32}}>
        <Section title="Additional Notes" accent="var(--muted)">
          <Label>Extra details to include in the report</Label>
          <textarea value={additionalNotes} onChange={e=>setAdditionalNotes(e.target.value)}
            placeholder="Any additional observations, issues, or notes…"
            rows={3}
            style={{ width:"100%", background:"var(--input-bg)",
              border:"1.5px solid var(--border)", borderRadius:8,
              padding:"10px 14px", color:"var(--text)", fontSize:14,
              outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif" }}
            onFocus={e=>e.target.style.borderColor="var(--muted)"}
            onBlur={e=>e.target.style.borderColor="var(--border)"}
          />
        </Section>
      </Card>

      {Object.keys(errors).length > 0 && (
        <div style={{background:"#ff5f6d11",border:"1px solid var(--danger)",borderRadius:10,
          padding:"14px 18px",marginBottom:20}}>
          <div style={{fontWeight:700,color:"var(--danger)",fontSize:13,marginBottom:6,
            fontFamily:"'Syne',sans-serif"}}>⚠ Please fix the following:</div>
          {Object.values(errors).map((e,i)=>(
            <div key={i} style={{color:"var(--danger)",fontSize:13,marginBottom:3}}>• {e}</div>
          ))}
        </div>
      )}

      <button onClick={generate}
        style={{ width:"100%", padding:"15px", background:"linear-gradient(135deg,var(--accent),var(--accent2))",
          border:"none", borderRadius:10, color:"#000", fontWeight:800,
          fontSize:15, cursor:"pointer", fontFamily:"'Syne',sans-serif",
          letterSpacing:"0.05em", textTransform:"uppercase",
          boxShadow:"0 4px 24px var(--accent)33", transition:"opacity .2s" }}
        onMouseOver={e=>e.target.style.opacity=".85"}
        onMouseOut={e=>e.target.style.opacity="1"}
      >
        Generate Report →
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
