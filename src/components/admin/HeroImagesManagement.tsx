import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, GripVertical, Trash2, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface HeroImage {
  id: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const HeroImagesManagement = () => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ALLOWED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp';

  useEffect(() => {
    fetchHeroImages();
  }, []);

  const fetchHeroImages = async () => {
    try {
      const { data, error } = await supabase
        .from("hero_images")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setHeroImages(data || []);
    } catch (error) {
      console.error("Error fetching hero images:", error);
      toast({
        title: "Error",
        description: "Failed to load hero images",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "hero-images");

    const { data, error } = await supabase.functions.invoke("upload-image", {
      body: formData,
    });

    if (error) throw new Error(error.message || "Upload failed");
    if (!data?.publicUrl) throw new Error("Failed to get upload URL");

    return data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const maxOrder = heroImages.reduce((max, img) => Math.max(max, img.display_order), -1);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          toast({
            title: "Invalid file",
            description: `${file.name} is not a valid image (JPEG, PNG, GIF, WebP only)`,
            variant: "destructive",
          });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 10MB limit`,
            variant: "destructive",
          });
          continue;
        }

        const imageUrl = await uploadImage(file);

        const { error } = await supabase.from("hero_images").insert({
          image_url: imageUrl,
          display_order: maxOrder + 1 + i,
          is_active: true,
          created_by: userId,
        });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `${files.length} image(s) uploaded successfully`,
      });

      fetchHeroImages();
    } catch (error) {
      console.error("Error uploading images:", error);
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleImageActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("hero_images")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;

      setHeroImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, is_active: !currentState } : img))
      );

      toast({
        title: "Success",
        description: `Image ${!currentState ? "activated" : "deactivated"}`,
      });
    } catch (error) {
      console.error("Error toggling image:", error);
      toast({
        title: "Error",
        description: "Failed to update image",
        variant: "destructive",
      });
    }
  };

  const deleteImage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const { error } = await supabase.from("hero_images").delete().eq("id", id);

      if (error) throw error;

      setHeroImages((prev) => prev.filter((img) => img.id !== id));

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const moveImage = async (id: string, direction: "up" | "down") => {
    const currentIndex = heroImages.findIndex((img) => img.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= heroImages.length) return;

    const newImages = [...heroImages];
    [newImages[currentIndex], newImages[newIndex]] = [newImages[newIndex], newImages[currentIndex]];

    // Update display orders
    const updates = newImages.map((img, index) => ({
      id: img.id,
      display_order: index,
    }));

    try {
      for (const update of updates) {
        await supabase
          .from("hero_images")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      setHeroImages(newImages.map((img, index) => ({ ...img, display_order: index })));
    } catch (error) {
      console.error("Error reordering images:", error);
      toast({
        title: "Error",
        description: "Failed to reorder images",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Banner Images</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Banner Images</CardTitle>
        <CardDescription>
          Upload multiple images that will rotate in the hero banner. Images will auto-advance every 5 seconds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Button */}
        <div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "Upload Images"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_EXTENSIONS}
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Supported: JPEG, PNG, GIF, WebP (max 10MB per image)
          </p>
        </div>

        {/* Images List */}
        {heroImages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No banner images uploaded yet. Upload images to create a rotating carousel.
          </div>
        ) : (
          <div className="space-y-3">
            {heroImages.map((image, index) => (
              <div
                key={image.id}
                className={`flex items-center gap-4 p-3 rounded-lg border ${
                  image.is_active ? "bg-background" : "bg-muted/50 opacity-60"
                }`}
              >
                {/* Reorder Buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveImage(image.id, "up")}
                    disabled={index === 0}
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                  <button
                    onClick={() => moveImage(image.id, "down")}
                    disabled={index === heroImages.length - 1}
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <GripVertical className="h-4 w-4 -rotate-90" />
                  </button>
                </div>

                {/* Image Preview */}
                <div className="w-32 h-20 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={image.image_url}
                    alt={`Banner ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Image {index + 1}</p>
                  <p className="text-xs text-muted-foreground truncate">{image.image_url}</p>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={image.is_active}
                    onCheckedChange={() => toggleImageActive(image.id, image.is_active)}
                    aria-label={image.is_active ? "Deactivate" : "Activate"}
                  />
                  <Label className="text-xs">
                    {image.is_active ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Label>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteImage(image.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {heroImages.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Active images: {heroImages.filter((img) => img.is_active).length} / {heroImages.length}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default HeroImagesManagement;
