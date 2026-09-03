import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { FONTS, css } from "./ui";
import { supabase } from "./supabaseClient";
import { getReport } from "./reportsApi";
import { getProfile } from "./fullstack/fullstackApi";
import Login from "./Login";
import ReportsList from "./ReportsList";
import ReportEditor from "./ReportEditor";
import ReportView from "./ReportView";
import ClientReport from "./ClientReport";
import AdminApp from "./fullstack/AdminApp";
import TesterApp from "./fullstack/TesterApp";

const ROLE_LABEL = {
  wordpress: { admin: "WordPress Admin" },
  fullstack: { admin: "Full-Stack Admin", tester: "Full-Stack Tester" },
};

function ThemeToggle({ theme, onToggle }) {
  return (
    <button onClick={onToggle} title={theme==="light" ? "Switch to dark mode" : "Switch to light mode"}
      style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
        color:"var(--text)",cursor:"pointer",padding:"6px 10px",fontSize:14,lineHeight:1}}>
      {theme==="light" ? "🌙" : "☀️"}
    </button>
  );
}

function Header({ email, roleLabel, onSignOut, theme, onToggleTheme }) {
  return (
    <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:12,
      padding:"14px 20px",borderBottom:"1px solid var(--border)"}}>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      {roleLabel && (
        <span style={{fontSize:11,letterSpacing:"0.06em",textTransform:"uppercase",
          color:"var(--accent)",fontWeight:700,fontFamily:"'Syne',sans-serif"}}>{roleLabel}</span>
      )}
      <span style={{fontSize:12,color:"var(--muted)"}}>{email}</span>
      <button onClick={onSignOut}
        style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
          color:"var(--muted)",cursor:"pointer",padding:"6px 12px",fontSize:12,
          fontFamily:"'DM Sans',sans-serif"}}>
        Sign Out
      </button>
    </div>
  );
}

function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean);
  if (parts[0] === "report" && parts[1]) {
    if (parts[1] === "new") return { name: "editor", id: null };
    if (parts[2] === "client") return { name: "client", id: parts[1] };
    return { name: "editor", id: parts[1] };
  }
  if (parts[0] === "fs") {
    if (parts[1] === "tasks") {
      if (parts[2] === "new") return { name: "fs-task-new" };
      if (parts[2] === "trash") return { name: "fs-task-trash" };
      if (parts[2] && parts[3] === "report") return { name: "fs-task-report", id: parts[2] };
      return { name: "fs-tasks" };
    }
    if (parts[1] === "settings") return { name: "fs-settings" };
    if (parts[1] === "testers") return { name: "fs-testers" };
    if (parts[1] === "my-tasks") return { name: "fs-my-tasks" };
    if (parts[1] === "task" && parts[2]) return { name: "fs-task-detail", id: parts[2] };
  }
  return { name: "list" };
}

const goList = () => { location.hash = "#/"; };
const goNew = () => { location.hash = "#/report/new"; };
const goEditor = (id) => { location.hash = `#/report/${id}`; };
const goClient = (id) => { location.hash = `#/report/${id}/client`; };

const fsNav = {
  goFsTasks: () => { location.hash = "#/fs/tasks"; },
  goFsTaskNew: () => { location.hash = "#/fs/tasks/new"; },
  goFsTaskReport: (id) => { location.hash = `#/fs/tasks/${id}/report`; },
  goFsTaskTrash: () => { location.hash = "#/fs/tasks/trash"; },
  goFsSettings: () => { location.hash = "#/fs/settings"; },
  goFsTesters: () => { location.hash = "#/fs/testers"; },
  goFsMyTasks: () => { location.hash = "#/fs/my-tasks"; },
  goFsTaskDetail: (id) => { location.hash = `#/fs/task/${id}`; },
};

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = none found
  const [profileError, setProfileError] = useState("");
  const [route, setRoute] = useState(parseHash());
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [preview, setPreview] = useState(null); // { data } shown as an overlay on top of the editor
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onHashChange = () => { setPreview(null); setRoute(parseHash()); };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Supabase silently refreshes the access token on a timer and whenever the
  // tab regains focus, which hands us a new `session` object for the same
  // user each time. Keying these effects off `userId` (stable across a
  // refresh) instead of the whole `session` object stops that from
  // re-triggering profile/report refetches and blanking the UI on every
  // tab switch.
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) { setProfile(undefined); return; }
    setProfile(undefined);
    setProfileError("");
    getProfile(userId)
      .then(setProfile)
      .catch(e => { setProfileError(e.message); setProfile(null); });
  }, [userId]);

  useEffect(() => {
    if (!profile) return;
    if (profile.department === "fullstack" && route.name === "list") {
      location.hash = profile.role === "admin" ? "#/fs/tasks" : "#/fs/my-tasks";
    }
  }, [profile, route.name]);

  useEffect(() => {
    if (!userId || profile?.department !== "wordpress") return;
    if ((route.name === "editor" || route.name === "client") && route.id) {
      setRouteLoading(true);
      setRouteError("");
      getReport(route.id)
        .then(setRouteData)
        .catch(e => setRouteError(e.message))
        .finally(() => setRouteLoading(false));
    } else {
      setRouteData(null);
    }
  }, [route.name, route.id, userId, profile]);

  const onIdAssigned = (id) => {
    history.replaceState(null, "", `${location.pathname}${location.search}#/report/${id}`);
  };

  if (session === undefined) {
    return <div style={{maxWidth:820,margin:"0 auto",padding:"40px 20px"}}><style>{FONTS}{css}</style></div>;
  }

  if (!session) {
    return <div><style>{FONTS}{css}</style><Login /></div>;
  }

  if (profile === undefined) {
    return <div style={{maxWidth:820,margin:"0 auto",padding:"40px 20px"}}><style>{FONTS}{css}</style></div>;
  }

  if (!profile || profile.blocked) {
    const message = profile?.blocked
      ? "Your account has been blocked. Contact your admin."
      : profileError || "No access has been set up for this account yet. Contact your admin.";
    return (
      <div>
        <style>{FONTS}{css}</style>
        <div style={{maxWidth:420,margin:"0 auto",padding:"80px 20px",textAlign:"center"}}>
          <div style={{color:"var(--muted)",fontSize:14,marginBottom:20}}>{message}</div>
          <button onClick={() => supabase.auth.signOut()}
            style={{background:"none",border:"1px solid var(--border)",borderRadius:8,
              color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13}}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  let body;
  if (profile.department === "fullstack") {
    body = profile.role === "admin"
      ? <AdminApp route={route} nav={fsNav} />
      : <TesterApp route={route} profile={profile} nav={fsNav} />;
  } else if (route.name === "list") {
    body = <ReportsList onOpen={r=>goEditor(r.id)} onNew={goNew} onOpenClient={r=>goClient(r.id)} />;
  } else if (routeLoading) {
    body = <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>;
  } else if (routeError) {
    body = (
      <div>
        <div style={{color:"var(--danger)",fontSize:14,marginBottom:16}}>{routeError}</div>
        <button onClick={goList} style={{background:"var(--surface)",border:"1px solid var(--border)",
          borderRadius:8,color:"var(--muted)",cursor:"pointer",padding:"8px 16px",fontSize:13}}>
          ← Back to Reports
        </button>
      </div>
    );
  } else if (route.name === "editor") {
    if (preview) {
      body = <ReportView data={preview.data} onBack={()=>setPreview(null)} />;
    } else {
      body = (
        <ReportEditor
          key={route.id || "new"}
          report={route.id ? routeData : null}
          onClose={goList}
          onPreview={(row, data) => setPreview({ row, data })}
          onIdAssigned={onIdAssigned}
        />
      );
    }
  } else if (route.name === "client" && routeData) {
    body = <ClientReport key={route.id} report={routeData} onBack={goList} />;
  } else {
    body = <ReportsList onOpen={r=>goEditor(r.id)} onNew={goNew} onOpenClient={r=>goClient(r.id)} />;
  }

  const isWideRoute = route.name === "list" || route.name === "fs-tasks"
    || route.name === "fs-settings" || route.name === "fs-testers" || route.name === "fs-my-tasks"
    || route.name === "fs-task-trash";

  return (
    <div>
      <style>{FONTS}{css}</style>
      <Header email={session.user.email} roleLabel={ROLE_LABEL[profile.department]?.[profile.role]}
        onSignOut={() => supabase.auth.signOut()} theme={theme} onToggleTheme={toggleTheme} />
      <div style={{maxWidth: isWideRoute ? 900 : 820, margin:"0 auto", padding:"40px 20px 80px"}}>
        {body}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
