import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Eye, Pencil, X, ImageIcon } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/admin/login");
    });
  }, [navigate]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Dozwolone są tylko pliki graficzne");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maksymalny rozmiar pliku to 5 MB");
      return;
    }

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("blog-covers")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error(uploadError);
      toast.error("Nie udało się przesłać pliku");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("blog-covers").getPublicUrl(fileName);
    setCoverImageUrl(urlData.publicUrl);
    toast.success("Obrazek przesłany");
    setUploading(false);
  };

  const removeCoverImage = () => {
    setCoverImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

          {/* Cover image upload */}
          <div className="space-y-2">
            <Label>Obrazek okładki</Label>
            {coverImageUrl ? (
              <div className="relative rounded-lg border border-border overflow-hidden">
                <img
                  src={coverImageUrl}
                  alt="Okładka artykułu"
                  className="w-full h-48 object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeCoverImage}
                  type="button"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Kliknij, aby przesłać obrazek okładki</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WebP — maks. 5 MB</p>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
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