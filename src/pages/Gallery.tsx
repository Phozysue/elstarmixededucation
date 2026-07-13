import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload, Loader2, Play, Image, Video } from "lucide-react";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  is_featured: boolean;
  display_order?: number;
  media_type: "image" | "video";
}

const Gallery = () => {
  const { user } = useAuth();
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<GalleryItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [mediaFilter, setMediaFilter] = useState<"all" | "image" | "video">("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGallery();
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    let filtered = galleryItems;
    
    // Filter by category
    if (activeCategory !== "all") {
      filtered = filtered.filter(item => item.category === activeCategory);
    }
    
    // Filter by media type
    if (mediaFilter !== "all") {
      filtered = filtered.filter(item => item.media_type === mediaFilter);
    }
    
    setFilteredItems(filtered);
  }, [activeCategory, mediaFilter, galleryItems]);

  const checkAdminRole = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const fetchGallery = async () => {
    try {
      const { data } = await supabase
        .from("gallery")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (data) {
        // Cast media_type to the correct type
        const typedData = data.map(item => ({
          ...item,
          media_type: (item.media_type === "video" ? "video" : "image") as "image" | "video"
        }));
        setGalleryItems(typedData);
      }
    } catch (error) {
      console.error("Error fetching gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      toast.error("Please select an image or video file");
      return;
    }

    // Validate file size
    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(isVideo ? "Video must be less than 100MB" : "Image must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    setMediaType(isVideo ? "video" : "image");
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadMedia = async (file: File): Promise<string> => {
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

    return data.publicUrl;
  };

  const handleSave = async (formData: FormData) => {
    const title = (formData.get("title") as string || "").trim();
    const description = (formData.get("description") as string || "").trim();
    const category = (formData.get("category") as string || "").trim();
    const is_featured = formData.get("is_featured") === "on";
    const display_order = parseInt(formData.get("display_order") as string) || 0;

    if (!title) {
      toast.error("Title is required");
      return;
    }

    if (title.length > 200) {
      toast.error("Title must be less than 200 characters");
      return;
    }

    if (!category) {
      toast.error("Category is required");
      return;
    }

    // For new items, require a file
    if (!editingItem && !selectedFile) {
      toast.error("Please select an image or video to upload");
      return;
    }

    setUploading(true);

    try {
      let image_url = editingItem?.image_url || "";
      let finalMediaType = editingItem?.media_type || mediaType;

      // Upload new media if selected
      if (selectedFile) {
        image_url = await uploadMedia(selectedFile);
        finalMediaType = mediaType;
      }

      if (editingItem) {
        const { error } = await supabase.from("gallery").update({
          title,
          description: description || null,
          image_url,
          category,
          display_order,
          is_featured,
          media_type: finalMediaType,
        }).eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Media updated successfully");
      } else {
        const { error } = await supabase.from("gallery").insert({
          title,
          description: description || null,
          image_url,
          category,
          display_order,
          is_featured,
          media_type: finalMediaType,
          created_by: user?.id!,
        });
        if (error) throw error;
        toast.success("Media uploaded successfully");
      }

      // Reset form state
      setIsDialogOpen(false);
      setIsAddDialogOpen(false);
      setEditingItem(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setMediaType("image");
      fetchGallery();
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const { error } = await supabase.from("gallery").delete().eq("id", id);
      if (error) throw error;
      toast.success("Item deleted successfully");
      fetchGallery();
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const resetFormState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType("image");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const categories = ["all", ...Array.from(new Set(galleryItems.map(item => item.category)))];

  const MediaPreview = ({ url, type }: { url: string; type: "image" | "video" }) => {
    if (type === "video") {
      return (
        <video 
          src={url} 
          className="w-full h-48 object-cover rounded-md"
          controls={false}
          muted
        />
      );
    }
    return <img src={url} alt="Preview" className="w-full h-48 object-cover rounded-md" />;
  };

  const GalleryForm = ({ item }: { item?: GalleryItem }) => (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
      <div>
        <Label>Media *</Label>
        <div className="mt-2">
          {(previewUrl || item?.image_url) && (
            <div className="mb-2">
              <MediaPreview 
                url={previewUrl || item?.image_url || ""} 
                type={selectedFile ? mediaType : (item?.media_type || "image")} 
              />
            </div>
          )}
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {selectedFile ? selectedFile.name : "Click to select an image or video"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Images: Max 5MB (JPG/PNG/GIF) • Videos: Max 100MB (MP4/WebM/MOV)
            </p>
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*,video/*" 
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
      <div>
        <Label>Title *</Label>
        <Input name="title" defaultValue={item?.title || ""} required maxLength={200} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea name="description" defaultValue={item?.description || ""} maxLength={500} />
      </div>
      <div>
        <Label>Category *</Label>
        <Input name="category" defaultValue={item?.category || "general"} required maxLength={50} />
      </div>
      <div>
        <Label>Display Order</Label>
        <Input name="display_order" type="number" defaultValue={item?.display_order || 0} min="0" max="9999" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="is_featured" id="form_is_featured" defaultChecked={item?.is_featured || false} />
        <Label htmlFor="form_is_featured">Featured</Label>
      </div>
      <Button type="submit" className="w-full" disabled={uploading}>
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          item ? "Save Changes" : "Upload Media"
        )}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 text-foreground">Gallery</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Explore moments from our vibrant school community through photos and videos.
          </p>
          {isAdmin && (
            <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Media
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
          {/* Media Type Filter */}
          <ToggleGroup 
            type="single" 
            value={mediaFilter} 
            onValueChange={(value) => value && setMediaFilter(value as "all" | "image" | "video")}
            className="border rounded-lg p-1"
          >
            <ToggleGroupItem value="all" className="px-4">
              All Media
            </ToggleGroupItem>
            <ToggleGroupItem value="image" className="px-4 flex items-center gap-2">
              <Image className="h-4 w-4" />
              Photos
            </ToggleGroupItem>
            <ToggleGroupItem value="video" className="px-4 flex items-center gap-2">
              <Video className="h-4 w-4" />
              Videos
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="capitalize">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading gallery...</div>
        ) : filteredItems.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-16 text-center text-muted-foreground">
              No media available in this category.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden group"
              >
                <div 
                  className="relative aspect-[4/3] overflow-hidden cursor-pointer"
                  onClick={() => setSelectedMedia(item)}
                >
                  {item.media_type === "video" ? (
                    <>
                      <video 
                        src={item.image_url} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="h-8 w-8 text-primary-foreground ml-1" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  )}
                  <div className="absolute top-2 left-2">
                    {item.media_type === "video" ? (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Video className="h-3 w-3" /> Video
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Image className="h-3 w-3" /> Photo
                      </Badge>
                    )}
                  </div>
                  {item.is_featured && (
                    <Badge className="absolute top-2 right-2">Featured</Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1 text-foreground">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="capitalize">{item.category}</Badge>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDialogOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Lightbox Dialog */}
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-4xl">
            {selectedMedia && (
              <div className="space-y-4">
                {selectedMedia.media_type === "video" ? (
                  <video 
                    src={selectedMedia.image_url} 
                    className="w-full h-auto rounded-lg"
                    controls
                    autoPlay
                  />
                ) : (
                  <img 
                    src={selectedMedia.image_url} 
                    alt={selectedMedia.title}
                    className="w-full h-auto rounded-lg"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{selectedMedia.title}</h2>
                  {selectedMedia.description && (
                    <p className="text-muted-foreground">{selectedMedia.description}</p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Badge className="capitalize">{selectedMedia.category}</Badge>
                    {selectedMedia.is_featured && <Badge variant="secondary">Featured</Badge>}
                    <Badge variant="outline" className="flex items-center gap-1">
                      {selectedMedia.media_type === "video" ? <Video className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                      {selectedMedia.media_type === "video" ? "Video" : "Photo"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Media Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetFormState(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Media</DialogTitle>
            </DialogHeader>
            <GalleryForm />
          </DialogContent>
        </Dialog>

        {/* Edit Media Dialog */}
        <Dialog open={isDialogOpen && !!editingItem} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingItem(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Media</DialogTitle>
            </DialogHeader>
            {editingItem && <GalleryForm item={editingItem} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Gallery;
