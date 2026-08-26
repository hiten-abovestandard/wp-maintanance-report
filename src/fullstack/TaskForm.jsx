import React, { useEffect, useState } from "react";
import { Card, Label, Input, ErrorMsg } from "../ui";
import { listGroups, listTesters, createTask } from "./fullstackApi";

const selectStyle = { width:"100%", background:"var(--input-bg)", border:"1.5px solid var(--border)",
  borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
  outline:"none", fontFamily:"'DM Sans',sans-serif" };

export default function TaskForm({ onDone, onCancel }) {
  const [name, setName] = useState("");
  const [groups, setGroups] = useState([]);
  const [testers, setTesters] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listGroups(), listTesters()]).then(([g, t]) => {
      const activeTesters = t.filter(x => !x.blocked);
      setGroups(g);
      setTesters(activeTesters);
      if (g[0]) setGroupId(g[0].id);
      if (activeTesters[0]) setAssigneeIds([activeTesters[0].id]);
    }).catch(e => setError(e.message));
  }, []);

  const toggleAssignee = (id) => {
    setAssigneeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Task name is required.");
    if (!groupId) return setError("Pick a checklist group.");
    if (assigneeIds.length === 0) return setError("Pick at least one tester to assign.");
    setSaving(true);
    try {
      await createTask({ name: name.trim(), groupId, assigneeIds });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{maxWidth:520}}>
      <h1 style={{fontSize:"clamp(20px,4vw,28px)",fontWeight:800,marginBottom:24}}>New Task</h1>
      <Card>
        <form onSubmit={submit}>
          <div style={{marginBottom:16}}>
            <Label required>Task Name</Label>
            <Input value={name} onChange={setName} placeholder="e.g. Sprint 12 QA" />
          </div>
          <div style={{marginBottom:16}}>
            <Label required>Checklist Group</Label>
            <select value={groupId} onChange={e => setGroupId(e.target.value)} style={selectStyle}>
              {groups.length===0 && <option value="">No checklist groups yet — add one in Global Settings</option>}
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.checklist_items?.length||0} items)</option>)}
            </select>
          </div>
          <div style={{marginBottom:8}}>
            <Label required>Assign To Tester(s)</Label>
            {testers.length===0 && (
              <div style={{color:"var(--muted)",fontSize:13}}>No testers yet — add one in Testers.</div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:220,overflowY:"auto"}}>
              {testers.map(t => (
                <label key={t.id} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",
                  background:"var(--input-bg)",border:"1.5px solid var(--border)",borderRadius:8,padding:"10px 14px"}}>
                  <input type="checkbox" checked={assigneeIds.includes(t.id)} onChange={() => toggleAssignee(t.id)}
                    style={{width:16,height:16,cursor:"pointer",accentColor:"var(--accent)"}} />
                  <span style={{fontSize:14}}>{t.email}</span>
                </label>
              ))}
            </div>
          </div>
          <ErrorMsg msg={error} />
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <button type="submit" disabled={saving}
              style={{ padding:"12px 22px", background:"linear-gradient(135deg,var(--accent),var(--accent2))",
                border:"none", borderRadius:10, color:"#000", fontWeight:800,
                fontSize:14, cursor: saving ? "default":"pointer", fontFamily:"'Syne',sans-serif",
                letterSpacing:"0.03em", opacity: saving?.6:1 }}>
              {saving ? "Creating…" : "Create Task"}
            </button>
            <button type="button" onClick={onCancel}
              style={{background:"none",border:"1px solid var(--border)",borderRadius:10,
                color:"var(--muted)",cursor:"pointer",padding:"12px 22px",fontSize:14,
                fontFamily:"'DM Sans',sans-serif"}}>
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
