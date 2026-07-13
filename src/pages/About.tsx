import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Target, Eye, Heart, User } from "lucide-react";

interface PrincipalInfo {
  id: string;
  name: string;
  title: string;
  image_url: string | null;
  message: string;
}

const About = () => {
  const [principalInfo, setPrincipalInfo] = useState<PrincipalInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrincipalInfo = async () => {
      try {
        const { data, error } = await supabase
          .from("principal_info_public" as any)
          .select("id, name, title, image_url, message")
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") throw error;
        setPrincipalInfo(data as unknown as PrincipalInfo);
      } catch (error) {
        console.error("Error fetching principal info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrincipalInfo();
  }, []);

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-foreground">About Excellence Academy</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Since 2000, we've been dedicated to providing exceptional education that prepares students for success in an ever-changing world.
          </p>
        </div>

        {/* Mission, Vision, Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-4 w-fit">
                <Target className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To provide a nurturing and challenging educational environment that develops well-rounded individuals prepared to excel academically, socially, and personally.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-4 w-fit">
                <Eye className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To be a leading institution that inspires lifelong learners and responsible global citizens who contribute positively to society.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-4 w-fit">
                <Heart className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Our Core Values</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground space-y-2">
                <li><span className="font-semibold text-foreground">Love</span> — Caring for one another as a community</li>
                <li><span className="font-semibold text-foreground">Accountability</span> — Taking responsibility for our actions</li>
                <li><span className="font-semibold text-foreground">Honesty</span> — Truthfulness in all we do</li>
                <li><span className="font-semibold text-foreground">Faithfulness</span> — Dedication to our mission and each other</li>
                <li><span className="font-semibold text-foreground">Integrity</span> — Doing the right thing, even when no one is watching</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Principal's Message */}
        <div className="bg-muted/30 rounded-lg p-8 md:p-12 mb-20">
          <h2 className="text-3xl font-bold mb-8 text-foreground text-center">Message from the Principal</h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : principalInfo ? (
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Principal Image & Info */}
              <div className="flex flex-col items-center md:items-start gap-4 md:min-w-[250px]">
                <Avatar className="h-40 w-40 border-4 border-primary/20 shadow-lg">
                  <AvatarImage src={principalInfo.image_url || undefined} alt={principalInfo.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                    <User className="h-20 w-20" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold text-foreground">{principalInfo.name}</h3>
                  <p className="text-primary font-medium">{principalInfo.title}</p>
                </div>
              </div>
              
              {/* Message */}
              <div className="flex-1 space-y-4 text-muted-foreground">
                {principalInfo.message.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-muted-foreground">
              <p>Dear Students, Parents, and Community Members,</p>
              <p>
                It is with great pride and enthusiasm that I welcome you to Excellence Academy.
              </p>
            </div>
          )}
        </div>

        {/* School History */}
        <div>
          <h2 className="text-3xl font-bold mb-8 text-foreground text-center">Our History</h2>
          <div className="max-w-3xl mx-auto space-y-6 text-muted-foreground">
            <p>
              Elstar Mixed Education Centre was founded in 2018 with a vision to provide quality education that nurtures not just academic excellence, but also strong character, leadership skills, and a sense of social responsibility.
            </p>
            <p>
              Over the years, we have expanded our facilities to include modern science laboratories, computer labs, a well-stocked library, sports facilities, and art studios. Our curriculum has evolved to incorporate the latest educational research and technology while maintaining a strong foundation in core academic subjects.
            </p>
            <p>
              Today, Excellence Academy stands as a testament to our commitment to educational excellence. Our graduates have gone on to attend prestigious universities and pursue successful careers in various fields, making us proud of their achievements and contributions to society.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;