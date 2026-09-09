import { useState } from "react";
import { rewriteNotes } from "./aiApi";

export function useRewrite(currentValue, applyValue) {
  const [rewriting, setRewriting] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);

  const canRewrite = currentValue.trim().split(/\s+/).filter(Boolean).length >= 3;

  const run = async () => {
    setRewriting(true);
    setError("");
    try {
      setPending(await rewriteNotes(currentValue));
    } catch (e) {
      setError(e.message || "Couldn't rewrite the text. Try again.");
    } finally {
      setRewriting(false);
    }
  };

  const accept = () => {
    applyValue(pending);
    setPending(null);
  };

  const decline = () => setPending(null);

  return { canRewrite, rewriting, error, pending, run, accept, decline };
}
