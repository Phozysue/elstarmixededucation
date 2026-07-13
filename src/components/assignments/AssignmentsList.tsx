import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import AssignmentFilters from "./AssignmentFilters";
import AssignmentCard from "./AssignmentCard";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_marks: number;
  file_url: string | null;
  class_id: string;
  subject_id: string;
  class_name: string;
  subject_name: string;
}

interface ClassInfo {
  id: string;
  name: string;
}

interface SubjectInfo {
  id: string;
  name: string;
}

interface AssignmentsListProps {
  filterByClassId?: string; // For students: limit to their class only
  title?: string;
  description?: string;
  studentId?: string; // when present, enables submit buttons on cards
}

const AssignmentsList = ({ 
  filterByClassId, 
  title = "Assignments",
  description = "View and download assignments",
  studentId,
}: AssignmentsListProps) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        let assignmentsQuery = supabase
          .from("assignments")
          .select(`
            id, title, description, due_date, max_marks, file_url,
            class_subjects!inner (
              class_id,
              subject_id,
              classes (id, name),
              subjects (id, name)
            )
          `)
          .order("due_date", { ascending: true });

        // If filtering by class (for students), apply filter
        if (filterByClassId) {
          assignmentsQuery = assignmentsQuery.eq("class_subjects.class_id", filterByClassId);
        }

        const { data: assignmentsData, error: assignmentsError } = await assignmentsQuery;

        if (assignmentsError) throw assignmentsError;

        const formattedAssignments: Assignment[] = (assignmentsData || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          due_date: a.due_date,
          max_marks: a.max_marks,
          file_url: a.file_url,
          class_id: a.class_subjects?.class_id || "",
          subject_id: a.class_subjects?.subject_id || "",
          class_name: a.class_subjects?.classes?.name || "",
          subject_name: a.class_subjects?.subjects?.name || "",
        }));

        setAssignments(formattedAssignments);

        // Extract unique classes and subjects for filters
        const uniqueClasses = new Map<string, ClassInfo>();
        const uniqueSubjects = new Map<string, SubjectInfo>();

        formattedAssignments.forEach((a) => {
          if (a.class_id && a.class_name) {
            uniqueClasses.set(a.class_id, { id: a.class_id, name: a.class_name });
          }
          if (a.subject_id && a.subject_name) {
            uniqueSubjects.set(a.subject_id, { id: a.subject_id, name: a.subject_name });
          }
        });

        setClasses(Array.from(uniqueClasses.values()));
        setSubjects(Array.from(uniqueSubjects.values()));
      } catch (error: any) {
        toast.error("Failed to fetch assignments: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription
    const channel = supabase
      .channel("assignments-list-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterByClassId]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesClass = selectedClass === "all" || assignment.class_id === selectedClass;
      const matchesSubject = selectedSubject === "all" || assignment.subject_id === selectedSubject;
      return matchesClass && matchesSubject;
    });
  }, [assignments, selectedClass, selectedSubject]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <AssignmentFilters
          classes={classes}
          subjects={subjects}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          onClassChange={setSelectedClass}
          onSubjectChange={setSelectedSubject}
        />

        <div className="space-y-4">
          {filteredAssignments.length > 0 ? (
            filteredAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                id={assignment.id}
                title={assignment.title}
                description={assignment.description}
                due_date={assignment.due_date}
                max_marks={assignment.max_marks}
                file_url={assignment.file_url}
                class_name={assignment.class_name}
                subject_name={assignment.subject_name}
                studentId={studentId}
              />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {assignments.length === 0 
                ? "No assignments available" 
                : "No assignments match the selected filters"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentsList;
