import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/shared/SeoHead";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";

const AdminPostEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/admin/login");
    });
  }, [navigate]);

  const { isLoading } = useQuery({
    queryKey: ["admin-post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && !!id,
    meta: {
      onSuccess: (data: any) => {
        setTitle(data.title);
        setSlug(data.slug);
        setExcerpt(data.excerpt || "");
        setContent(data.content);
        setPublished(data.published);
        setCoverImageUrl(data.cover_image_url || "");
      },
    },
  });

  // Populate form when data loads
  const { data: existingPost } = useQuery({
    queryKey: ["admin-post", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title);
      setSlug(existingPost.slug);
      setExcerpt(existingPost.excerpt || "");
      setContent(existingPost.content);
      setPublished(existingPost.published);
      setCoverImageUrl(existingPost.cover_image_url || "");
    }
  }, [existingPost]);

  const generateSlug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (c) => "acelnoszzaceelnooszz"["ąćęłńóśźżĄĆĘŁŃÓŚŹŻ".indexOf(c)] || c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const postData = {
        title,
        slug: slug || generateSlug(title),
        excerpt: excerpt || null,
        content,
        published,
        published_at: published ? new Date().toISOString() : null,
        cover_image_url: coverImageUrl || null,
      };

      if (isNew) {
        const { error } = await supabase.from("blog_posts").insert(postData);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").update({ ...postData, updated_at: new Date().toISOString() }).eq("id", id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isNew ? "Artykuł dodany" : "Artykuł zaktualizowany");
      navigate("/admin");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Błąd podczas zapisywania");
    },
  });

  return (
    <>
      <SeoHead title={isNew ? "Nowy artykuł" : "Edycja artykułu"} description="Edytor artykułów" path="/admin/post" />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-4 md:px-8 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Powrót
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!title || !content || saveMutation.isPending}>
            <Save className="w-4 h-4 mr-1" /> {saveMutation.isPending ? "Zapisuję..." : "Zapisz"}
          </Button>
        </header>

        <main className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł</Label>
            <Input id="title" value={title} onChange={(e) => {
              setTitle(e.target.value);
              if (isNew) setSlug(generateSlug(e.target.value));
            }} placeholder="Tytuł artykułu" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="tytul-artykulu" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Streszczenie</Label>
            <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Krótki opis artykułu..." rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover">URL obrazka okładki (opcjonalnie)</Label>
            <Input id="cover" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <Label>Treść (Markdown)</Label>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="edit"><Pencil className="w-3.5 h-3.5 mr-1.5" />Edycja</TabsTrigger>
                <TabsTrigger value="preview"><Eye className="w-3.5 h-3.5 mr-1.5" />Podgląd</TabsTrigger>
              </TabsList>
              <TabsContent value="edit">
                <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="## Nagłówek&#10;&#10;Treść artykułu..." rows={20} className="font-mono text-sm" />
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[420px] rounded-md border border-input bg-background px-4 py-3 overflow-y-auto">
                  {content ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <p className="text-muted-foreground italic">Wpisz treść, aby zobaczyć podgląd...</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="published" checked={published} onCheckedChange={setPublished} />
            <Label htmlFor="published">Opublikowany</Label>
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminPostEditor;
