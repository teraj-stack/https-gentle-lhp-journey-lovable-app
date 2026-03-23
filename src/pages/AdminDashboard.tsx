import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, LogOut, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/shared/SeoHead";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      if (!s) navigate("/admin/login");
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) navigate("/admin/login");
      else setSession(s);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const {
    data: posts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!session,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
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
    navigate("/admin/login");
  };

  if (!session) return null;

  return (
    <>
      <SeoHead title="Panel administracyjny — Blog" description="Zarządzanie wpisami blogowymi" path="/admin" />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-4 md:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold font-serif text-foreground">Panel bloga</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{session.user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Wyloguj
            </Button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
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
                          <Button variant="ghost" size="icon" onClick={() => togglePublish.mutate({ id: post.id, published: post.published })} title={post.published ? "Cofnij publikację" : "Opublikuj"}>
                            {post.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/post/${post.id}`)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm("Czy na pewno chcesz usunąć ten artykuł?")) {
                              deleteMutation.mutate(post.id);
                            }
                          }}>
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
