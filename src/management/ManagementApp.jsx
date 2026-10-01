import React, { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import TaskForm from "./TaskForm";
import TaskDetail from "./TaskDetail";
import Members from "./Members";
import EmailRecipients from "./EmailRecipients";
import NotificationSettings from "./NotificationSettings";
import { getTask } from "./managementApi";

const TABS = [
  { key: "mgmt-dashboard", label: "Dashboard" },
  { key: "mgmt-members", label: "Members" },
  { key: "mgmt-recipients", label: "Email Recipients" },
  { key: "mgmt-settings", label: "Notification Settings" },
];

function activeTabKey(routeName) {
  if (routeName === "mgmt-members") return "mgmt-members";
  if (routeName === "mgmt-recipients") return "mgmt-recipients";
  if (routeName === "mgmt-settings") return "mgmt-settings";
  return "mgmt-dashboard";
}

export default function ManagementApp({ route, nav }) {
  const active = activeTabKey(route.name);
  const goForTab = { "mgmt-dashboard": nav.goMgmtDashboard, "mgmt-members": nav.goMgmtMembers,
    "mgmt-recipients": nav.goMgmtRecipients, "mgmt-settings": nav.goMgmtSettings };
  const [editingTask, setEditingTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(false);

  useEffect(() => {
    if (route.name === "mgmt-task-edit" && route.id) {
      setLoadingTask(true);
      getTask(route.id).then(setEditingTask).finally(() => setLoadingTask(false));
    } else {
      setEditingTask(null);
    }
  }, [route.name, route.id]);

  let body;
  if (route.name === "mgmt-task-new") {
    body = <TaskForm onDone={nav.goMgmtDashboard} onCancel={nav.goMgmtDashboard} />;
  } else if (route.name === "mgmt-task-edit" && route.id) {
    body = loadingTask
      ? <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>
      : <TaskForm task={editingTask} onDone={()=>nav.goMgmtTaskDetail(route.id)} onCancel={()=>nav.goMgmtTaskDetail(route.id)} />;
  } else if (route.name === "mgmt-task-detail" && route.id) {
    body = <TaskDetail taskId={route.id} onBack={nav.goMgmtDashboard} onEdit={nav.goMgmtTaskEdit} />;
  } else if (route.name === "mgmt-members") {
    body = <Members />;
  } else if (route.name === "mgmt-recipients") {
    body = <EmailRecipients />;
  } else if (route.name === "mgmt-settings") {
    body = <NotificationSettings />;
  } else {
    body = <Dashboard onNew={nav.goMgmtTaskNew} onOpen={nav.goMgmtTaskDetail} />;
  }

  const showTabs = route.name !== "mgmt-task-new" && route.name !== "mgmt-task-edit" && route.name !== "mgmt-task-detail";

  return (
    <div>
      {showTabs && (
        <div style={{display:"flex",marginBottom:28,borderBottom:"1px solid var(--border)"}}>
          {TABS.map(t => (
            <button key={t.key} onClick={goForTab[t.key]}
              style={{
                background:"none", border:"none", cursor:"pointer",
                padding:"10px 4px", marginRight:24, fontSize:13, fontWeight:700,
                fontFamily:"'Syne',sans-serif", letterSpacing:"0.03em",
                color: active===t.key ? "var(--text)" : "var(--muted)",
                borderBottom: active===t.key ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      {body}
    </div>
  );
}
