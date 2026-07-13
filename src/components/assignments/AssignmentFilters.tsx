import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface AssignmentFiltersProps {
  classes: Class[];
  subjects: Subject[];
  selectedClass: string;
  selectedSubject: string;
  onClassChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
}

const AssignmentFilters = ({
  classes,
  subjects,
  selectedClass,
  selectedSubject,
  onClassChange,
  onSubjectChange,
}: AssignmentFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <Label className="mb-2 block text-sm font-medium">Filter by Class</Label>
        <Select value={selectedClass} onValueChange={onClassChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label className="mb-2 block text-sm font-medium">Filter by Subject</Label>
        <Select value={selectedSubject} onValueChange={onSubjectChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default AssignmentFilters;
