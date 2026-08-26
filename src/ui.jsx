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
  button { transition: opacity .15s ease, border-color .15s ease, transform .1s ease; }
  button:active { transform: scale(0.98); }
  input, select, textarea { transition: border-color .15s ease; }
  .row-card { transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease; }
  .row-card:hover { border-color: var(--accent) !important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,.25); }
  select {
    appearance: none; -webkit-appearance: none; -moz-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 34px !important;
  }
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

export function paginate(items, page, pageSize) {
  if (pageSize === "all") return items;
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

const navBtnStyle = { background:"none", border:"1px solid var(--border)", borderRadius:8,
  color:"var(--text)", padding:"6px 12px", fontSize:13, fontFamily:"'DM Mono',monospace" };

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  if (total === 0) return null;
  const pageCount = pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginTop:20,flexWrap:"wrap"}}>
      <div style={{color:"var(--muted)",fontSize:12}}>{total} total</div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}
            style={{...navBtnStyle, opacity: page<=1 ? .4 : 1, cursor: page<=1 ? "default" : "pointer"}}>‹</button>
          <span style={{fontSize:12,color:"var(--muted)",minWidth:70,textAlign:"center"}}>Page {page} / {pageCount}</span>
          <button onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page >= pageCount}
            style={{...navBtnStyle, opacity: page>=pageCount ? .4 : 1, cursor: page>=pageCount ? "default" : "pointer"}}>›</button>
        </div>
        <select value={pageSize} onChange={e => onPageSizeChange(e.target.value === "all" ? "all" : Number(e.target.value))}
          style={{background:"var(--input-bg)",border:"1.5px solid var(--border)",borderRadius:8,
            padding:"8px 14px",color:"var(--text)",fontSize:12,outline:"none",fontFamily:"'DM Sans',sans-serif"}}>
          <option value={10}>10 / page</option>
          <option value={30}>30 / page</option>
          <option value={50}>50 / page</option>
          <option value="all">All</option>
        </select>
      </div>
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
