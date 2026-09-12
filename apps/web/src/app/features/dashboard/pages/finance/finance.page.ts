import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-finance-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.scss']
})
export class FinancePage {
  students = [
    { name: 'John Doe', class: 'Form 1', amountDue: 1500000, amountPaid: 1500000, balance: 0, status: 'Paid' },
    { name: 'Jane Smith', class: 'Form 2', amountDue: 1800000, amountPaid: 900000, balance: 900000, status: 'Partial' },
    { name: 'Alice Johnson', class: 'Form 3', amountDue: 2000000, amountPaid: 0, balance: 2000000, status: 'Unpaid' },
    { name: 'Bob Williams', class: 'Form 1', amountDue: 1500000, amountPaid: 1000000, balance: 500000, status: 'Partial' },
    { name: 'Charlie Brown', class: 'Form 4', amountDue: 2500000, amountPaid: 2500000, balance: 0, status: 'Paid' }
  ];
}
