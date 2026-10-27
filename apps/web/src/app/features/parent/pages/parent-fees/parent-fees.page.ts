import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentAuthService } from '@core/services/parent-auth.service';

export interface FeeData {
  balance: number;
  totalInvoiced: number;
  totalPaid: number;
  charges: Array<{ id: string; name: string; amount: number; dueDate?: string; date?: string }>;
  payments: Array<{ id: string; reference: string; amount: number; paidAt: string; method?: string }>;
  adjustments: Array<{ id: string; reason: string; amount: number; date: string }>;
}

@Component({
  selector: 'app-parent-fees',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fees-view">
      @if (loading()) {
        <div style="text-align:center;padding:40px;color:#6B7280;">Loading fee records...</div>
      } @else if (fees(); as data) {
        <div class="fee-overview-cards">
          <div class="fee-card" [class.balance-alert]="data.balance > 0">
            <span class="card-label">Outstanding Balance</span>
            <div class="card-amount">TZS {{ data.balance | number:'1.0-0' }}</div>
          </div>

          <div class="fee-card paid-success">
            <span class="card-label">Total Amount Paid</span>
            <div class="card-amount">TZS {{ data.totalPaid | number:'1.0-0' }}</div>
          </div>

          <div class="fee-card">
            <span class="card-label">Total Invoiced</span>
            <div class="card-amount">TZS {{ data.totalInvoiced | number:'1.0-0' }}</div>
          </div>
        </div>

        <section class="fee-transactions-section">
          <h3>Fee Invoices and Charges</h3>
          @if (data.charges.length) {
            <table class="transaction-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Due Date</th>
                  <th class="num-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (c of data.charges; track c.id) {
                  <tr>
                    <td>{{ c.name }}</td>
                    <td>{{ (c.dueDate || c.date) | date:'mediumDate' }}</td>
                    <td class="num-col">TZS {{ c.amount | number:'1.0-0' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="empty-tx">No fee charges recorded.</div>
          }
        </section>

        <section class="fee-transactions-section">
          <h3>Payment History</h3>
          @if (data.payments.length) {
            <table class="transaction-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th class="num-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (p of data.payments; track p.id) {
                  <tr>
                    <td><strong>{{ p.reference }}</strong></td>
                    <td>{{ p.paidAt | date:'mediumDate' }}</td>
                    <td><span class="type-pill payment">{{ p.method || 'Bank / Mobile' }}</span></td>
                    <td class="num-col">TZS {{ p.amount | number:'1.0-0' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="empty-tx">No payment transactions recorded yet.</div>
          }
        </section>
      } @else {
        <div class="empty-tx" style="text-align:center;padding:48px;">
          <p>Fee statements are not currently available for this child record.</p>
        </div>
      }
    </div>
  `,
  styleUrls: ['./parent-fees.page.scss']
})
export class ParentFeesPage {
  readonly auth = inject(ParentAuthService);
  fees = signal<FeeData | null>(null);
  loading = signal(false);

  constructor() {
    effect(() => {
      const childId = this.auth.selectedChildId();
      if (childId) {
        void this.loadFees(childId);
      }
    });
  }

  async loadFees(studentId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.auth.request<FeeData>('GET', `parent/children/${studentId}/fees`);
      this.fees.set(res);
    } catch {
      this.fees.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
