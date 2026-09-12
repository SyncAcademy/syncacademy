import { Component, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-attendance",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./attendance.page.html",
  styleUrls: ["./attendance.page.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePage {
  students = [
    {
      id: 1,
      name: "Alice Smith",
      status: "present",
      timeIn: "08:00 AM",
      notes: "",
    },
    {
      id: 2,
      name: "Bob Johnson",
      status: "absent",
      timeIn: "--",
      notes: "Sick leave",
    },
    {
      id: 3,
      name: "Charlie Brown",
      status: "late",
      timeIn: "08:15 AM",
      notes: "Traffic delay",
    },
    {
      id: 4,
      name: "Diana Prince",
      status: "present",
      timeIn: "07:55 AM",
      notes: "",
    },
    {
      id: 5,
      name: "Evan Davis",
      status: "excused",
      timeIn: "--",
      notes: "Doctor appointment",
    },
  ];

  stats = [
    { label: "Total Students", value: 120, type: "default" },
    { label: "Present Today", value: 110, type: "success" },
    { label: "Absent", value: 4, type: "danger" },
    { label: "Late", value: 4, type: "warning" },
    { label: "Excused", value: 2, type: "info" },
  ];

  setStatus(student: any, status: string) {
    student.status = status;
  }
}
