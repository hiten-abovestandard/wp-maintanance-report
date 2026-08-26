import React, { useEffect, useMemo, useState } from "react";
import { Card, Tag, Input, Pagination, paginate } from "../ui";
import { listMyTasks, taskStatus, TASK_STATUS_LABEL } from "./fullstackApi";
import TesterTaskDetail from "./TesterTaskDetail";

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

function MyTasks({ userId, onOpen }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    listMyTasks(userId).then(setTasks).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tasks.filter(t => {
      const status = taskStatus(t);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return [t.name, t.group?.name].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "oldest") list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return list;
  }, [tasks, search, statusFilter, sort]);

  useEffect(() => { setPage(1); }, [search, statusFilter, sort, pageSize]);
  const paged = paginate(filtered, page, pageSize);

  return (
    <div>
      <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,marginBottom:24}}>My Tasks</h1>

      {tasks.length > 0 && (
        <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
          <div style={{flex:"2 1 240px"}}>
            <Input value={search} onChange={setSearch} placeholder="Search by name or group…" />
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
      {error && <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>}
      {!loading && !error && tasks.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No tasks assigned to you yet.</div></Card>
      )}
      {!loading && !error && tasks.length>0 && filtered.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>No tasks match your search/filter.</div></Card>
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
              onClick={() => onOpen(t.id)}>
              <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <span style={{fontWeight:700}}>{t.name}</span>
                <Tag color={meta.color}>{meta.label}</Tag>
                <span style={{color:"var(--muted)",fontSize:12}}>{t.group?.name}</span>
              </div>
              <span style={{color:"var(--muted)",fontSize:13}}>{done}/{total} checked</span>
            </Card>
          );
        })}
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length}
        onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}

export default function TesterApp({ route, profile, nav }) {
  if (route.name === "fs-task-detail" && route.id) {
    return <TesterTaskDetail taskId={route.id} onBack={nav.goFsMyTasks} />;
  }
  return <MyTasks userId={profile.id} onOpen={nav.goFsTaskDetail} />;
}
