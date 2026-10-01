import React, { useEffect, useState } from "react";
import { Card, Input, Label, ErrorMsg, Tag } from "../ui";
import { listMembers, addMember, setMemberBlocked, removeMember } from "./managementApi";
import { isValidEmail } from "./validators";

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(randomPassword());
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  const refresh = () => {
    setLoading(true);
    listMembers().then(setMembers).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const errs = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (!email.trim()) errs.email = "Email is required.";
    else if (!isValidEmail(email)) errs.email = "Please enter a valid email address.";
    if (password.length < 6) errs.password = "Password must be at least 6 characters.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setCreating(true);
    try {
      await addMember(name.trim(), email.trim(), password);
      setLastCreated({ email: email.trim(), password });
      setSuccess(true);
      setName(""); setEmail("");
      setPassword(randomPassword());
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleBlock = async (m) => {
    try { await setMemberBlocked(m.id, !m.blocked); refresh(); } catch (e) { setError(e.message); }
  };

  const remove = async (m) => {
    if (!confirm(`Remove ${m.name || m.email}? They will lose access immediately.`)) return;
    try { await removeMember(m.id); refresh(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,marginBottom:24}}>Members</h1>

      <Card style={{marginBottom:24}}>
        <Label>Add Member</Label>
        <form onSubmit={create} style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 160px"}}>
            <Input value={name} onChange={setName} placeholder="Full name" error={fieldErrors.name} />
          </div>
          <div style={{flex:"2 1 220px"}}>
            <Input value={email} onChange={setEmail} placeholder="member@example.com" type="email" error={fieldErrors.email} />
          </div>
          <div style={{flex:"1 1 160px"}}>
            <Input value={password} onChange={setPassword} placeholder="Temp password" error={fieldErrors.password} />
          </div>
          <button type="submit" disabled={creating}
            style={{ padding:"0 20px", background:"linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",
              border:"none", borderRadius:8, color:"var(--on-solid)", fontWeight:800, fontSize:13,
              cursor: creating?"default":"pointer", fontFamily:"'Syne',sans-serif", opacity: creating?.6:1 }}>
            {creating ? "Adding…" : "+ Add Member"}
          </button>
        </form>
        <ErrorMsg msg={error} />
        {success && (
          <div style={{color:"var(--accent)",fontSize:13,fontWeight:600,marginTop:8}}>✓ Member added successfully.</div>
        )}
        {lastCreated && (
          <div style={{marginTop:14,padding:"12px 14px",background:"var(--surface)",border:"1px solid var(--border)",
            borderRadius:8,fontSize:13}}>
            Share these credentials with the member — this is the only time the password is shown:
            <div style={{marginTop:6,fontFamily:"'DM Mono',monospace"}}>
              {lastCreated.email} / {lastCreated.password}
            </div>
          </div>
        )}
      </Card>

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {!loading && members.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No members yet.</div></Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {members.map(m => (
          <Card key={m.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span>{m.name || m.email}</span>
              <span style={{color:"var(--muted)",fontSize:13}}>{m.email}</span>
              {m.blocked && <Tag color="var(--danger)">Blocked</Tag>}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={() => toggleBlock(m)}
                style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
                  color:"var(--muted)",cursor:"pointer",padding:"6px 12px",fontSize:12}}>
                {m.blocked ? "Unblock" : "Block"}
              </button>
              <button onClick={() => remove(m)}
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
