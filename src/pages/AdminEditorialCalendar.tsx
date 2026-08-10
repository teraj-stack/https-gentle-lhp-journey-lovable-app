import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CalendarClock, RefreshCw, ShieldAlert, Stethoscope } from "lucide-react";
import SeoHead from "@/components/shared/SeoHead";
import {
  daysUntilRefresh,
  formatPl,
  getUpcomingSlots,
  needsRefresh,
} from "@/lib/blog/editorialSchedule";
import { auditPost } from "@/lib/blog/postSeoAudit";

/** Kalendarz redakcyjny: kolejka publikacji, sloty i artykuły do odświeżenia */
const AdminEditorialCalendar = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/admin/login", { replace: true });
      setSessionChecked(true);
    });
  }, [navigate]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["editorial-calendar-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: sessionChecked && isAdmin === true,
  });

  if (adminLoading || !sessionChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Brak uprawnień</h1>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const scheduled = posts
    .filter((p) => p.scheduled_at && new Date(p.scheduled_at).getTime() > now)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  const drafts = posts.filter((p) => !p.published && !p.scheduled_at);
  const toRefresh = posts
    .filter((p) => p.published && needsRefresh(p))
    .sort((a, b) => (daysUntilRefresh(a) ?? 0) - (daysUntilRefresh(b) ?? 0));
  const awaitingReview = posts.filter((p) => p.needs_medical_review);

  const freeSlots = getUpcomingSlots(6, scheduled.map((p) => p.scheduled_at));

  return (
    <>
      <SeoHead
        title="Kalendarz redakcyjny"
        description="Harmonogram publikacji i odświeżania artykułów bloga"
        path="/admin/kalendarz"
      />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-4 md:px-8 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Panel bloga
          </Button>
          <h1 className="text-base md:text-xl font-serif font-bold text-foreground">
            Kalendarz redakcyjny
          </h1>
        </header>

        <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10">
          <p className="text-sm text-muted-foreground">
            Kadencja: <strong className="text-foreground">2 wpisy miesięcznie</strong> — 10. i 24. dnia
            miesiąca, publikacja o 09:00. Każdy wpis: min. 1500 słów, 3–5 linków do stron zabiegowych,
            jedna fraza long-tail. Artykuły odświeżamy co 6 miesięcy.
          </p>

          {isLoading ? (
            <div className="h-40 bg-muted rounded animate-pulse" />
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary" aria-hidden="true" />
                  Zaplanowane publikacje ({scheduled.length})
                </h2>
                {scheduled.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak zaplanowanych wpisów.</p>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tytuł</TableHead>
                          <TableHead>Termin</TableHead>
                          <TableHead className="hidden md:table-cell">SEO</TableHead>
                          <TableHead className="text-right">Akcje</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scheduled.map((post) => {
                          const audit = auditPost({
                            title: post.title,
                            slug: post.slug,
                            excerpt: post.excerpt ?? "",
                            content: post.content,
                            focusKeyword: post.focus_keyword ?? "",
                          });
                          return (
                            <TableRow key={post.id}>
                              <TableCell className="font-medium max-w-[240px] truncate">
                                {post.title}
                              </TableCell>
                              <TableCell className="text-sm">{formatPl(post.scheduled_at!)}</TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {audit.score}/100 · {audit.words} słów · {audit.treatmentLinks.length} linków
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/post/${post.id}`)}>
                                  Edytuj
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Wolne sloty publikacyjne</h2>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {freeSlots.map((slot) => (
                    <li
                      key={slot.toISOString()}
                      className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground"
                    >
                      {formatPl(slot)}
                      <span className="block text-xs text-muted-foreground">
                        {drafts.length > 0 ? `${drafts.length} szkiców do obsadzenia` : "Brak gotowego szkicu"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" aria-hidden="true" />
                  Do odświeżenia ({toRefresh.length})
                </h2>
                {toRefresh.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Wszystkie artykuły są aktualne.</p>
                ) : (
                  <ul className="space-y-2">
                    {toRefresh.map((post) => (
                      <li
                        key={post.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
                      >
                        <span className="text-sm text-foreground">
                          {post.title}
                          <span className="block text-xs text-muted-foreground">
                            Zaległość: {Math.abs(daysUntilRefresh(post) ?? 0)} dni ·{" "}
                            {auditPost({
                              title: post.title,
                              slug: post.slug,
                              excerpt: post.excerpt ?? "",
                              content: post.content,
                              focusKeyword: post.focus_keyword ?? "",
                            }).words}{" "}
                            słów
                          </span>
                        </span>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/post/${post.id}`)}>
                          Odśwież
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" aria-hidden="true" />
                  Czeka na weryfikację medyczną ({awaitingReview.length})
                </h2>
                {awaitingReview.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak wpisów oczekujących na weryfikację.</p>
                ) : (
                  <ul className="space-y-2">
                    {awaitingReview.map((post) => (
                      <li
                        key={post.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-card px-4 py-3"
                      >
                        <span className="text-sm text-foreground">{post.title}</span>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/post/${post.id}`)}>
                          Otwórz
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default AdminEditorialCalendar;
