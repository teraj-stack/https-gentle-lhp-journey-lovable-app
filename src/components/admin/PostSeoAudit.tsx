import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { auditPost, type PostAuditInput, type AuditStatus } from "@/lib/blog/postSeoAudit";

const icons: Record<AuditStatus, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

const tones: Record<AuditStatus, string> = {
  ok: "text-primary",
  warn: "text-amber-500",
  fail: "text-destructive",
};

/** Panel walidacji redakcyjnej SEO widoczny w edytorze wpisu */
const PostSeoAudit = (props: PostAuditInput) => {
  const audit = auditPost(props);

  return (
    <section
      aria-label="Walidacja SEO wpisu"
      className="rounded-lg border border-border bg-card p-4 space-y-3"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Walidacja SEO</h2>
        <span
          className={`text-sm font-semibold ${
            audit.score >= 85 ? "text-primary" : audit.score >= 60 ? "text-amber-500" : "text-destructive"
          }`}
        >
          {audit.score}/100
        </span>
      </header>

      <ul className="space-y-2">
        {audit.checks.map((check) => {
          const Icon = icons[check.status];
          return (
            <li key={check.id} className="flex items-start gap-2 text-sm">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tones[check.status]}`} aria-hidden="true" />
              <span className="text-foreground">
                {check.label}
                <span className="block text-xs text-muted-foreground">{check.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default PostSeoAudit;
