import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { FONTS, css } from "./ui";
import { supabase } from "./supabaseClient";
import { getReport } from "./reportsApi";
import Login from "./Login";
import ReportsList from "./ReportsList";
import ReportEditor from "./ReportEditor";
import ReportView from "./ReportView";
import ClientReport from "./ClientReport";

function Header({ email, onSignOut }) {
  return (
    <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:12,
      padding:"14px 20px",borderBottom:"1px solid var(--border)"}}>
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
  return { name: "list" };
}

const goList = () => { location.hash = "#/"; };
const goNew = () => { location.hash = "#/report/new"; };
const goEditor = (id) => { location.hash = `#/report/${id}`; };
const goClient = (id) => { location.hash = `#/report/${id}/client`; };

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [route, setRoute] = useState(parseHash());
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [preview, setPreview] = useState(null); // { data } shown as an overlay on top of the editor

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

  useEffect(() => {
    if (!session) return;
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
  }, [route.name, route.id, session]);

  const onIdAssigned = (id) => {
    history.replaceState(null, "", `${location.pathname}${location.search}#/report/${id}`);
  };

  if (session === undefined) {
    return <div style={{maxWidth:820,margin:"0 auto",padding:"40px 20px"}}><style>{FONTS}{css}</style></div>;
  }

  if (!session) {
    return <div><style>{FONTS}{css}</style><Login /></div>;
  }

  let body;
  if (route.name === "list") {
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
  }

  return (
    <div>
      <style>{FONTS}{css}</style>
      <Header email={session.user.email} onSignOut={() => supabase.auth.signOut()} />
      <div style={{maxWidth: route.name==="list" ? 900 : 820, margin:"0 auto", padding:"40px 20px 80px"}}>
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
