import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function SmtpTestButton({ unsaved }: { unsaved: boolean }) {
  const sending = useRef(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "login" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendTest() {
    if (sending.current || state === "done") return;
    sending.current = true;
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (response.status === 401) {
        setState("login");
        setMessage("Your login session is not recognized. Sign in again on this site, then return to Settings. No email was sent.");
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) {
        setState(result.requiresReview ? "done" : "error");
        setMessage(result.error || "The test could not be completed. No automatic retry was attempted.");
        return;
      }
      setState("done");
      setMessage(`The mail server accepted the test for ${result.recipient}. Check Inbox and Spam for “SMTP verification test”. Acceptance does not confirm arrival. Do not resend while checking.`);
    } catch {
      setState("done");
      setMessage("The result could not be confirmed. Check your inbox before trying again; the message may have been sent. No automatic retry was attempted.");
    } finally {
      sending.current = false;
    }
  }

  return (
    <div className="border-t pt-3 mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">Send one verification email to your account email using saved tenant SMTP settings. This does not start a campaign.</p>
      <Button type="button" variant="outline" size="sm" disabled={unsaved || state === "sending" || state === "done" || state === "login"} onClick={sendTest} data-testid="button-smtp-test">
        {state === "sending" ? "Sending test…" : "Send test email"}
      </Button>
      {unsaved && <p className="text-xs text-muted-foreground">Save your changes before testing.</p>}
      {message && <p role="status" className="text-sm" data-testid="smtp-test-result">{message}</p>}
      {state === "login" && <a href="/login" className="text-sm underline">Sign in again</a>}
    </div>
  );
}