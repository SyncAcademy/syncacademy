import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-gradebook",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./gradebook.page.html",
  styleUrls: ["./gradebook.page.scss"],
})
export class GradebookPage {
  students = [
    {
      name: "Alice Johnson",
      assignment1: 18,
      assignment2: 18,
      midterm: 35,
      final: 65,
      total: 85,
      grade: "A",
      gradeColor: "success",
    },
    {
      name: "Bob Smith",
      assignment1: 15,
      assignment2: 14,
      midterm: 30,
      final: 55,
      total: 72,
      grade: "B",
      gradeColor: "primary",
    },
    {
      name: "Charlie Brown",
      assignment1: 12,
      assignment2: 15,
      midterm: 25,
      final: 45,
      total: 60,
      grade: "C",
      gradeColor: "warning",
    },
    {
      name: "Diana Prince",
      assignment1: 19,
      assignment2: 19,
      midterm: 38,
      final: 68,
      total: 95,
      grade: "A",
      gradeColor: "success",
    },
    {
      name: "Evan Wright",
      assignment1: 10,
      assignment2: 12,
      midterm: 20,
      final: 40,
      total: 48,
      grade: "F",
      gradeColor: "danger",
    },
  ];

  averages = {
    assignment1: 14.8,
    assignment2: 15.6,
    midterm: 29.6,
    final: 54.6,
    total: 72.0,
  };
}
