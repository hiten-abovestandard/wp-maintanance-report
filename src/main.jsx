import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { FONTS, css } from "./ui";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import ReportsList from "./ReportsList";
import ReportEditor from "./ReportEditor";
import ReportView from "./ReportView";

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

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [view, setView] = useState("list"); // "list" | "editor" | "preview"
  const [activeReport, setActiveReport] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  const openReport = (report) => {
    setActiveReport(report);
    setView("editor");
  };

  const startNew = () => {
    setActiveReport(null);
    setView("editor");
  };

  const closeEditor = () => {
    setActiveReport(null);
    setView("list");
  };

  const previewReport = (row, data) => {
    setActiveReport(row);
    setPreviewData(data);
    setView("preview");
  };

  const backToEditor = () => setView("editor");

  if (session === undefined) {
    return <div style={{maxWidth:820,margin:"0 auto",padding:"40px 20px"}}><style>{FONTS}{css}</style></div>;
  }

  if (!session) {
    return <div><style>{FONTS}{css}</style><Login /></div>;
  }

  return (
    <div>
      <style>{FONTS}{css}</style>
      <Header email={session.user.email} onSignOut={() => supabase.auth.signOut()} />
      <div style={{maxWidth: view==="list" ? 900 : 820, margin:"0 auto", padding:"40px 20px 80px"}}>
        {view === "list" && <ReportsList onOpen={openReport} onNew={startNew} />}
        {view === "editor" && <ReportEditor report={activeReport} onClose={closeEditor} onPreview={previewReport} />}
        {view === "preview" && <ReportView data={previewData} onBack={backToEditor} />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
