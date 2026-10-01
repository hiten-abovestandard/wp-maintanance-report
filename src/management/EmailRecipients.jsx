import React, { useEffect, useState } from "react";
import { Card, Input, Label, ErrorMsg, Tag } from "../ui";
import { listFyiRecipients, addFyiRecipient, setFyiRecipientActive, removeFyiRecipient } from "./managementApi";
import { isValidEmail } from "./validators";

export default function EmailRecipients() {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = () => {
    setLoading(true);
    listFyiRecipients().then(setRecipients).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const errs = {};
    if (!email.trim()) errs.email = "Email is required.";
    else if (!isValidEmail(email)) errs.email = "Please enter a valid email address.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setCreating(true);
    try {
      await addFyiRecipient(email.trim(), name.trim());
      setSuccess(true);
      setName(""); setEmail("");
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (r) => {
    try { await setFyiRecipientActive(r.id, !r.active); refresh(); } catch (e) { setError(e.message); }
  };

  const remove = async (r) => {
    if (!confirm(`Remove ${r.email} from FYI recipients?`)) return;
    try { await removeFyiRecipient(r.id); refresh(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,marginBottom:8}}>Email Recipients</h1>
      <div style={{color:"var(--muted)",fontSize:13,marginBottom:24}}>
        Assigned members automatically receive updates for tasks assigned to them. Add people below who should
        receive every daily update for information purposes (e.g. the CEO, a manager) even if they aren't assigned to any task.
      </div>

      <Card style={{marginBottom:24}}>
        <Label>Add FYI Recipient</Label>
        <form onSubmit={create} style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 160px"}}>
            <Input value={name} onChange={setName} placeholder="Name (optional)" />
          </div>
          <div style={{flex:"2 1 220px"}}>
            <Input value={email} onChange={setEmail} placeholder="ceo@example.com" type="email" error={fieldErrors.email} />
          </div>
          <button type="submit" disabled={creating}
            style={{ padding:"0 20px", background:"linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",
              border:"none", borderRadius:8, color:"var(--on-solid)", fontWeight:800, fontSize:13,
              cursor: creating?"default":"pointer", fontFamily:"'Syne',sans-serif", opacity: creating?.6:1 }}>
            {creating ? "Adding…" : "+ Add Recipient"}
          </button>
        </form>
        <ErrorMsg msg={error} />
        {success && (
          <div style={{color:"var(--accent)",fontSize:13,fontWeight:600,marginTop:8}}>✓ Recipient added successfully.</div>
        )}
      </Card>

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {!loading && recipients.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No FYI recipients yet.</div></Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {recipients.map(r => (
          <Card key={r.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span>{r.name || r.email}</span>
              {r.name && <span style={{color:"var(--muted)",fontSize:13}}>{r.email}</span>}
              {!r.active && <Tag color="var(--muted)">Inactive</Tag>}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={() => toggleActive(r)}
                style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
                  color:"var(--muted)",cursor:"pointer",padding:"6px 12px",fontSize:12}}>
                {r.active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => remove(r)}
                style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:13}}>
                Remove
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
