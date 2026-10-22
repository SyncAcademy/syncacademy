import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';

interface FaqItem {
  question: string;
  answer: string;
  details?: string[];
}

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, LogoComponent, PublicFooterComponent],
  templateUrl: './faq.page.html',
  styleUrls: ['./faq.page.scss']
})
export class FaqPage {
  readonly openFaqIndex = signal<number | null>(null);
  readonly mobileMenuOpen = signal(false);

  readonly faqs: FaqItem[] = [
    {
      question: 'What is SyncAcademy?',
      answer: 'SyncAcademy is a comprehensive school management platform designed to simplify daily school operations. It brings student records, academics, attendance, financial management, staff administration, and school communication together in one centralized digital system.'
    },
    {
      question: 'Who can use SyncAcademy?',
      answer: "SyncAcademy is designed for schools and their authorized staff, including Headmasters, Registrars, Academic Officers, Teachers, Bursars, and other administrators. Access to features depends on each user's assigned role and permissions."
    },
    {
      question: 'How can my school get started with SyncAcademy?',
      answer: 'Getting started is simple. Click Request a Demo on our website, complete the school information form, and submit your request. Our team will review your details, contact you to arrange a demonstration, and guide you through the onboarding process.'
    },
    {
      question: 'Can I create an account without registering a school?',
      answer: 'No. SyncAcademy follows a school-based registration process. School accounts are created through an authorized onboarding process. Once your school is approved, authorized users can receive invitations to activate their accounts.'
    },
    {
      question: "Why is the Headmaster's email required when requesting a demo?",
      answer: "The Headmaster's email is required because it serves as the designated contact for the school's initial administrative account. After the school is approved and onboarded, a secure invitation can be sent to that email address to activate the account."
    },
    {
      question: 'What happens after I submit a demo request?',
      answer: "Your request is recorded and forwarded to the SyncAcademy administration team for review. Our team will use your provided contact information to discuss your school's requirements, arrange a demonstration, and explain the next steps."
    },
    {
      question: 'What school activities can SyncAcademy manage?',
      answer: "SyncAcademy supports several essential school operations. Available functionality depends on your school's configuration and enabled modules.",
      details: [
        'Student registration and record management.',
        'Academic results and examinations.',
        'Class and subject management.',
        'Teacher and staff administration.',
        'Student attendance monitoring.',
        'School fees and financial records.',
        'Parent and guardian communication.',
        'Reports and administrative oversight.'
      ]
    },
    {
      question: "Can teachers access students' academic records?",
      answer: 'Yes. Authorized teachers can access relevant student academic information according to their assigned responsibilities and permissions. Access controls help ensure that users only interact with information they are permitted to view or manage.'
    },
    {
      question: "Can parents monitor their children's academic progress?",
      answer: 'SyncAcademy is designed to support parent access to important school information, such as academic results, fee information, and school announcements. Availability depends on the parent-facing features enabled for your school.'
    },
    {
      question: 'Can SyncAcademy manage multiple schools?',
      answer: 'Yes. SyncAcademy is designed as a multi-school management platform. Each registered school operates within its own workspace, with separate records, settings, users, and administrative permissions.'
    },
    {
      question: "Is my school's information secure?",
      answer: "SyncAcademy uses role-based access controls and school-specific permissions to protect information from unauthorized access. Security and privacy are important parts of the platform's design, with additional protections applied through its backend and deployment configuration."
    },
    {
      question: 'Can we transfer our existing school records into SyncAcademy?',
      answer: 'If your school already maintains digital records, our team can discuss suitable options for preparing and importing existing information. The available migration approach depends on the format, quality, and structure of your current records.'
    },
    {
      question: 'Can SyncAcademy be accessed on mobile phones and tablets?',
      answer: 'SyncAcademy is designed with responsive web interfaces so users can access supported features from desktops, tablets, and smartphones. The interface adapts to different screen sizes, although available features may vary by user role.'
    },
    {
      question: 'How much does SyncAcademy cost?',
      answer: "Pricing information can be discussed based on your school's requirements and the services you need. Request a demo to learn more about the available options and determine a suitable arrangement for your institution."
    },
    {
      question: 'What if our school needs help using SyncAcademy?',
      answer: "You can contact the SyncAcademy team through the website for assistance with getting started, understanding the platform, and discussing your school's technical or operational requirements."
    }
  ];

  toggleFaq(index: number): void {
    this.openFaqIndex.update(openIndex => openIndex === index ? null : index);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.mobileMenuOpen()) {
      this.closeMobileMenu();
    }
  }
}
