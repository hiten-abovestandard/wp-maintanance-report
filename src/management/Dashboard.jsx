import React, { useEffect, useMemo, useState } from "react";
import { Card, Tag, Input } from "../ui";
import { listTasks, listMembers, deleteTask, PRIORITY_LABEL, STATUS_LABEL, isOverdue, assigneeNames, todayISODate } from "./managementApi";

function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const PRIORITY_FILTERS = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue / Missed" },
];

const DATE_FILTERS = [
  { value: "all", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "custom", label: "Custom Range" },
];

const selectStyle = { background:"var(--input-bg)", border:"1.5px solid var(--border)",
  borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
  outline:"none", fontFamily:"'DM Sans',sans-serif" };

function StatTile({ label, value, color }) {
  return (
    <Card style={{flex:"1 1 140px",textAlign:"center"}}>
      <div style={{fontSize:28,fontWeight:800,color:color||"var(--text)",fontFamily:"'Syne',sans-serif"}}>{value}</div>
      <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{label}</div>
    </Card>
  );
}

export default function Dashboard({ onNew, onOpen }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const refresh = () => {
    setLoading(true);
    Promise.all([listTasks(), listMembers()])
      .then(([t, m]) => { setTasks(t); setMembers(m); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const remove = async (e, task) => {
    e.stopPropagation();
    if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    try {
      await deleteTask(task.id);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const today = todayISODate();
  const tomorrow = addDaysISO(today, 1);

  const counts = useMemo(() => ({
    today: tasks.filter(t => t.expected_delivery_date === today && t.status !== "completed").length,
    pending: tasks.filter(t => t.status === "pending").length,
    completed: tasks.filter(t => t.status === "completed").length,
    overdue: tasks.filter(isOverdue).length,
    highPriority: tasks.filter(t => t.priority === "high" && t.status !== "completed").length,
  }), [tasks, today]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(t => {
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (statusFilter === "overdue" && !isOverdue(t)) return false;
      if (statusFilter !== "all" && statusFilter !== "overdue" && t.status !== statusFilter) return false;
      if (dateFilter === "today" && t.expected_delivery_date !== today) return false;
      if (dateFilter === "tomorrow" && t.expected_delivery_date !== tomorrow) return false;
      if (dateFilter === "upcoming" && t.expected_delivery_date <= today) return false;
      if (dateFilter === "overdue" && !isOverdue(t)) return false;
      if (dateFilter === "custom") {
        if (customFrom && t.expected_delivery_date < customFrom) return false;
        if (customTo && t.expected_delivery_date > customTo) return false;
      }
      if (assigneeFilter !== "all" && !(t.assignees||[]).some(a => a.member?.id === assigneeFilter)) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, search, priorityFilter, statusFilter, dateFilter, assigneeFilter, customFrom, customTo, today, tomorrow]);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800}}>Management Dashboard</h1>
        <button onClick={onNew}
          style={{ padding:"12px 22px", background:"linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",
            border:"none", borderRadius:10, color:"var(--on-solid)", fontWeight:800,
            fontSize:14, cursor:"pointer", fontFamily:"'Syne',sans-serif", letterSpacing:"0.03em" }}>
          + New Task
        </button>
      </div>

      <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <StatTile label="Due Today" value={counts.today} color="var(--accent2)" />
        <StatTile label="Pending" value={counts.pending} color="var(--warn)" />
        <StatTile label="Completed" value={counts.completed} color="var(--accent)" />
        <StatTile label="Overdue" value={counts.overdue} color="var(--danger)" />
        <StatTile label="High Priority" value={counts.highPriority} color="var(--danger)" />
      </div>

      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{flex:"2 1 220px"}}>
          <Input value={search} onChange={setSearch} placeholder="Search by task title…" />
        </div>
        <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} style={{...selectStyle,flex:"1 1 150px"}}>
          {PRIORITY_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...selectStyle,flex:"1 1 150px"}}>
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} style={{...selectStyle,flex:"1 1 150px"}}>
          {DATE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)} style={{...selectStyle,flex:"1 1 150px"}}>
          <option value="all">All Members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
        </select>
      </div>

      {dateFilter === "custom" && (
        <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 150px"}}>
            <Input value={customFrom} onChange={setCustomFrom} type="date" placeholder="From" />
          </div>
          <div style={{flex:"1 1 150px"}}>
            <Input value={customTo} onChange={setCustomTo} type="date" placeholder="To" />
          </div>
        </div>
      )}

      {loading && <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>}
      {error && <div style={{color:"var(--danger)",fontSize:14}}>{error}</div>}
      {!loading && !error && filtered.length===0 && (
        <Card><div style={{color:"var(--muted)",fontSize:14}}>
          {tasks.length===0 ? `No tasks yet. Start with "+ New Task".` : "No tasks match your filters."}
        </div></Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(t => {
          const priority = PRIORITY_LABEL[t.priority];
          const status = STATUS_LABEL[t.status];
          const overdue = isOverdue(t);
          return (
            <Card key={t.id} style={{cursor:"pointer",display:"flex",flexDirection:"column",gap:10}}
              onClick={()=>onOpen(t.id)}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",minWidth:0}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15}}>{t.title}</span>
                  <span style={{color:"var(--muted)",fontSize:13}}>{assigneeNames(t)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"var(--muted)"}}>{t.expected_delivery_date}</span>
                  <Tag color={priority.color}>{priority.label}</Tag>
                  <Tag color={status.color}>{status.label}</Tag>
                  {overdue && <Tag color="var(--danger)">Overdue</Tag>}
                </div>
              </div>
              <div>
                <button onClick={(e)=>remove(e, t)}
                  style={{background:"none",border:"none",color:"var(--danger)",
                    cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
                  Delete
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
