import React from "react";

export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');`;

export const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0d0f14;
    --surface: #13161e;
    --card: #181c27;
    --border: #252a38;
    --accent: #4fffb0;
    --accent2: #7c6dfa;
    --danger: #ff5f6d;
    --warn: #ffc744;
    --text: #e8eaf0;
    --muted: #6b7280;
    --input-bg: #0f1119;
  }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }
  h1,h2,h3,h4 { font-family: 'Syne', sans-serif; }
  code, .mono { font-family: 'DM Mono', monospace; }
`;

export function uid() { return Math.random().toString(36).slice(2, 8); }

export function pad2(n) { return String(n).padStart(2, "0"); }

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function isoToDMY(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export function Label({ children, required }) {
  return (
    <label style={{ display:"block", fontSize:11, fontWeight:600, letterSpacing:"0.08em",
      textTransform:"uppercase", color:"var(--muted)", marginBottom:6, fontFamily:"'Syne',sans-serif" }}>
      {children}{required && <span style={{color:"var(--danger)",marginLeft:3}}>*</span>}
    </label>
  );
}

export function Input({ value, onChange, placeholder, style={}, ...rest }) {
  return (
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%", background:"var(--input-bg)", border:"1.5px solid var(--border)",
        borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
        outline:"none", transition:"border .2s", fontFamily:"'DM Sans',sans-serif", ...style }}
      onFocus={e=>e.target.style.borderColor="var(--accent)"}
      onBlur={e=>e.target.style.borderColor="var(--border)"}
      {...rest}
    />
  );
}

export function Tag({ children, color="var(--accent)" }) {
  return (
    <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20,
      background:color+"22", color, fontSize:11, fontWeight:600,
      letterSpacing:"0.06em", textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>
      {children}
    </span>
  );
}

export function Section({ title, accent="var(--accent)", children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ width:3, height:18, borderRadius:2, background:accent }} />
        <h3 style={{ fontSize:13, letterSpacing:"0.1em", textTransform:"uppercase", color:accent, fontWeight:700 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function Card({ children, style={}, ...rest }) {
  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--border)",
      borderRadius:12, padding:"20px 22px", ...style }} {...rest}>
      {children}
    </div>
  );
}

export function ErrorMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6,
      color:"var(--danger)", fontSize:12, fontWeight:500 }}>
      <span style={{fontSize:14}}>⚠</span> {msg}
    </div>
  );
}

// items: [{id, name, extra?}]
export function DynamicList({ items, onChange, placeholder, extraField=null, accent="var(--accent)" }) {
  const update = (id, key, val) => {
    onChange(items.map(it => it.id===id ? {...it,[key]:val} : it));
  };
  const remove = (id) => {
    const next = items.filter(it=>it.id!==id);
    if(next.length===0) next.push({id:uid(), name:"", extra:""});
    onChange(next);
  };
  const addIfNeeded = (id, val) => {
    const idx = items.findIndex(it=>it.id===id);
    const updated = items.map(it => it.id===id ? {...it,name:val} : it);
    if(val.trim() && idx===items.length-1) {
      onChange([...updated, {id:uid(), name:"", extra:""}]);
    } else {
      onChange(updated);
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {items.map((it,i) => (
        <div key={it.id} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
          <div style={{display:"flex",alignItems:"center",minWidth:24,paddingTop:12,
            color:"var(--muted)",fontSize:12,fontFamily:"'DM Mono',monospace"}}>
            {i+1}.
          </div>
          <div style={{flex:1}}>
            <Input
              value={it.name}
              onChange={val => addIfNeeded(it.id, val)}
              placeholder={placeholder}
            />
            {extraField && it.name.trim() && (
              <textarea value={it.extra||""} onChange={e=>update(it.id,"extra",e.target.value)}
                placeholder={extraField}
                rows={2}
                style={{ marginTop:6, width:"100%", background:"var(--input-bg)",
                  border:"1.5px solid var(--border)", borderRadius:8,
                  padding:"10px 14px", color:"var(--text)", fontSize:13,
                  outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif" }}
                onFocus={e=>e.target.style.borderColor=accent}
                onBlur={e=>e.target.style.borderColor="var(--border)"}
              />
            )}
          </div>
          {items.length > 1 && it.name.trim() && (
            <button onClick={()=>remove(it.id)}
              style={{ marginTop:8, background:"none", border:"none", color:"var(--muted)",
                cursor:"pointer", fontSize:16, padding:"2px 6px", lineHeight:1 }}
              title="Remove">×</button>
          )}
        </div>
      ))}
    </div>
  );
}
