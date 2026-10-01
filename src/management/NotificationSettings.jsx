import React, { useEffect, useState } from "react";
import { Card, Section, Label, Input, ErrorMsg } from "../ui";
import { getSettings, updateSettings } from "./managementApi";

const PRIORITY_DEFAULTS = [
  { priority: "High", starts: "Immediately (task creation)", repeats: "Every morning & evening until completed" },
  { priority: "Medium", starts: "2 days before the expected delivery date", repeats: "Every morning & evening until completed" },
  { priority: "Low", starts: "1 day before the expected delivery date", repeats: "Every morning & evening until completed" },
];

export default function NotificationSettings() {
  const [morningSendTime, setMorningSendTime] = useState("");
  const [eveningSendTime, setEveningSendTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSettings()
      .then(s => {
        setMorningSendTime(s.morning_send_time?.slice(0,5) || "08:00");
        setEveningSendTime(s.evening_send_time?.slice(0,5) || "18:00");
        setTimezone(s.timezone || "Europe/Copenhagen");
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateSettings({ morningSendTime, eveningSendTime, timezone });
      setSavedAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{color:"var(--muted)",fontSize:14}}>Loading…</div>;

  return (
    <div>
      <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,marginBottom:24}}>Notification Settings</h1>

      <Card style={{marginBottom:24}}>
        <Section title="Daily Email Schedule">
          <form onSubmit={save}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div>
                <Label>Morning Email Time</Label>
                <Input value={morningSendTime} onChange={setMorningSendTime} type="time" />
              </div>
              <div>
                <Label>Evening Email Time</Label>
                <Input value={eveningSendTime} onChange={setEveningSendTime} type="time" />
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <Label>Timezone</Label>
              <Input value={timezone} onChange={setTimezone} placeholder="e.g. Europe/Copenhagen" />
              <div style={{marginTop:5,fontSize:11,color:"var(--muted)"}}>
                IANA timezone name. Times above are in this timezone.
              </div>
            </div>
            <ErrorMsg msg={error} />
            <button type="submit" disabled={saving}
              style={{ padding:"12px 24px", background:"linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",
                border:"none", borderRadius:10, color:"var(--on-solid)", fontWeight:800, fontSize:14,
                cursor: saving?"default":"pointer", fontFamily:"'Syne',sans-serif", opacity: saving?.6:1 }}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
            {savedAt && <span style={{marginLeft:12,fontSize:12,color:"var(--accent)"}}>✓ Saved</span>}
          </form>
        </Section>
      </Card>

      <Card>
        <Section title="Priority Defaults" accent="var(--muted)">
          <div style={{color:"var(--muted)",fontSize:12,marginBottom:14}}>
            Applied automatically unless overridden on an individual task.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {PRIORITY_DEFAULTS.map(p => (
              <div key={p.priority} style={{display:"grid",gridTemplateColumns:"90px 1fr",gap:12,fontSize:13}}>
                <div style={{fontWeight:700}}>{p.priority}</div>
                <div style={{color:"var(--text)"}}>
                  Starts: {p.starts}<br/>
                  <span style={{color:"var(--muted)"}}>{p.repeats}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </Card>
    </div>
  );
}
