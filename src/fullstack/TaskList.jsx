import React, { useEffect, useMemo, useState } from "react";
import { Card, Tag, Input, Pagination, paginate } from "../ui";
import { listTasks, trashTask, taskStatus, TASK_STATUS_LABEL, assigneeEmails } from "./fullstackApi";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A–Z)" },
];

const selectStyle = { background:"var(--input-bg)", border:"1.5px solid var(--border)",
  borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
  outline:"none", fontFamily:"'DM Sans',sans-serif" };

export default function TaskList({ onNew, onOpenReport, onOpenTrash }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const refresh = () => {
    setLoading(true);
    listTasks().then(setTasks).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const trash = async (e, t) => {
    e.stopPropagation();
    if (!confirm(`Move "${t.name}" to trash?`)) return;
    try { await trashTask(t.id); refresh(); } catch (e) { setError(e.message); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tasks.filter(t => {
      const status = taskStatus(t);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [t.name, t.group?.name, assigneeEmails(t)].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "oldest") list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return list;
  }, [tasks, search, statusFilter, sort]);

  useEffect(() => { setPage(1); }, [search, statusFilter, sort, pageSize]);
  const paged = paginate(filtered, page, pageSize);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800}}>Tasks</h1>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onOpenTrash}
            style={{background:"none",border:"1px solid var(--border)",borderRadius:10,
              color:"var(--muted)",cursor:"pointer",padding:"12px 18px",fontSize:13,
              fontFamily:"'DM Sans',sans-serif"}}>
            Trash
          </button>
          <button onClick={onNew}
            style={{ padding:"12px 22px", background:"linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",
              border:"none", borderRadius:10, color:"var(--on-solid)", fontWeight:800,
              fontSize:14, cursor:"pointer", fontFamily:"'Syne',sans-serif", letterSpacing:"0.03em" }}>
            + New Task
          </button>
        </div>
      </div>

      <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <div style={{flex:"2 1 240px"}}>
          <Input value={search} onChange={setSearch} placeholder="Search by name, group or tester…" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{...selectStyle, flex:"1 1 160px"}}>
          {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{...selectStyle, flex:"1 1 160px"}}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {error && <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>}
      {!loading && !error && filtered.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>
          {tasks.length===0 ? `No tasks yet. Start with "+ New Task".` : "No tasks match your search/filter."}
        </div></Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {paged.map(t => {
          const status = taskStatus(t);
          const meta = TASK_STATUS_LABEL[status];
          const total = t.task_items?.length || 0;
          const done = t.task_items?.filter(i => i.checked).length || 0;
          return (
            <Card key={t.id} className="row-card" style={{cursor:"pointer",display:"flex",alignItems:"center",
              justifyContent:"space-between",gap:16,flexWrap:"wrap"}}
              onClick={() => onOpenReport(t.id)}>
              <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <span style={{fontWeight:700}}>{t.name}</span>
                <Tag color={meta.color}>{meta.label}</Tag>
                <span style={{color:"var(--muted)",fontSize:12}}>{t.group?.name}</span>
                <span style={{color:"var(--muted)",fontSize:12}}>{done}/{total} checked</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{color:"var(--muted)",fontSize:13}}>{assigneeEmails(t)}</div>
                <button onClick={(e) => trash(e, t)}
                  style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:13}}>
                  Delete
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length}
        onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}
