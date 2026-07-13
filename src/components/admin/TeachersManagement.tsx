import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload, Camera, X } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface Teacher {
  id: string;
  teacher_id: string;
  user_id: string;
  date_of_birth: string | null;
  gender: string | null;
  qualification: string | null;
  specialization: string | null;
  address: string | null;
  profile?: Profile;
}

const TeachersManagement = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [selectedTeacherForPhoto, setSelectedTeacherForPhoto] = useState<Teacher | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTeachers = async () => {
    try {
      const [teachersRes, profilesRes] = await Promise.all([
        supabase.from("teachers").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email, avatar_url"),
      ]);

      if (teachersRes.error) throw teachersRes.error;
      if (profilesRes.error) throw profilesRes.error;

      // Map profiles by id for quick lookup
      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      
      // Join teachers with profiles manually
      const teachersWithProfiles = (teachersRes.data || []).map(teacher => ({
        ...teacher,
        profile: profilesMap.get(teacher.user_id)
      }));

      setTeachers(teachersWithProfiles);
      setProfiles(profilesRes.data || []);
    } catch (error: any) {
      toast.error("Failed to fetch teachers: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();

    const channel = supabase
      .channel("teachers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "teachers" }, () => {
        fetchTeachers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get profiles that are not already teachers
  const getAvailableProfiles = () => {
    const teacherUserIds = new Set(teachers.map(t => t.user_id));
    return profiles.filter(p => !teacherUserIds.has(p.id));
  };

  const handleSave = async (formData: FormData) => {
    try {
      const genderValue = formData.get("gender") as string;
      const data: any = {
        teacher_id: formData.get("teacher_id") as string,
        date_of_birth: formData.get("date_of_birth") as string || null,
        gender: genderValue && ["male", "female", "other"].includes(genderValue) ? genderValue : null,
        qualification: formData.get("qualification") as string || null,
        specialization: formData.get("specialization") as string || null,
        address: formData.get("address") as string || null,
      };

      if (editingTeacher) {
        const { error } = await supabase.from("teachers").update(data).eq("id", editingTeacher.id);
        if (error) throw error;
        toast.success("Teacher updated successfully");
      }

      setIsDialogOpen(false);
      setEditingTeacher(null);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  const handleAddTeacher = async (formData: FormData) => {
    try {
      if (!selectedUserId) {
        toast.error("Please select a user");
        return;
      }

      const genderValue = formData.get("gender") as string;
      const validGender = genderValue && ["male", "female", "other"].includes(genderValue) 
        ? genderValue as "male" | "female" | "other" 
        : undefined;
      
      const data = {
        user_id: selectedUserId,
        teacher_id: formData.get("teacher_id") as string,
        date_of_birth: formData.get("date_of_birth") as string || undefined,
        gender: validGender,
        qualification: formData.get("qualification") as string || undefined,
        specialization: formData.get("specialization") as string || undefined,
        address: formData.get("address") as string || undefined,
      };

      const { error } = await supabase.from("teachers").insert([data]);
      if (error) throw error;

      // Also assign the teacher role to this user
      const { error: roleError } = await supabase.from("user_roles").insert([{
        user_id: selectedUserId,
        role: "teacher" as const,
      }]);

      if (roleError && !roleError.message.includes("duplicate")) {
        console.error("Failed to assign teacher role:", roleError);
      }

      toast.success("Teacher added successfully");
      setIsAddDialogOpen(false);
      setSelectedUserId("");
    } catch (error: any) {
      toast.error("Failed to add teacher: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this teacher?")) return;

    try {
      const { error } = await supabase.from("teachers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Teacher deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ALLOWED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp';

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please select a valid image (JPEG, PNG, GIF, WebP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!selectedTeacherForPhoto || !fileInputRef.current?.files?.[0]) {
      toast.error("Please select a photo first");
      return;
    }

    const file = fileInputRef.current.files[0];
    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedTeacherForPhoto.user_id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("teacher-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("teacher-photos")
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", selectedTeacherForPhoto.user_id);

      if (updateError) throw updateError;

      toast.success("Photo uploaded successfully");
      setIsPhotoDialogOpen(false);
      setSelectedTeacherForPhoto(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchTeachers();
    } catch (error: any) {
      toast.error("Failed to upload photo: " + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async (teacher: Teacher) => {
    if (!confirm("Are you sure you want to remove this photo?")) return;

    try {
      // Update profile to remove avatar URL
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", teacher.user_id);

      if (error) throw error;

      toast.success("Photo removed successfully");
      fetchTeachers();
    } catch (error: any) {
      toast.error("Failed to remove photo: " + error.message);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const availableProfiles = getAvailableProfiles();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Teachers Management</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Teacher</DialogTitle>
              <DialogDescription>
                Select a user and fill in their teacher details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleAddTeacher(new FormData(e.currentTarget)); }} className="space-y-4">
              <div>
                <Label>Select User *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search by name..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    {availableProfiles.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No available users. All users are already teachers.
                      </div>
                    ) : (
                      availableProfiles
                        .filter((p) =>
                          p.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          p.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                        )
                        .map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name} ({profile.email})
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Teacher ID *</Label>
                <Input name="teacher_id" placeholder="e.g., TCH001" required />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input name="date_of_birth" type="date" />
              </div>
              <div>
                <Label>Gender</Label>
                <Select name="gender">
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Qualification</Label>
                <Input name="qualification" placeholder="e.g., M.Ed, B.Sc" />
              </div>
              <div>
                <Label>Specialization</Label>
                <Input name="specialization" placeholder="e.g., Mathematics, Science" />
              </div>
              <div>
                <Label>Address</Label>
                <Input name="address" placeholder="Enter address" />
              </div>
              <Button type="submit" className="w-full" disabled={!selectedUserId}>
                Add Teacher
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Teacher ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No teachers found. Click "Add Teacher" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="relative group">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={teacher.profile?.avatar_url || ""} alt={teacher.profile?.full_name || "Teacher"} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {teacher.profile?.full_name ? getInitials(teacher.profile.full_name) : "T"}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          onClick={() => {
                            setSelectedTeacherForPhoto(teacher);
                            setIsPhotoDialogOpen(true);
                            setPhotoPreview(teacher.profile?.avatar_url || null);
                          }}
                          className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Camera className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{teacher.teacher_id}</TableCell>
                    <TableCell>{teacher.profile?.full_name || "N/A"}</TableCell>
                    <TableCell>{teacher.specialization || "N/A"}</TableCell>
                    <TableCell>{teacher.qualification || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={isDialogOpen && editingTeacher?.id === teacher.id} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingTeacher(null); }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingTeacher(teacher)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Teacher</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4">
                              <div>
                                <Label>Teacher ID</Label>
                                <Input name="teacher_id" defaultValue={teacher.teacher_id} required />
                              </div>
                              <div>
                                <Label>Date of Birth</Label>
                                <Input name="date_of_birth" type="date" defaultValue={teacher.date_of_birth || ""} />
                              </div>
                              <div>
                                <Label>Gender</Label>
                                <Select name="gender" defaultValue={teacher.gender || ""}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Qualification</Label>
                                <Input name="qualification" defaultValue={teacher.qualification || ""} />
                              </div>
                              <div>
                                <Label>Specialization</Label>
                                <Input name="specialization" defaultValue={teacher.specialization || ""} />
                              </div>
                              <div>
                                <Label>Address</Label>
                                <Input name="address" defaultValue={teacher.address || ""} />
                              </div>
                              <Button type="submit" className="w-full">Save Changes</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(teacher.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Photo Upload Dialog */}
        <Dialog open={isPhotoDialogOpen} onOpenChange={(open) => {
          setIsPhotoDialogOpen(open);
          if (!open) {
            setSelectedTeacherForPhoto(null);
            setPhotoPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedTeacherForPhoto?.profile?.full_name
                  ? `Update Photo for ${selectedTeacherForPhoto.profile.full_name}`
                  : "Update Teacher Photo"}
              </DialogTitle>
              <DialogDescription>
                Upload a new profile photo for this teacher.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Photo Preview */}
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={photoPreview || ""} alt="Preview" />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {selectedTeacherForPhoto?.profile?.full_name
                        ? getInitials(selectedTeacherForPhoto.profile.full_name)
                        : "T"}
                    </AvatarFallback>
                  </Avatar>
                  {photoPreview && (
                    <button
                      onClick={() => {
                        setPhotoPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* File Input */}
              <div>
                <Label>Select Photo</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_IMAGE_EXTENSIONS}
                  onChange={handlePhotoSelect}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported: JPEG, PNG, GIF, WebP (max 5MB)
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handlePhotoUpload}
                  disabled={uploadingPhoto || !fileInputRef.current?.files?.[0]}
                  className="flex-1"
                >
                  {uploadingPhoto ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </>
                  )}
                </Button>
                {selectedTeacherForPhoto?.profile?.avatar_url && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (selectedTeacherForPhoto) {
                        handleRemovePhoto(selectedTeacherForPhoto);
                        setIsPhotoDialogOpen(false);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TeachersManagement;
