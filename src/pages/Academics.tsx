import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Microscope, Palette, Calculator, Globe, Music, Award, GraduationCap, Trophy, Quote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Academics = () => {
  const departments = [
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: "English & Literature",
      description: "Comprehensive language arts program focusing on reading, writing, and critical thinking skills.",
      subjects: ["English Language", "Literature", "Creative Writing", "Public Speaking"],
    },
    {
      icon: <Calculator className="h-8 w-8" />,
      title: "Mathematics",
      description: "From basic arithmetic to advanced calculus, building strong mathematical foundations.",
      subjects: ["Algebra", "Geometry", "Calculus", "Statistics"],
    },
    {
      icon: <Microscope className="h-8 w-8" />,
      title: "Sciences",
      description: "Hands-on learning in modern laboratories with experienced science educators.",
      subjects: ["Biology", "Chemistry", "Physics", "Environmental Science"],
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Social Studies",
      description: "Understanding our world through history, geography, and social sciences.",
      subjects: ["History", "Geography", "Economics", "Civics"],
    },
    {
      icon: <Palette className="h-8 w-8" />,
      title: "Arts",
      description: "Fostering creativity and self-expression through various artistic mediums.",
      subjects: ["Visual Arts", "Drama", "Design", "Art History"],
    },
    {
      icon: <Music className="h-8 w-8" />,
      title: "Music & Performance",
      description: "Developing musical talent and appreciation through theory and practice.",
      subjects: ["Music Theory", "Choir", "Band", "Music Technology"],
    },
  ];

  const programs = [
    {
      title: "Primary School",
      grades: "Kindergarten - Grade 5",
      description: "Building strong foundations in literacy, numeracy, and social skills through engaging, age-appropriate activities.",
    },
    {
      title: "Middle School",
      grades: "Grade 6 - Grade 8",
      description: "Transitioning to more specialized subjects while maintaining a balanced curriculum and supporting adolescent development.",
    },
    {
      title: "High School",
      grades: "Grade 9 - Grade 12",
      description: "College preparatory curriculum with advanced placement options and career guidance to prepare for future success.",
    },
  ];

  const successStories = [
    {
      name: "Sarah Johnson",
      role: "Class of 2023",
      achievement: "Accepted to Harvard University",
      story: "The rigorous academic program and supportive teachers at Excellence Academy prepared me for the challenges of Ivy League admission. I'm now pursuing my dream of studying medicine.",
      avatar: "",
      program: "High School",
    },
    {
      name: "Michael Chen",
      role: "Class of 2022",
      achievement: "National Science Fair Winner",
      story: "The hands-on science labs and research opportunities helped me develop my project on renewable energy that won first place at the National Science Fair.",
      avatar: "",
      program: "Sciences",
    },
    {
      name: "Emily Rodriguez",
      role: "Class of 2024",
      achievement: "Published Young Author",
      story: "Through the creative writing program, I discovered my passion for storytelling. My first novel was published when I was just 17 years old.",
      avatar: "",
      program: "English & Literature",
    },
    {
      name: "David Okonkwo",
      role: "Class of 2021",
      achievement: "Olympic Youth Team Member",
      story: "Balancing academics and athletics was made possible by the flexible scheduling and support from my teachers. I represented my country at the Youth Olympics.",
      avatar: "",
      program: "Athletics",
    },
  ];

  const programHighlights = [
    {
      icon: <Award className="h-6 w-6" />,
      title: "Award-Winning Curriculum",
      description: "Our programs have been recognized nationally for excellence in education.",
    },
    {
      icon: <GraduationCap className="h-6 w-6" />,
      title: "College Preparation",
      description: "Dedicated counselors help students navigate the college application process.",
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Competitive Excellence",
      description: "Students regularly win awards in academic olympiads and competitions.",
    },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-foreground">Academic Programs</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Excellence Academy offers a comprehensive curriculum designed to challenge and inspire students at every level.
          </p>
        </div>

        {/* Programs Overview */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-8 text-foreground text-center">Our Programs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {programs.map((program, index) => (
              <Card key={index} className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">{program.title}</CardTitle>
                  <CardDescription className="text-lg font-semibold text-primary">{program.grades}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{program.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Departments */}
        <div>
          <h2 className="text-3xl font-bold mb-8 text-foreground text-center">Academic Departments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, index) => (
              <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-4 w-fit">
                    {dept.icon}
                  </div>
                  <CardTitle className="text-xl">{dept.title}</CardTitle>
                  <CardDescription>{dept.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <h4 className="font-semibold mb-2 text-foreground">Key Subjects:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {dept.subjects.map((subject, idx) => (
                      <li key={idx}>• {subject}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Program Highlights */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold mb-8 text-foreground text-center">Why Choose Our Programs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {programHighlights.map((highlight, index) => (
              <Card key={index} className="border-none shadow-lg text-center">
                <CardHeader>
                  <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mx-auto mb-2">
                    {highlight.icon}
                  </div>
                  <CardTitle className="text-lg">{highlight.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{highlight.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Success Stories */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Success Stories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our students go on to achieve remarkable things. Here are some of their inspiring journeys.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {successStories.map((story, index) => (
              <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 border-2 border-primary/20">
                      <AvatarImage src={story.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {story.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{story.name}</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {story.program}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{story.role}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600">{story.achievement}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 relative">
                    <Quote className="h-6 w-6 text-muted-foreground/20 absolute -left-1 -top-2" />
                    <p className="text-muted-foreground pl-6 italic">"{story.story}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Academic Excellence */}
        <div className="mt-20 bg-primary text-primary-foreground rounded-lg p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Academic Excellence</h2>
            <p className="text-lg mb-6 text-primary-foreground/90">
              Our rigorous curriculum is complemented by dedicated teachers, modern facilities, and a supportive learning environment that encourages students to reach their full potential.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">95%</div>
                <div className="text-sm text-primary-foreground/80">Graduation Rate</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">90%</div>
                <div className="text-sm text-primary-foreground/80">College Acceptance</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">15:1</div>
                <div className="text-sm text-primary-foreground/80">Student-Teacher Ratio</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Academics;
