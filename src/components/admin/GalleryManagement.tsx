import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Pencil, Play, Plus, Trash2, Upload } from "lucide-react";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  is_featured: boolean;
  display_order: number;
  media_type: string;
}

const GalleryManagement = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("gallery")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch gallery: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel("gallery-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery" }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  const ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      toast.error("Please select a valid image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV) file");
      return;
    }

    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File must be less than ${isVideo ? "100MB" : "5MB"}`);
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = async (file: File): Promise<{ url: string; mediaType: string }> => {
    const isVideo = file.type.startsWith("video/");
    const bucket = isVideo ? "gallery-videos" : "gallery-images";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", bucket);

    const { data, error } = await supabase.functions.invoke("upload-image", {
      body: formData,
    });

    if (error) throw new Error(error.message || "Upload failed");
    if (!data?.publicUrl) throw new Error("Failed to get upload URL");

    return { url: data.publicUrl, mediaType: isVideo ? "video" : "image" };
  };

  const handleSave = async (formData: FormData) => {
    const title = (formData.get("title") as string || "").trim();
    const description = (formData.get("description") as string || "").trim();
    const category = (formData.get("category") as string || "").trim();
    const is_featured = formData.get("is_featured") === "on";
    const display_order = parseInt(formData.get("display_order") as string) || 0;

    if (!title || title.length > 200) {
      toast.error("Title is required and must be under 200 characters");
      return;
    }

    if (!category || category.length > 50) {
      toast.error("Category is required and must be under 50 characters");
      return;
    }

    // For new items, file is required
    if (!editingItem && !selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);

    try {
      let image_url = editingItem?.image_url || "";
      let media_type = editingItem?.media_type || "image";

      if (selectedFile) {
        const result = await uploadFile(selectedFile);
        image_url = result.url;
        media_type = result.mediaType;
      }

      if (editingItem) {
        const { error } = await supabase.from("gallery").update({
          title,
          description: description || null,
          image_url,
          category,
          display_order,
          is_featured,
          media_type,
        }).eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Gallery item updated successfully");
      } else {
        const { error } = await supabase.from("gallery").insert({
          title,
          description: description || null,
          image_url,
          category,
          display_order,
          is_featured,
          media_type,
          created_by: user?.id!,
        });
        if (error) throw error;
        toast.success("Gallery item created successfully");
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setSelectedFile(null);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gallery item?")) return;

    try {
      const { error } = await supabase.from("gallery").delete().eq("id", id);
      if (error) throw error;
      toast.success("Gallery item deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gallery Management</CardTitle>
        <Dialog open={isDialogOpen && !editingItem} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingItem(null); resetDialog(); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Media
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Gallery Media</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input name="title" required maxLength={200} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" maxLength={500} />
              </div>
              <div>
                <Label>Media File *</Label>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {selectedFile ? selectedFile.name : "Choose Image or Video"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_EXTENSIONS}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported: JPEG, PNG, GIF, WebP (up to 5MB) | MP4, WebM, MOV (up to 100MB)
                  </p>
                </div>
              </div>
              <div>
                <Label>Category *</Label>
                <Input name="category" defaultValue="general" required maxLength={50} />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input name="display_order" type="number" defaultValue="0" min="0" max="9999" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="is_featured" id="is_featured" />
                <Label htmlFor="is_featured">Featured</Label>
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Add to Gallery"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="relative w-full h-48 rounded-md overflow-hidden mb-2">
                  {item.media_type === "video" ? (
                    <>
                      <video src={item.image_url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.category} • {item.media_type}</p>
                <div className="flex gap-2 mt-2">
                  <Dialog open={isDialogOpen && editingItem?.id === item.id} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingItem(null); resetDialog(); } }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setEditingItem(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Gallery Item</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
                        <div>
                          <Label>Title *</Label>
                          <Input name="title" defaultValue={item.title} required maxLength={200} />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea name="description" defaultValue={item.description || ""} maxLength={500} />
                        </div>
                        <div>
                          <Label>Replace Media (optional)</Label>
                          <div className="mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => editFileInputRef.current?.click()}
                              disabled={uploading}
                              className="w-full"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {selectedFile ? selectedFile.name : "Choose New File"}
                            </Button>
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept={ALLOWED_EXTENSIONS}
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Leave empty to keep current media
                          </p>
                          </div>
                        </div>
                        <div>
                          <Label>Category *</Label>
                          <Input name="category" defaultValue={item.category} required maxLength={50} />
                        </div>
                        <div>
                          <Label>Display Order</Label>
                          <Input name="display_order" type="number" defaultValue={item.display_order} min="0" max="9999" />
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" name="is_featured" id={`is_featured_${item.id}`} defaultChecked={item.is_featured} />
                          <Label htmlFor={`is_featured_${item.id}`}>Featured</Label>
                        </div>
                        <Button type="submit" className="w-full" disabled={uploading}>
                          {uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GalleryManagement;
