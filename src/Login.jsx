import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { Card, Input, Label, ErrorMsg } from "./ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div style={{maxWidth:380,margin:"0 auto",padding:"80px 20px"}}>
      <div style={{marginBottom:28,textAlign:"center"}}>
        <h1 style={{fontSize:24,fontWeight:800,marginBottom:6}}>Sign In</h1>
        <div style={{color:"var(--muted)",fontSize:13}}>WordPress Maintenance Reports</div>
      </div>
      <Card>
        <form onSubmit={submit}>
          <div style={{marginBottom:16}}>
            <Label required>Email</Label>
            <Input value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
          </div>
          <div style={{marginBottom:8}}>
            <Label required>Password</Label>
            <Input value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          </div>
          <ErrorMsg msg={error} />
          <button type="submit" disabled={loading}
            style={{ width:"100%", marginTop:16, padding:"13px", background:"linear-gradient(135deg,var(--accent),var(--accent2))",
              border:"none", borderRadius:10, color:"#000", fontWeight:800,
              fontSize:14, cursor: loading ? "default" : "pointer", fontFamily:"'Syne',sans-serif",
              letterSpacing:"0.05em", textTransform:"uppercase", opacity: loading ? .6 : 1 }}>
            {loading ? "Signing In…" : "Sign In"}
          </button>
        </form>
      </Card>
    </div>
  );
}
