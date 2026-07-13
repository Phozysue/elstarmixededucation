import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { contactSchema, ContactFormData } from "@/lib/validations";

const Contact = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // Bot trap field

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data client-side first for UX
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof ContactFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      // Use edge function for server-side validation and rate limiting
      const { data: functionData, error: functionError } = await supabase.functions.invoke("submit-contact", {
        body: {
          name: result.data.name,
          email: result.data.email,
          subject: result.data.subject,
          message: result.data.message,
          honeypot, // Include honeypot for bot detection
        },
      });

      if (functionError) {
        throw new Error(functionError.message || "Failed to send message");
      }

      if (!functionData?.success) {
        const errorMessage = functionData?.details?.join(", ") || functionData?.error || "Failed to send message";
        throw new Error(errorMessage);
      }

      toast.success("Thank you! We'll get back to you soon.");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
    } catch (error) {
      console.error("Error submitting contact form:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when user starts typing
    if (errors[name as keyof ContactFormData]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  // School coordinates - Nairobi, Kenya (update these to exact location)
  const schoolLat = -1.2864;
  const schoolLng = 36.8172;
  const schoolName = "Elstar Mixed Educational Centre";
  const schoolAddress = "P.O.Box 54145-0100, Nairobi, Kenya";
  
  // Google Maps embed URL with actual location
  const mapEmbedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8175885098765!2d${schoolLng}!3d${schoolLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMTcnMTEuMCJTIDM2wrA0OScwMS45IkU!5e0!3m2!1sen!2ske!4v1699999999999!5m2!1sen!2ske`;
  
  // Google Maps directions URL
  const getDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${schoolLat},${schoolLng}&destination_place_id=&travelmode=driving`;

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-foreground">Get In Touch</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Have a question about admissions, academics, or campus life? We'd love to hear from you. Fill out the form and our team will respond within 24 hours.</p>
        </div>

        {/* Google Maps */}
        <div className="mb-12">
          <Card className="border-none shadow-lg overflow-hidden">
            <div className="aspect-video w-full relative">
              <iframe 
                src={mapEmbedUrl}
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade" 
                title={`${schoolName} Location Map`} 
              />
            </div>
            <div className="p-4 bg-muted/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">{schoolName}</h3>
                <p className="text-sm text-muted-foreground">{schoolAddress}</p>
              </div>
              <Button asChild className="shrink-0">
                <a 
                  href={getDirectionsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Get Directions
                </a>
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2 w-fit">
                  <MapPin className="h-6 w-6" />
                </div>
                <CardTitle>Address</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {schoolAddress}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2 w-fit">
                  <Phone className="h-6 w-6" />
                </div>
                <CardTitle>Phone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Main Office: +254 700901266<br />
                  Admissions: +254 754323024
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2 w-fit">
                  <Mail className="h-6 w-6" />
                </div>
                <CardTitle>Email</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  General: elstermixed@gmail.com
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2 w-fit">
                  <Clock className="h-6 w-6" />
                </div>
                <CardTitle>Office Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Monday - Friday: 8:00 AM - 4:00 PM<br />
                  Saturday: 9:00 AM - 12:00 PM<br />
                  Sunday: Closed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Send us a Message</CardTitle>
                <CardDescription>Fill out the form below and we'll get back to you shortly</CardDescription>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        placeholder="John Doe" 
                        value={formData.name} 
                        onChange={handleChange} 
                        maxLength={100}
                        className={errors.name ? "border-destructive" : ""}
                        required 
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="john@example.com" 
                        value={formData.email} 
                        onChange={handleChange} 
                        maxLength={255}
                        className={errors.email ? "border-destructive" : ""}
                        required 
                      />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input 
                      id="subject" 
                      name="subject" 
                      placeholder="What is this regarding?" 
                      value={formData.subject} 
                      onChange={handleChange} 
                      maxLength={200}
                      className={errors.subject ? "border-destructive" : ""}
                      required 
                    />
                    {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea 
                      id="message" 
                      name="message" 
                      placeholder="Tell us more about your inquiry..." 
                      rows={6} 
                      value={formData.message} 
                      onChange={handleChange} 
                      maxLength={2000}
                      className={errors.message ? "border-destructive" : ""}
                      required 
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      {errors.message && <p className="text-destructive">{errors.message}</p>}
                      <span className="ml-auto">{formData.message.length}/2000</span>
                    </div>
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
