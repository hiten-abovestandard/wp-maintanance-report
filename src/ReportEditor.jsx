import React, { useState } from "react";
import { Label, Input, Tag, Section, Card, ErrorMsg, DynamicList, uid, todayISO, isoToDMY } from "./ui";
import { saveReport } from "./reportsApi";

function blankFields() {
  return {
    stagingUrl: "",
    deletedStaging: "",
    updatedPlugins: [{id:uid(),name:"",extra:""}],
    pendingPlugins: [{id:uid(),name:"",extra:""}],
    themes: [{id:uid(),name:"",extra:""}],
    wpFrom: "",
    wpTo: "",
    additionalNotes: "",
  };
}

export default function ReportEditor({ report, onClose, onPreview }) {
  const [id, setId] = useState(report?.id ?? null);
  const [status, setStatus] = useState(report?.status ?? "draft");
  const [dateISO, setDateISO] = useState(report?.report_date ?? todayISO());
  const [fields, setFields] = useState(() => ({ ...blankFields(), ...(report?.data ?? {}) }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const setField = (key) => (val) => setFields(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if(!dateISO.trim()) e.date = "Date is required.";
    if(!fields.stagingUrl.trim()) e.stagingUrl = "Staging URL is required.";
    const hasUpdated = fields.updatedPlugins.some(p=>p.name.trim());
    const hasPending = fields.pendingPlugins.some(p=>p.name.trim());
    if(!hasUpdated && !hasPending) e.plugins = "Add at least one updated or pending plugin.";
    const pendingMissingReason = fields.pendingPlugins.filter(p=>p.name.trim() && !p.extra?.trim());
    if(pendingMissingReason.length) e.pendingReason = `Add reason for: ${pendingMissingReason.map(p=>p.name).join(", ")}`;
    return e;
  };

  const persist = async (nextStatus) => {
    setSaving(true);
    try {
      const row = await saveReport({ id, report_date: dateISO, status: nextStatus, data: fields });
      setId(row.id);
      setStatus(row.status);
      setSavedAt(new Date());
      return row;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    await persist(status);
  };

  const saveAndClose = async () => {
    const row = await persist(status);
    onClose(row);
  };

  const generate = async () => {
    const e = validate();
    setErrors(e);
    if(Object.keys(e).length!==0) return;
    const row = await persist("final");
    onPreview(row, { ...fields, date: isoToDMY(dateISO) });
  };

  const updatedCount = fields.updatedPlugins.filter(p=>p.name.trim()).length;
  const pendingCount = fields.pendingPlugins.filter(p=>p.name.trim()).length;
  const totalCount = updatedCount + pendingCount;

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <button onClick={()=>onClose(null)} style={{display:"flex",alignItems:"center",gap:6,
          background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,
          color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
          ← Back to Reports
        </button>
        {savedAt && <span style={{fontSize:12,color:"var(--accent)"}}>✓ Saved</span>}
      </div>

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
          <Tag color={status==="final" ? "var(--accent2)" : "var(--warn)"}>{status==="final" ? "Final" : "Draft"}</Tag>
        </div>
      )}

      <Card style={{marginBottom:24}}>
        <Section title="Report Details">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <Label required>Report Date</Label>
              <Input value={dateISO} onChange={setDateISO} type="date" />
              <ErrorMsg msg={errors.date} />
            </div>
          </div>
        </Section>
      </Card>

      <Card style={{marginBottom:24}}>
        <Section title="Staging Details" accent="var(--accent2)">
          <div style={{marginBottom:16}}>
            <Label required>Staging Environment URL (Created Before Updates)</Label>
            <Input value={fields.stagingUrl} onChange={setField("stagingUrl")}
              placeholder="https://example.com/staging-04-06-26" />
            <ErrorMsg msg={errors.stagingUrl} />
          </div>
          <div>
            <Label>Deleted Staging Environment(s)</Label>
            <Input value={fields.deletedStaging} onChange={setField("deletedStaging")}
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
            items={fields.updatedPlugins}
            onChange={setField("updatedPlugins")}
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
            items={fields.pendingPlugins}
            onChange={setField("pendingPlugins")}
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
            items={fields.themes}
            onChange={setField("themes")}
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
              <Input value={fields.wpFrom} onChange={setField("wpFrom")} placeholder="e.g. 6.9.4" />
            </div>
            <div>
              <Label>New Version (To)</Label>
              <Input value={fields.wpTo} onChange={setField("wpTo")} placeholder="e.g. 7.0" />
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
          <textarea value={fields.additionalNotes} onChange={e=>setField("additionalNotes")(e.target.value)}
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

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <button onClick={saveDraft} disabled={saving}
          style={{ flex:"1 1 160px", padding:"14px", background:"var(--surface)",
            border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontWeight:700,
            fontSize:14, cursor: saving ? "default" : "pointer", fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.03em", opacity: saving ? .6 : 1 }}>
          Save Draft
        </button>
        <button onClick={saveAndClose} disabled={saving}
          style={{ flex:"1 1 160px", padding:"14px", background:"var(--surface)",
            border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontWeight:700,
            fontSize:14, cursor: saving ? "default" : "pointer", fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.03em", opacity: saving ? .6 : 1 }}>
          Save & Close
        </button>
        <button onClick={generate} disabled={saving}
          style={{ flex:"2 1 260px", padding:"15px", background:"linear-gradient(135deg,var(--accent),var(--accent2))",
            border:"none", borderRadius:10, color:"#000", fontWeight:800,
            fontSize:15, cursor: saving ? "default" : "pointer", fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.05em", textTransform:"uppercase", boxShadow:"0 4px 24px var(--accent)33",
            opacity: saving ? .6 : 1 }}>
          Generate Report →
        </button>
      </div>
    </div>
  );
}
