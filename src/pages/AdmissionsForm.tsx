import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { admissionsSchema, AdmissionsFormData } from "@/lib/validations";

const AdmissionsForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AdmissionsFormData>({
    studentName: "",
    dateOfBirth: "",
    gender: "male",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    address: "",
    gradeApplyingFor: "",
    previousSchool: "",
    additionalInfo: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AdmissionsFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // Bot trap field

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data client-side first for UX
    const result = admissionsSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AdmissionsFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof AdmissionsFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      // Use edge function for server-side validation and rate limiting
      const { data: functionData, error: functionError } = await supabase.functions.invoke("submit-admission", {
        body: {
          studentName: result.data.studentName,
          dateOfBirth: result.data.dateOfBirth,
          gender: result.data.gender,
          parentName: result.data.parentName,
          parentEmail: result.data.parentEmail,
          parentPhone: result.data.parentPhone,
          address: result.data.address,
          gradeApplyingFor: result.data.gradeApplyingFor,
          previousSchool: result.data.previousSchool || null,
          additionalInfo: result.data.additionalInfo || null,
          honeypot, // Include honeypot for bot detection
        },
      });

      if (functionError) {
        throw new Error(functionError.message || "Failed to submit application");
      }

      if (!functionData?.success) {
        const errorMessage = functionData?.details?.join(", ") || functionData?.error || "Failed to submit application";
        throw new Error(errorMessage);
      }

      toast.success("Application submitted successfully! We'll contact you soon.");
      navigate("/admissions");
    } catch (error) {
      console.error("Error submitting application:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit application. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    if (errors[name as keyof AdmissionsFormData]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    if (errors[name as keyof AdmissionsFormData]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/admissions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admissions
          </Link>
        </Button>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Admission Application Form</CardTitle>
            <CardDescription>
              Please fill out all required fields. We'll review your application and contact you within 5 business days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot field - hidden from users, bots will fill it */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ position: "absolute", left: "-9999px", opacity: 0 }}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              {/* Student Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Student Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="studentName">Full Name *</Label>
                  <Input
                    id="studentName"
                    name="studentName"
                    placeholder="Student's full name"
                    value={formData.studentName}
                    onChange={handleChange}
                    maxLength={100}
                    className={errors.studentName ? "border-destructive" : ""}
                    required
                  />
                  {errors.studentName && <p className="text-sm text-destructive">{errors.studentName}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className={errors.dateOfBirth ? "border-destructive" : ""}
                      required
                    />
                    {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)} required>
                      <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gradeApplyingFor">Grade Applying For *</Label>
                  <Select value={formData.gradeApplyingFor} onValueChange={(value) => handleSelectChange("gradeApplyingFor", value)} required>
                    <SelectTrigger className={errors.gradeApplyingFor ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kindergarten">Kindergarten</SelectItem>
                      <SelectItem value="Grade 1">Grade 1</SelectItem>
                      <SelectItem value="Grade 2">Grade 2</SelectItem>
                      <SelectItem value="Grade 3">Grade 3</SelectItem>
                      <SelectItem value="Grade 4">Grade 4</SelectItem>
                      <SelectItem value="Grade 5">Grade 5</SelectItem>
                      <SelectItem value="Grade 6">Grade 6</SelectItem>
                      <SelectItem value="Grade 7">Grade 7</SelectItem>
                      <SelectItem value="Grade 8">Grade 8</SelectItem>
                      <SelectItem value="Grade 9">Grade 9</SelectItem>
                      <SelectItem value="Grade 10">Grade 10</SelectItem>
                      <SelectItem value="Grade 11">Grade 11</SelectItem>
                      <SelectItem value="Grade 12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gradeApplyingFor && <p className="text-sm text-destructive">{errors.gradeApplyingFor}</p>}
                </div>
              </div>

              {/* Parent/Guardian Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Parent/Guardian Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="parentName">Parent/Guardian Name *</Label>
                  <Input
                    id="parentName"
                    name="parentName"
                    placeholder="Full name"
                    value={formData.parentName}
                    onChange={handleChange}
                    maxLength={100}
                    className={errors.parentName ? "border-destructive" : ""}
                    required
                  />
                  {errors.parentName && <p className="text-sm text-destructive">{errors.parentName}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentEmail">Email Address *</Label>
                    <Input
                      id="parentEmail"
                      name="parentEmail"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.parentEmail}
                      onChange={handleChange}
                      maxLength={255}
                      className={errors.parentEmail ? "border-destructive" : ""}
                      required
                    />
                    {errors.parentEmail && <p className="text-sm text-destructive">{errors.parentEmail}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">Phone Number *</Label>
                    <Input
                      id="parentPhone"
                      name="parentPhone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={formData.parentPhone}
                      onChange={handleChange}
                      maxLength={20}
                      className={errors.parentPhone ? "border-destructive" : ""}
                      required
                    />
                    {errors.parentPhone && <p className="text-sm text-destructive">{errors.parentPhone}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Home Address *</Label>
                  <Textarea
                    id="address"
                    name="address"
                    placeholder="Street address, City, State, ZIP"
                    rows={3}
                    value={formData.address}
                    onChange={handleChange}
                    maxLength={500}
                    className={errors.address ? "border-destructive" : ""}
                    required
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    {errors.address && <p className="text-destructive">{errors.address}</p>}
                    <span className="ml-auto">{formData.address.length}/500</span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Additional Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="previousSchool">Previous School (if applicable)</Label>
                  <Input
                    id="previousSchool"
                    name="previousSchool"
                    placeholder="Name of previous school"
                    value={formData.previousSchool}
                    onChange={handleChange}
                    maxLength={200}
                    className={errors.previousSchool ? "border-destructive" : ""}
                  />
                  {errors.previousSchool && <p className="text-sm text-destructive">{errors.previousSchool}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Additional Information</Label>
                  <Textarea
                    id="additionalInfo"
                    name="additionalInfo"
                    placeholder="Any additional information you'd like us to know..."
                    rows={4}
                    value={formData.additionalInfo}
                    onChange={handleChange}
                    maxLength={1000}
                    className={errors.additionalInfo ? "border-destructive" : ""}
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    {errors.additionalInfo && <p className="text-destructive">{errors.additionalInfo}</p>}
                    <span className="ml-auto">{(formData.additionalInfo || "").length}/1000</span>
                  </div>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdmissionsForm;
