import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import { heroSectionSchema } from "@/lib/validations";
import HeroImagesManagement from "./HeroImagesManagement";

interface HeroSection {
  id: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  background_image: string;
}

const HeroSectionManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [heroSection, setHeroSection] = useState<HeroSection | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchHeroSection();
  }, []);

  const fetchHeroSection = async () => {
    try {
      const { data, error } = await supabase
        .from("hero_section")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setHeroSection(data);
    } catch (error) {
      console.error("Error fetching hero section:", error);
      toast({
        title: "Error",
        description: "Failed to load hero section",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string> => {
    // Use secure server-side upload function
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

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      title: (formData.get("title") as string || "").trim(),
      subtitle: (formData.get("subtitle") as string || "").trim(),
      button_text: (formData.get("button_text") as string || "").trim(),
      button_link: (formData.get("button_link") as string || "").trim(),
      background_image: (formData.get("background_image") as string || "").trim(),
    };

    // Validate
    const result = heroSectionSchema.safeParse(rawData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      let background_image = result.data.background_image || heroSection?.background_image || null;

      // Upload image if selected
      if (selectedImage) {
        setUploading(true);
        try {
          background_image = await uploadImage(selectedImage);
        } finally {
          setUploading(false);
        }
      }

      if (heroSection?.id) {
        const { error } = await supabase
          .from("hero_section")
          .update({
            title: result.data.title,
            subtitle: result.data.subtitle || null,
            button_text: result.data.button_text,
            button_link: result.data.button_link,
            background_image: background_image,
            updated_by: userId!,
          })
          .eq("id", heroSection.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hero_section")
          .insert([{
            title: result.data.title,
            subtitle: result.data.subtitle || null,
            button_text: result.data.button_text,
            button_link: result.data.button_link,
            background_image: background_image,
            updated_by: userId!,
          }]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Hero section updated successfully",
      });
      clearSelectedImage();
      fetchHeroSection();
    } catch (error) {
      console.error("Error saving hero section:", error);
      toast({
        title: "Error",
        description: "Failed to save hero section",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hero Section Management</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Images Carousel Management */}
      <HeroImagesManagement />

      {/* Text Content Management */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Section Content</CardTitle>
          <CardDescription>Update the homepage hero section text and buttons</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                defaultValue={heroSection?.title || ""}
                required
                maxLength={100}
                placeholder="Welcome to Our School"
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                name="subtitle"
                defaultValue={heroSection?.subtitle || ""}
                maxLength={200}
                placeholder="In Pursuit of Excellence"
                className={errors.subtitle ? "border-destructive" : ""}
              />
              {errors.subtitle && <p className="text-sm text-destructive">{errors.subtitle}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="button_text">Button Text *</Label>
              <Input
                id="button_text"
                name="button_text"
                defaultValue={heroSection?.button_text || "Apply Now"}
                required
                maxLength={50}
                className={errors.button_text ? "border-destructive" : ""}
              />
              {errors.button_text && <p className="text-sm text-destructive">{errors.button_text}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="button_link">Button Link *</Label>
              <Input
                id="button_link"
                name="button_link"
                defaultValue={heroSection?.button_link || "/admissions/apply"}
                required
                maxLength={200}
                placeholder="/admissions/apply or https://..."
                className={errors.button_link ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">Must start with / for internal links or http for external</p>
              {errors.button_link && <p className="text-sm text-destructive">{errors.button_link}</p>}
            </div>

            <div className="space-y-2">
              <Label>Fallback Background Image</Label>
              <p className="text-xs text-muted-foreground mb-2">
                This image is used when no carousel images are uploaded
              </p>
              
              {/* Image Preview */}
              {(previewUrl || heroSection?.background_image) && (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={previewUrl || heroSection?.background_image || ""}
                    alt="Hero background preview"
                    className="w-full h-48 object-cover"
                  />
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Upload Button */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : selectedImage ? "Change Image" : "Upload Image"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
              
              {selectedImage && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedImage.name}
                </p>
              )}

              {/* URL Input as alternative */}
              <div className="pt-2">
                <Label htmlFor="background_image" className="text-sm text-muted-foreground">
                  Or enter image URL directly
                </Label>
                <Input
                  id="background_image"
                  name="background_image"
                  defaultValue={heroSection?.background_image || ""}
                  maxLength={500}
                  placeholder="/hero-school.jpg or https://..."
                  className={errors.background_image ? "border-destructive" : ""}
                />
              </div>
              {errors.background_image && <p className="text-sm text-destructive">{errors.background_image}</p>}
            </div>

            <Button type="submit" disabled={saving || uploading}>
              {(saving || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? "Uploading..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroSectionManagement;
