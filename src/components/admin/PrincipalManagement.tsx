import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Loader2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PrincipalInfo {
  id: string;
  name: string;
  title: string;
  image_url: string | null;
  message: string;
  email: string | null;
  phone: string | null;
}

const PrincipalManagement = () => {
  const { user } = useAuth();
  const [principalInfo, setPrincipalInfo] = useState<PrincipalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPrincipalInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("principal_info")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setPrincipalInfo(data);
    } catch (error: any) {
      toast.error("Failed to fetch principal info: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrincipalInfo();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string> => {
    // Use secure server-side upload function
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "principal-images");

    const { data, error } = await supabase.functions.invoke("upload-image", {
      body: formData,
    });

    if (error) throw new Error(error.message || "Upload failed");
    if (!data?.publicUrl) throw new Error("Failed to get upload URL");

    return data.publicUrl;
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = (formData.get("name") as string || "").trim();
    const title = (formData.get("title") as string || "").trim();
    const message = (formData.get("message") as string || "").trim();
    const email = (formData.get("email") as string || "").trim() || null;
    const phone = (formData.get("phone") as string || "").trim() || null;

    if (!name || !title || !message) {
      toast.error("Name, title, and message are required");
      return;
    }

    setSaving(true);

    try {
      let image_url = principalInfo?.image_url || null;

      if (selectedImage) {
        setUploading(true);
        image_url = await uploadImage(selectedImage);
        setUploading(false);
      }

      const data = {
        name,
        title,
        message,
        email,
        phone,
        image_url,
        updated_by: user?.id,
      };

      if (principalInfo?.id) {
        const { error } = await supabase
          .from("principal_info")
          .update(data)
          .eq("id", principalInfo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("principal_info")
          .insert(data);
        if (error) throw error;
      }

      toast.success("Principal information updated successfully");
      setSelectedImage(null);
      setPreviewUrl(null);
      fetchPrincipalInfo();
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const displayImageUrl = previewUrl || principalInfo?.image_url;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Principal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Image Upload */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              <AvatarImage src={displayImageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Change Photo"}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={principalInfo?.name || ""}
                required
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="title">Title/Position *</Label>
              <Input
                id="title"
                name="title"
                defaultValue={principalInfo?.title || ""}
                required
                maxLength={100}
                placeholder="e.g., Principal, Director"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={principalInfo?.email || ""}
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={principalInfo?.phone || ""}
                maxLength={20}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              name="message"
              defaultValue={principalInfo?.message || ""}
              required
              rows={10}
              maxLength={5000}
              placeholder="Write the principal's message to students and parents..."
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PrincipalManagement;
