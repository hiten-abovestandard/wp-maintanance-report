import React, { useRef, useState } from "react";
import { Card } from "../ui";
import { updateTaskItem, uploadEvidenceImage } from "./fullstackApi";

export default function ChecklistItemEditor({ item, taskId, onChange }) {
  const [comment, setComment] = useState(item.comment || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const toggle = async () => {
    try {
      await updateTaskItem(item.id, { checked: !item.checked });
      onChange();
    } catch (e) { setError(e.message); }
  };

  const commitComment = async () => {
    if (comment === (item.comment || "")) return;
    try { await updateTaskItem(item.id, { comment }); } catch (e) { setError(e.message); }
  };

  const pickImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadEvidenceImage(taskId, item.id, file);
      await updateTaskItem(item.id, { image_url: url });
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = async () => {
    try {
      await updateTaskItem(item.id, { image_url: null });
      onChange();
    } catch (e) { setError(e.message); }
  };

  return (
    <Card style={{ borderColor: item.checked ? "var(--accent)" : "var(--border)", transition: "border-color .15s" }}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <input type="checkbox" checked={item.checked} onChange={toggle}
          style={{width:20,height:20,marginTop:2,cursor:"pointer",accentColor:"var(--accent)"}} />
        <div style={{flex:1}}>
          <div style={{fontWeight:600,marginBottom:8}}>{item.label}</div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} onBlur={commitComment}
            placeholder="Optional comment…" rows={2}
            style={{ width:"100%", background:"var(--input-bg)", border:"1.5px solid var(--border)",
              borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:13,
              outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif", marginBottom:8 }} />
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <label style={{fontSize:12,color:"var(--muted)",cursor:"pointer",
              border:"1px solid var(--border)",borderRadius:8,padding:"6px 12px"}}>
              {uploading ? "Uploading…" : item.image_url ? "Replace Image" : "Attach Image"}
              <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} disabled={uploading} style={{display:"none"}} />
            </label>
            {item.image_url && (
              <>
                <img src={item.image_url} alt="" style={{maxWidth:120,borderRadius:8,border:"1px solid var(--border)"}} />
                <button onClick={removeImage}
                  style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:12}}>
                  Remove
                </button>
              </>
            )}
          </div>
          {item.updated_by_profile?.email && (
            <div style={{color:"var(--muted)",fontSize:11,marginTop:8}}>
              Last updated by {item.updated_by_profile.email}
            </div>
          )}
          {error && <div style={{color:"var(--danger)",fontSize:12,marginTop:6}}>{error}</div>}
        </div>
      </div>
    </Card>
  );
}
