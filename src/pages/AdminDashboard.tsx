import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, LogOut, Eye, EyeOff, ShieldAlert, Activity, Mail, ShieldCheck, Image as ImageIcon, Link2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/shared/SeoHead";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  useEffect(() => {
    let isMounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;

      setSession(nextSession);
      setAuthLoading(false);

      if (!nextSession) {
        navigate("/admin/login", { replace: true });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        applySession(null);
        return;
      }

      applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      applySession(currentSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, queryClient]);

  const {
    data: posts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-blog-posts", session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !authLoading && !!session,
    refetchOnMount: "always",
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const post = posts.find((p) => p.id === id);
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
      // Clean up cover image from storage if it lived in our bucket.
      const coverUrl = post?.cover_image_url;
      if (coverUrl && coverUrl.includes("/blog-covers/")) {
        try {
          await supabase.functions.invoke("delete-blog-cover", { body: { url: coverUrl } });
        } catch (e) {
          console.warn("Nie udało się usunąć okładki ze storage:", e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Artykuł usunięty");
    },
    onError: (mutationError) => {
      console.error(mutationError);
      toast.error("Błąd podczas usuwania");
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          published: !published,
          published_at: !published ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Status zmieniony");
    },
    onError: (mutationError) => {
      console.error(mutationError);
      toast.error("Nie udało się zmienić statusu wpisu");
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" aria-label="Ładowanie panelu administracyjnego" />
      </div>
    );
  }

  if (!session) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Brak uprawnień</h1>
          <p className="text-muted-foreground text-sm">Twoje konto nie ma roli administratora.</p>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Wyloguj
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="Panel administracyjny — Blog" description="Zarządzanie wpisami blogowymi" path="/admin" />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-4 py-4 md:px-8 flex items-center justify-between">
          <h1 className="text-xl font-bold font-serif text-foreground">Panel bloga</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/kalendarz")}>
              <CalendarClock className="h-4 w-4 mr-2" /> Kalendarz
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/bookings")}>
              Rezerwacje
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/notification-recipients")}>
              Powiadomienia
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/system-health")}>
              <Activity className="h-4 w-4 mr-2" /> System Health
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/email-dashboard")}>
              <Mail className="h-4 w-4 mr-2" /> Emaile
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/security")}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Security
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/vein-images")}>
              <ImageIcon className="h-4 w-4 mr-2" /> Vein Images
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/seo-redirects")}>
              <Link2 className="h-4 w-4 mr-2" /> SEO Redirects
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:inline">{session.user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Wyloguj
            </Button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8 md:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Artykuły ({posts.length})</h2>
            <Button onClick={() => navigate("/admin/post/new")} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Nowy artykuł
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-border bg-card px-6 py-8 text-center space-y-3">
              <p className="text-foreground font-medium">Nie udało się wczytać artykułów.</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Wystąpił nieznany błąd podczas pobierania danych."}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Spróbuj ponownie
              </Button>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tytuł</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{post.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {new Date(post.created_at).toLocaleDateString("pl-PL")}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${post.published ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                          {post.published ? "Opublikowany" : "Szkic"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePublish.mutate({ id: post.id, published: post.published })}
                            title={post.published ? "Cofnij publikację" : "Opublikuj"}
                          >
                            {post.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/post/${post.id}`)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Czy na pewno chcesz usunąć ten artykuł?")) {
                                deleteMutation.mutate(post.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {posts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Brak artykułów. Dodaj pierwszy wpis!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
