import React from "react";
import TaskList from "./TaskList";
import TaskForm from "./TaskForm";
import TaskReport from "./TaskReport";
import GlobalSettings from "./GlobalSettings";
import Testers from "./Testers";

const TABS = [
  { key: "fs-tasks", label: "Tasks" },
  { key: "fs-settings", label: "Global Settings" },
  { key: "fs-testers", label: "Testers" },
];

function activeTabKey(routeName) {
  if (routeName === "fs-settings") return "fs-settings";
  if (routeName === "fs-testers") return "fs-testers";
  return "fs-tasks";
}

export default function AdminApp({ route, nav }) {
  const active = activeTabKey(route.name);
  const goForTab = { "fs-tasks": nav.goFsTasks, "fs-settings": nav.goFsSettings, "fs-testers": nav.goFsTesters };

  let body;
  if (route.name === "fs-task-new") {
    body = <TaskForm onDone={nav.goFsTasks} onCancel={nav.goFsTasks} />;
  } else if (route.name === "fs-task-report" && route.id) {
    body = <TaskReport taskId={route.id} onBack={nav.goFsTasks} />;
  } else if (route.name === "fs-settings") {
    body = <GlobalSettings />;
  } else if (route.name === "fs-testers") {
    body = <Testers />;
  } else {
    body = <TaskList onNew={nav.goFsTaskNew} onOpenReport={nav.goFsTaskReport} />;
  }

  return (
    <div>
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
      {body}
    </div>
  );
}
