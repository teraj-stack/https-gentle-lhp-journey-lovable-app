import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Eye, Pencil, X, ImageIcon, ShieldAlert, LogOut } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/shared/SeoHead";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import PostSeoAudit from "@/components/admin/PostSeoAudit";
import { getUpcomingSlots } from "@/lib/blog/editorialSchedule";

/** ISO -> wartość dla <input type="datetime-local"> w czasie lokalnym */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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
  const [scheduledAt, setScheduledAt] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [needsMedicalReview, setNeedsMedicalReview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isAdmin, loading: adminLoading } = useIsAdmin();

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
    enabled: !isNew && !!id && isAdmin === true,
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

  if (adminLoading) {
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
          <p className="text-muted-foreground text-sm">Twoje konto nie ma roli administratora.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/login")}>
            Powrót do logowania
          </Button>
        </div>
      </div>
    );
  }

  const generateSlug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (c) => "acelnoszzaceelnooszz"["ąćęłńóśźżĄĆĘŁŃÓŚŹŻ".indexOf(c)] || c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const processFile = async (file: File) => {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeCoverImage = () => {
    setCoverImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteOldCover = async (oldUrl: string | null | undefined, newUrl: string): Promise<boolean> => {
    if (!oldUrl || oldUrl === newUrl) return false;
    if (!oldUrl.includes("/blog-covers/")) return false;
    try {
      const { error } = await supabase.functions.invoke("delete-blog-cover", { body: { url: oldUrl } });
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Nie udało się usunąć starej okładki:", e);
      return false;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const newCoverUrl = coverImageUrl || null;
      const postData = {
        title,
        slug: slug || generateSlug(title),
        excerpt: excerpt || null,
        content,
        published,
        published_at: published ? new Date().toISOString() : null,
        cover_image_url: newCoverUrl,
      };

      if (isNew) {
        const { error } = await supabase.from("blog_posts").insert(postData);
        if (error) throw error;
        return { oldCoverDeleted: false };
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .update({ ...postData, updated_at: new Date().toISOString() })
          .eq("id", id!);
        if (error) throw error;
        // After successful update, clean up the old cover if it changed.
        const oldCoverDeleted = await deleteOldCover(existingPost?.cover_image_url, newCoverUrl ?? "");
        return { oldCoverDeleted };
      }
    },
    onSuccess: (result) => {
      toast.success(isNew ? "Artykuł dodany" : "Artykuł zaktualizowany");
      if (result?.oldCoverDeleted) {
        toast.info("Stara okładka usunięta ze storage");
      }
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
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 cursor-pointer transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {uploading ? (
                  <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Przeciągnij i upuść lub kliknij, aby przesłać</p>
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