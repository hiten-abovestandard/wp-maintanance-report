import React, { useEffect, useMemo, useState } from "react";
import { Card, Input, Label, ErrorMsg, Tag, Pagination, paginate } from "../ui";
import { listTesters, addTester, setTesterBlocked, removeTester } from "./fullstackApi";

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

const STATUS_FILTERS = [
  { value: "all", label: "All testers" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
];

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "email", label: "Email (A–Z)" },
];

const selectStyle = { background:"var(--input-bg)", border:"1.5px solid var(--border)",
  borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
  outline:"none", fontFamily:"'DM Sans',sans-serif" };

export default function Testers() {
  const [testers, setTesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(randomPassword());
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const refresh = () => {
    setLoading(true);
    listTesters().then(setTesters).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setCreating(true);
    try {
      await addTester(email.trim(), password);
      setLastCreated({ email: email.trim(), password });
      setEmail("");
      setPassword(randomPassword());
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleBlock = async (t) => {
    try { await setTesterBlocked(t.id, !t.blocked); refresh(); } catch (e) { setError(e.message); }
  };

  const remove = async (t) => {
    if (!confirm(`Remove ${t.email}? They will lose access immediately.`)) return;
    try { await removeTester(t.id); refresh(); } catch (e) { setError(e.message); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = testers.filter(t => {
      if (statusFilter === "active" && t.blocked) return false;
      if (statusFilter === "blocked" && !t.blocked) return false;
      if (q && !t.email.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "email") list = [...list].sort((a, b) => a.email.localeCompare(b.email));
    else if (sort === "oldest") list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return list;
  }, [testers, search, statusFilter, sort]);

  useEffect(() => { setPage(1); }, [search, statusFilter, sort, pageSize]);
  const paged = paginate(filtered, page, pageSize);

  return (
    <div>
      <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,marginBottom:24}}>Testers</h1>

      <Card style={{marginBottom:24}}>
        <Label>Add Tester</Label>
        <form onSubmit={create} style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
          <div style={{flex:"2 1 220px"}}>
            <Input value={email} onChange={setEmail} placeholder="tester@example.com" type="email" />
          </div>
          <div style={{flex:"1 1 160px"}}>
            <Input value={password} onChange={setPassword} placeholder="Temp password" />
          </div>
          <button type="submit" disabled={creating}
            style={{ padding:"0 20px", background:"linear-gradient(135deg,var(--accent),var(--accent2))",
              border:"none", borderRadius:8, color:"#000", fontWeight:800, fontSize:13,
              cursor: creating?"default":"pointer", fontFamily:"'Syne',sans-serif", opacity: creating?.6:1 }}>
            {creating ? "Adding…" : "+ Add Tester"}
          </button>
        </form>
        <ErrorMsg msg={error} />
        {lastCreated && (
          <div style={{marginTop:14,padding:"12px 14px",background:"var(--surface)",border:"1px solid var(--border)",
            borderRadius:8,fontSize:13}}>
            Share these credentials with the tester — this is the only time the password is shown:
            <div style={{marginTop:6,fontFamily:"'DM Mono',monospace"}}>
              {lastCreated.email} / {lastCreated.password}
            </div>
          </div>
        )}
      </Card>

      {testers.length > 0 && (
        <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          <div style={{flex:"2 1 220px"}}>
            <Input value={search} onChange={setSearch} placeholder="Search by email…" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{...selectStyle, flex:"1 1 160px"}}>
            {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{...selectStyle, flex:"1 1 160px"}}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {!loading && testers.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No testers yet.</div></Card>
      )}
      {!loading && testers.length>0 && filtered.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No testers match your search/filter.</div></Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {paged.map(t => (
          <Card key={t.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span>{t.email}</span>
              {t.blocked && <Tag color="var(--danger)">Blocked</Tag>}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={() => toggleBlock(t)}
                style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
                  color:"var(--muted)",cursor:"pointer",padding:"6px 12px",fontSize:12}}>
                {t.blocked ? "Unblock" : "Block"}
              </button>
              <button onClick={() => remove(t)}
                style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:13}}>
                Remove
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length}
        onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}
