import React, { useEffect, useRef, useState } from "react";
import { Card, Section, Label, Input, ErrorMsg, MultiSelect } from "../ui";
import { createTask, updateTask, setTaskAssignees, uploadTaskImage, listMembers } from "./managementApi";
import { isValidUrl } from "./validators";

export default function TaskForm({ task, onDone, onCancel }) {
  const editing = !!task;
  const [members, setMembers] = useState([]);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [status, setStatus] = useState(task?.status || "pending");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(task?.expected_delivery_date || "");
  const [expectedDeliveryTime, setExpectedDeliveryTime] = useState(task?.expected_delivery_time || "");
  const [coworkLink, setCoworkLink] = useState(task?.cowork_link || "");
  const [imageUrl, setImageUrl] = useState(task?.image_url || "");
  const [assigneeIds, setAssigneeIds] = useState((task?.assignees || []).map(a => a.member?.id).filter(Boolean));
  const [showNotify, setShowNotify] = useState(false);
  const [notifyMorning, setNotifyMorning] = useState(task?.notify_morning);
  const [notifyEvening, setNotifyEvening] = useState(task?.notify_evening);
  const [notifyStartDate, setNotifyStartDate] = useState(task?.notify_start_date || "");
  const [notifyRepeat, setNotifyRepeat] = useState(task?.notify_repeat);
  const [notifyMaxCount, setNotifyMaxCount] = useState(task?.notify_max_count ?? "");
  const [notifyStopOnComplete, setNotifyStopOnComplete] = useState(task?.notify_stop_on_complete ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const fileRef = useRef(null);

  useEffect(() => { listMembers().then(setMembers).catch(e => setError(e.message)); }, []);

  const pickImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setImageUrl(await uploadTaskImage(file));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = "Task title is required.";
    if (!expectedDeliveryDate) errs.expectedDeliveryDate = "Expected delivery date is required.";
    if (!isValidUrl(coworkLink)) errs.coworkLink = "Please enter a valid URL.";
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    const notify = {
      morning: notifyMorning ?? null,
      evening: notifyEvening ?? null,
      startDate: notifyStartDate || null,
      repeat: notifyRepeat ?? null,
      maxCount: notifyMaxCount === "" ? null : Number(notifyMaxCount),
      stopOnComplete: notifyStopOnComplete,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateTask(task.id, {
          title: title.trim(), description, priority, status,
          expectedDeliveryDate, expectedDeliveryTime, imageUrl, coworkLink, notify,
        });
        await setTaskAssignees(task.id, assigneeIds);
      } else {
        await createTask({
          title: title.trim(), description, priority,
          expectedDeliveryDate, expectedDeliveryTime, imageUrl, coworkLink, assigneeIds, notify,
        });
      }
      setSuccess(true);
      setTimeout(onDone, 1100);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const memberOptions = members.map(m => ({ id: m.id, label: m.name || m.email }));

  return (
    <div>
      <h1 style={{fontSize:"clamp(22px,4vw,32px)",fontWeight:800,marginBottom:24}}>
        {editing ? "Edit Task" : "New Task"}
      </h1>

      <Card style={{marginBottom:24}}>
        <Section title="Task Details">
          <div style={{marginBottom:16}}>
            <Label required>Task Title</Label>
            <Input value={title} onChange={setTitle} placeholder="e.g. Renew SSL certificate" error={fieldErrors.title} />
          </div>
          <div style={{marginBottom:16}}>
            <Label>Description</Label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)}
              placeholder="Detailed description of the task…" rows={4}
              style={{ width:"100%", background:"var(--input-bg)", border:"1.5px solid var(--border)",
                borderRadius:8, padding:"10px 14px", color:"var(--text)", fontSize:14,
                outline:"none", resize:"vertical", fontFamily:"'DM Sans',sans-serif" }} />
          </div>
          <div style={{marginBottom:16}}>
            <Label>Assigned To</Label>
            <MultiSelect options={memberOptions} selected={assigneeIds} onChange={setAssigneeIds}
              placeholder="Click to select members…" />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div>
              <Label required>Priority</Label>
              <select value={priority} onChange={e=>setPriority(e.target.value)}
                style={{width:"100%",background:"var(--input-bg)",border:"1.5px solid var(--border)",borderRadius:8,
                  padding:"10px 14px",color:"var(--text)",fontSize:14,outline:"none",fontFamily:"'DM Sans',sans-serif"}}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            {editing && (
              <div>
                <Label>Status</Label>
                <select value={status} onChange={e=>setStatus(e.target.value)}
                  style={{width:"100%",background:"var(--input-bg)",border:"1.5px solid var(--border)",borderRadius:8,
                    padding:"10px 14px",color:"var(--text)",fontSize:14,outline:"none",fontFamily:"'DM Sans',sans-serif"}}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div>
              <Label required>Expected Delivery Date</Label>
              <Input value={expectedDeliveryDate} onChange={setExpectedDeliveryDate} type="date" error={fieldErrors.expectedDeliveryDate} />
            </div>
            <div>
              <Label>Expected Delivery Time (optional)</Label>
              <Input value={expectedDeliveryTime} onChange={setExpectedDeliveryTime} type="time" />
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <Label>Cowork Link</Label>
            <Input value={coworkLink} onChange={setCoworkLink} placeholder="https://…" error={fieldErrors.coworkLink} />
          </div>
          <div>
            <Label>Image / Attachment</Label>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <label style={{fontSize:12,color:"var(--muted)",cursor:"pointer",
                border:"1px solid var(--border)",borderRadius:8,padding:"8px 14px"}}>
                {uploading ? "Uploading…" : imageUrl ? "Replace Image" : "Attach Image"}
                <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} disabled={uploading} style={{display:"none"}} />
              </label>
              {imageUrl && (
                <>
                  <img src={imageUrl} alt="" style={{maxWidth:120,borderRadius:8,border:"1px solid var(--border)"}} />
                  <button onClick={()=>setImageUrl("")}
                    style={{background:"none",border:"none",color:"var(--danger)",cursor:"pointer",fontSize:12}}>
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
        </Section>
      </Card>

      <Card style={{marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}
          onClick={()=>setShowNotify(s=>!s)}>
          <Label>Notification Settings (optional overrides)</Label>
          <span style={{color:"var(--muted)",fontSize:13}}>{showNotify ? "Hide ▲" : "Show ▼"}</span>
        </div>
        {showNotify && (
          <div style={{marginTop:16}}>
            <div style={{color:"var(--muted)",fontSize:12,marginBottom:16}}>
              Leave any of these blank to use the default for this task's priority.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:"var(--text)"}}>
                <input type="checkbox" checked={!!notifyMorning} onChange={e=>setNotifyMorning(e.target.checked)} />
                Include in morning email
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:"var(--text)"}}>
                <input type="checkbox" checked={!!notifyEvening} onChange={e=>setNotifyEvening(e.target.checked)} />
                Include in evening email
              </label>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div>
                <Label>Start Sending Reminders From</Label>
                <Input value={notifyStartDate} onChange={setNotifyStartDate} type="date" />
              </div>
              <div>
                <Label>Maximum Number of Reminders</Label>
                <Input value={notifyMaxCount} onChange={setNotifyMaxCount} type="number" placeholder="Unlimited" />
              </div>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:"var(--text)",marginBottom:10}}>
              <input type="checkbox" checked={!!notifyRepeat} onChange={e=>setNotifyRepeat(e.target.checked)} />
              Repeat reminders every cycle until completed
            </label>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:"var(--text)"}}>
              <input type="checkbox" checked={notifyStopOnComplete} onChange={e=>setNotifyStopOnComplete(e.target.checked)} />
              Stop reminders once completed
            </label>
          </div>
        )}
      </Card>

      <ErrorMsg msg={error} />
      {success && (
        <div style={{color:"var(--accent)",fontSize:13,fontWeight:600,marginBottom:8}}>
          ✓ Task {editing ? "updated" : "created"} successfully.
        </div>
      )}

      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:20}}>
        <button onClick={onCancel} disabled={saving}
          style={{ flex:"1 1 160px", padding:"14px", background:"var(--surface)",
            border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontWeight:700,
            fontSize:14, cursor: saving ? "default" : "pointer", fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.03em", opacity: saving ? .6 : 1 }}>
          Cancel
        </button>
        <button onClick={submit} disabled={saving}
          style={{ flex:"2 1 260px", padding:"15px", background:"linear-gradient(135deg,var(--accent-solid),var(--accent2-solid))",
            border:"none", borderRadius:10, color:"var(--on-solid)", fontWeight:800,
            fontSize:15, cursor: saving ? "default" : "pointer", fontFamily:"'Syne',sans-serif",
            letterSpacing:"0.05em", textTransform:"uppercase", opacity: saving ? .6 : 1 }}>
          {saving ? "Saving…" : editing ? "Save Changes" : "Create Task"}
        </button>
      </div>
    </div>
  );
}
