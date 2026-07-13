import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, FileText, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ImportantDate {
  id: string;
  label: string;
  deadline_text: string;
}

const Admissions = () => {
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);

  useEffect(() => {
    supabase
      .from("important_dates")
      .select("id,label,deadline_text")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => setImportantDates(data || []));
  }, []);
  const steps = [{
    icon: <FileText className="h-8 w-8" />,
    title: "Submit Application",
    description: "Complete and submit the online application form with required documents."
  }, {
    icon: <Calendar className="h-8 w-8" />,
    title: "Schedule Visit",
    description: "Arrange a campus tour and meet with our admissions team."
  }, {
    icon: <UserCheck className="h-8 w-8" />,
    title: "Interview & Assessment",
    description: "Participate in a student interview and academic assessment."
  }, {
    icon: <CheckCircle2 className="h-8 w-8" />,
    title: "Receive Decision",
    description: "Get your admission decision and enrollment information."
  }];
  const requirements = ["Completed application form", "Birth certificate", "Previous school transcripts", "Immunization records", "Two letters of recommendation", "Recent passport-size photographs"];
  return <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-foreground">Admissions</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Join our community of learners. We're excited to welcome your family to Elstar Mixed Educational Centre.</p>
        </div>

        {/* Admission Process */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-8 text-foreground text-center">Admission Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => <Card key={index} className="border-none shadow-lg text-center">
                <CardHeader>
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4 w-fit mx-auto">
                    {step.icon}
                  </div>
                  <div className="text-4xl font-bold text-primary mb-2">{index + 1}</div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>

        {/* Requirements & Deadlines */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Application Requirements</CardTitle>
              <CardDescription>Please prepare the following documents</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {requirements.map((req, index) => <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{req}</span>
                  </li>)}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Important Dates</CardTitle>
              <CardDescription>Key admission deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {importantDates.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No important dates posted yet.</p>
                ) : (
                  importantDates.map((d) => (
                    <div key={d.id} className="border-l-4 border-primary pl-4">
                      <div className="font-semibold text-foreground">{d.label}</div>
                      <div className="text-sm text-muted-foreground">{d.deadline_text}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tuition & Financial Aid */}
        <div className="bg-muted/30 rounded-lg p-8 md:p-12 mb-20">
          <h2 className="text-3xl font-bold mb-6 text-foreground text-center">Tuition </h2>
          <div className="max-w-3xl mx-auto text-center space-y-4 text-muted-foreground">
            <p>Excellence Academy is committed to making quality education accessible to all qualified students.</p>
            <p>For detailed tuition information, please contact our admissions office or schedule a meeting with our financial office</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6 text-foreground">Ready to Apply?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">Start your application today or schedule a visit to learn more about Elstar Mixed Educational Centre.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="default" asChild>
              <Link to="/admissions/apply">Start Application</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/contact">Schedule a Visit</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>;
};
export default Admissions;