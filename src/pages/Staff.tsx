import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, GraduationCap, Award, Calendar, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeacherWithProfile {
  id: string;
  teacher_id: string;
  qualification: string | null;
  specialization: string | null;
  join_date: string | null;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

const Staff = () => {
  const [teachers, setTeachers] = useState<TeacherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("all");

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("id, teacher_id, qualification, specialization, join_date, user_id");

      if (teachersError) throw teachersError;

      if (teachersData && teachersData.length > 0) {
        const userIds = teachersData.map((t) => t.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const teachersWithProfiles = teachersData.map((teacher) => ({
          ...teacher,
          profile: profilesData?.find((p) => p.id === teacher.user_id) || null,
        }));

        setTeachers(teachersWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  // Get unique specializations for filter
  const specializations = useMemo(() => {
    const specs = teachers
      .map((t) => t.specialization)
      .filter((s): s is string => Boolean(s));
    return [...new Set(specs)].sort();
  }, [teachers]);

  // Filter teachers based on search and specialization
  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const matchesSearch =
        !searchQuery ||
        teacher.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.teacher_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.qualification?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSpecialization =
        selectedSpecialization === "all" ||
        teacher.specialization === selectedSpecialization;

      return matchesSearch && matchesSpecialization;
    });
  }, [teachers, searchQuery, selectedSpecialization]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSpecialization("all");
  };

  const hasActiveFilters = searchQuery || selectedSpecialization !== "all";
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Our Staff Directory
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Meet our dedicated team of educators who are committed to nurturing young minds
            and shaping the future leaders of tomorrow.
          </p>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or qualification..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Specialization Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Specializations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specializations</SelectItem>
                    {specializations.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Results Count */}
          {!loading && (
            <p className="text-sm text-muted-foreground mt-4">
              Showing {filteredTeachers.length} of {teachers.length} staff members
              {hasActiveFilters && " (filtered)"}
            </p>
          )}
        </div>
      </section>

      {/* Staff Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <Skeleton className="h-24 w-24 rounded-full" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-16">
              <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {teachers.length === 0 ? "No Staff Members Yet" : "No Results Found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {teachers.length === 0
                  ? "Staff directory will be populated soon."
                  : "Try adjusting your search or filter criteria."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTeachers.map((teacher) => (
                <Card
                  key={teacher.id}
                  className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      {/* Avatar */}
                      <Avatar className="h-24 w-24 ring-4 ring-primary/10 group-hover:ring-primary/20 transition-all">
                        <AvatarImage
                          src={teacher.profile?.avatar_url || ""}
                          alt={teacher.profile?.full_name || "Teacher"}
                        />
                        <AvatarFallback className="text-xl bg-primary/10 text-primary">
                          {teacher.profile?.full_name
                            ? getInitials(teacher.profile.full_name)
                            : "T"}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name & ID */}
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {teacher.profile?.full_name || "Unknown Teacher"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          ID: {teacher.teacher_id}
                        </p>
                      </div>

                      {/* Specialization Badge */}
                      {teacher.specialization && (
                        <Badge variant="secondary" className="font-normal">
                          <Award className="h-3 w-3 mr-1" />
                          {teacher.specialization}
                        </Badge>
                      )}

                      {/* Details */}
                      <div className="w-full space-y-2 pt-2 border-t border-border">
                        {teacher.qualification && (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <GraduationCap className="h-4 w-4" />
                            <span>{teacher.qualification}</span>
                          </div>
                        )}

                        {teacher.join_date && (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Since {formatDate(teacher.join_date)}</span>
                          </div>
                        )}

                        {teacher.profile?.email && (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <a
                              href={`mailto:${teacher.profile.email}`}
                              className="hover:text-primary transition-colors truncate max-w-[180px]"
                            >
                              {teacher.profile.email}
                            </a>
                          </div>
                        )}

                        {teacher.profile?.phone && (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <a
                              href={`tel:${teacher.profile.phone}`}
                              className="hover:text-primary transition-colors"
                            >
                              {teacher.profile.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      {!loading && teachers.length > 0 && (
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  {teachers.length}+
                </div>
                <p className="text-muted-foreground">Qualified Teachers</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  {new Set(teachers.map((t) => t.specialization).filter(Boolean)).size}+
                </div>
                <p className="text-muted-foreground">Subject Specializations</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">100%</div>
                <p className="text-muted-foreground">Dedicated to Excellence</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Staff;
