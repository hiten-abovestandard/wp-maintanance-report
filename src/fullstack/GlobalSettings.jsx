import React, { useEffect, useMemo, useState } from "react";
import { Card, Input, Label, ErrorMsg, Pagination, paginate } from "../ui";
import {
  listGroups, createGroup, renameGroup, deleteGroup,
  listGroupItems, addChecklistItem, updateChecklistItem, deleteChecklistItem,
} from "./fullstackApi";

const itemInputStyle = { flex:1, background:"var(--input-bg)", border:"1.5px solid var(--border)",
  borderRadius:8, padding:"8px 12px", color:"var(--text)", fontSize:13, outline:"none",
  fontFamily:"'DM Sans',sans-serif" };

const selectStyle = { background:"var(--input-bg)", border:"1.5px solid var(--border)",
  borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
  outline:"none", fontFamily:"'DM Sans',sans-serif" };

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "name", label: "Name (A–Z)" },
];

function GroupItems({ groupId }) {
  const [items, setItems] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");

  const refresh = () => listGroupItems(groupId).then(setItems).catch(e => setError(e.message));
  useEffect(() => { refresh(); }, [groupId]);

  const add = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setError("");
    try {
      await addChecklistItem(groupId, newLabel.trim(), items.length);
      setNewLabel("");
      refresh();
    } catch (e) { setError(e.message); }
  };

  const rename = (id, label) => setItems(items.map(it => it.id===id ? { ...it, label } : it));

  const commitRename = async (id, label) => {
    try { await updateChecklistItem(id, label); } catch (e) { setError(e.message); }
  };

  const remove = async (id) => {
    try { await deleteChecklistItem(id); refresh(); } catch (e) { setError(e.message); }
  };

  return (
    <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)"}}>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
        {items.map((it,i) => (
          <div key={it.id} style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{color:"var(--muted)",fontSize:12,minWidth:18,fontFamily:"'DM Mono',monospace"}}>{i+1}.</span>
            <input value={it.label}
              onChange={e => rename(it.id, e.target.value)}
              onBlur={e => commitRename(it.id, e.target.value)}
              style={itemInputStyle} />
            <button onClick={() => remove(it.id)}
              style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:16,padding:"2px 6px"}}
              title="Remove">×</button>
          </div>
        ))}
      </div>
      <form onSubmit={add} style={{display:"flex",gap:8}}>
        <Input value={newLabel} onChange={setNewLabel} placeholder="Add a checklist item…" />
        <button type="submit"
          style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,
            color:"var(--text)",cursor:"pointer",padding:"0 16px",fontSize:13,fontFamily:"'Syne',sans-serif",fontWeight:700}}>
          Add
        </button>
      </form>
      <ErrorMsg msg={error} />
    </div>
  );
}

export default function GlobalSettings() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [names, setNames] = useState({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const refresh = () => {
    setLoading(true);
    listGroups().then(g => {
      setGroups(g);
      setNames(Object.fromEntries(g.map(x => [x.id, x.name])));
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const create = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    try {
      const g = await createGroup(newName.trim());
      setNewName("");
      refresh();
      setExpanded(g.id);
    } catch (e) { setError(e.message); }
  };

  const commitRename = async (id, name) => {
    if (!name.trim()) return;
    try { await renameGroup(id, name.trim()); refresh(); } catch (e) { setError(e.message); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this checklist group and all its items? This can't be undone.")) return;
    try { await deleteGroup(id); refresh(); } catch (e) { setError(e.message); }
  };

  const filteredGroups = useMemo(() => {
    let list = groups.filter(g => g.name.toLowerCase().includes(search.trim().toLowerCase()));
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [groups, search, sort]);

  useEffect(() => { setPage(1); }, [search, sort, pageSize]);
  const pagedGroups = paginate(filteredGroups, page, pageSize);

  return (
    <div>
      <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,marginBottom:24}}>Global Settings</h1>

      <Card style={{marginBottom:24}}>
        <Label>New Checklist Group</Label>
        <form onSubmit={create} style={{display:"flex",gap:8,marginTop:6}}>
          <Input value={newName} onChange={setNewName} placeholder="e.g. Deployment Checklist" />
          <button type="submit"
            style={{ padding:"0 20px", background:"linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",
              border:"none", borderRadius:8, color:"var(--on-solid)", fontWeight:800, fontSize:13,
              cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>
            + Add Group
          </button>
        </form>
        <ErrorMsg msg={error} />
      </Card>

      {groups.length > 0 && (
        <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          <div style={{flex:"2 1 240px"}}>
            <Input value={search} onChange={setSearch} placeholder="Search checklist groups…" />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{...selectStyle, flex:"1 1 160px"}}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {!loading && groups.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No checklist groups yet.</div></Card>
      )}
      {!loading && groups.length>0 && filteredGroups.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No checklist groups match your search.</div></Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {pagedGroups.map(g => (
          <Card key={g.id}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                <input value={names[g.id] ?? g.name}
                  onChange={e => setNames({ ...names, [g.id]: e.target.value })}
                  onBlur={e => commitRename(g.id, e.target.value)}
                  style={{ background:"none", border:"none", outline:"none", color:"var(--text)",
                    fontWeight:700, fontSize:15, fontFamily:"'DM Sans',sans-serif", flex:"0 1 auto", minWidth:80 }} />
                <span style={{color:"var(--muted)",fontSize:12}}>{g.checklist_items?.length||0} items</span>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={() => setExpanded(expanded===g.id ? null : g.id)}
                  style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
                    color:"var(--muted)",cursor:"pointer",padding:"6px 12px",fontSize:12}}>
                  {expanded===g.id ? "Collapse" : "Manage Items"}
                </button>
                <button onClick={() => remove(g.id)}
                  style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:13}}>
                  Delete
                </button>
              </div>
            </div>
            {expanded===g.id && <GroupItems groupId={g.id} />}
          </Card>
        ))}
      </div>

      <Pagination page={page} pageSize={pageSize} total={filteredGroups.length}
        onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}
