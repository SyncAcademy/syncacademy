
import os

html_path = r"src/app/features/landing/landing.page.html"
scss_path = r"src/app/features/landing/landing.page.scss"

new_html = """<div class="landing-page">
  <!-- 1. Navigation -->
  <nav class="navbar">
    <div class="logo">
      <div class="logo-icon"></div>
      <span class="logo-text">SyncAcademy</span>
    </div>
    <div class="nav-links desktop-only">
      <a href="#features">Features</a>
      <a href="#solutions">Solutions</a>
      <a href="#testimonials">Testimonials</a>
      <a href="#pricing">Pricing</a>
    </div>
    <div class="nav-actions">
      <button class="btn btn-ghost desktop-only" routerLink="/auth/login">Log in</button>
      <button class="btn btn-primary" (click)="bypassAuth()">Get Started</button>
    </div>
  </nav>

  <!-- 2. Hero Section -->
  <header class="hero">
    <div class="hero-content">
      <span class="hero-badge">The Complete School Management System</span>
      <h1>Bring your entire school together</h1>
      <p>SyncAcademy connects administrators, teachers, and parents in one unified platform. Streamline operations, improve communication, and focus on what matters most - student success.</p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" (click)="bypassAuth()">Start Free Trial</button>
        <button class="btn btn-outline btn-lg">Book a Demo</button>
      </div>
      <p class="hero-subtext">No credit card required. 14-day free trial.</p>
    </div>
    <div class="hero-visual">
      <div class="glass-mockup">
        <!-- Abstract representation of the dashboard -->
        <div class="mockup-header">
          <div class="dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
        </div>
        <div class="mockup-body">
          <div class="mockup-sidebar"></div>
          <div class="mockup-main">
            <div class="mockup-card"></div>
            <div class="mockup-row">
              <div class="mockup-chart"></div>
              <div class="mockup-chart"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- 3. Unified Solution Section -->
  <section class="section unified-solution">
    <span class="section-label">THE UNIFIED SOLUTION</span>
    <h2>A single source of truth for your entire community.</h2>
    <p class="section-subtitle">Say goodbye to scattered spreadsheets and disjointed tools. SyncAcademy brings everyone onto the same page.</p>
    
    <div class="grid-4">
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <polyline points="17 11 19 13 23 9"></polyline>
          </svg>
        </div>
        <h3>School Administration</h3>
        <p>Oversee admissions, fees, and staff with real-time, comprehensive analytics.</p>
      </div>
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
            <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
          </svg>
        </div>
        <h3>Teachers</h3>
        <p>Manage attendance, enter marks, and track student progress effortlessly.</p>
      </div>
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h3>Parents</h3>
        <p>Stay informed with instant updates on fees, academics, and school news.</p>
      </div>
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <h3>Students</h3>
        <p>Access study materials, schedules, and report cards from any device.</p>
      </div>
    </div>
  </section>

  <!-- 4. System Overview / Dashboard Mockup -->
  <section class="section dashboard-preview-section">
    <span class="section-label">SYSTEM OVERVIEW</span>
    <h2>See your entire school at a glance</h2>
    
    <div class="dashboard-mockup">
      <!-- MacOS-style Header -->
      <div class="mockup-window-header">
        <div class="dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
      </div>
      
      <!-- Mockup Content -->
      <div class="mockup-content">
        <!-- Sidebar -->
        <div class="mock-sidebar">
          <div class="mock-logo">
            <div class="mock-logo-icon"></div>
            <span>SyncAcademy</span>
          </div>
          <div class="mock-nav">
            <div class="mock-nav-item active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Dashboard
            </div>
            <div class="mock-nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Students
            </div>
            <div class="mock-nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
              Academics
            </div>
            <div class="mock-nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
              Finance
            </div>
          </div>
        </div>
        
        <!-- Main Area -->
        <div class="mock-main">
          <div class="mock-header">
            <div class="mock-title">Director's Dashboard</div>
            <div class="mock-user">
              <div class="mock-avatar">AD</div>
            </div>
          </div>
          
          <!-- Stats Row -->
          <div class="mock-stats-row">
            <div class="mock-stat-card">
              <div class="stat-title">Total Students</div>
              <div class="stat-value">1,240 <span class="trend up">Active</span></div>
            </div>
            <div class="mock-stat-card">
              <div class="stat-title">Fee Collection (Term 1)</div>
              <div class="stat-value">TZS 102M <span class="trend">78%</span></div>
            </div>
            <div class="mock-stat-card">
              <div class="stat-title">Subjects</div>
              <div class="stat-value">18 <span class="trend">Running</span></div>
            </div>
          </div>
          
          <!-- Content Grid -->
          <div class="mock-grid">
            <div class="mock-chart">
              <div class="chart-header">Enrollment Trend</div>
              <div class="chart-body">
                <div class="bar" style="height: 60%"></div>
                <div class="bar" style="height: 70%"></div>
                <div class="bar" style="height: 65%"></div>
                <div class="bar" style="height: 85%"></div>
                <div class="bar" style="height: 90%"></div>
                <div class="bar" style="height: 100%"></div>
              </div>
            </div>
            
            <div class="mock-activity">
              <div class="activity-header">Recent Activity</div>
              <div class="activity-list">
                <div class="activity-item">
                  <div class="dot green"></div>
                  <div class="details">
                    <span class="text">Form 4 Results Published</span>
                    <span class="time">10 mins ago</span>
                  </div>
                </div>
                <div class="activity-item">
                  <div class="dot orange"></div>
                  <div class="details">
                    <span class="text">Fee Payment: Amani Juma</span>
                    <span class="time">1 hour ago</span>
                  </div>
                </div>
                <div class="activity-item">
                  <div class="dot blue"></div>
                  <div class="details">
                    <span class="text">Term 2 Syllabus Updated</span>
                    <span class="time">2 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Functional Modules -->
  <section class="section functional-modules">
    <span class="section-label">FUNCTIONAL MODULES</span>
    <h2>Everything works together</h2>
    <p class="section-subtitle">Each segment functions perfectly on its own while staying intimately connected to school-wide metrics in real time.</p>

    <div class="grid-4 functional-grid">
      <!-- 1. Student Management -->
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h3>Student Management</h3>
        <p>Complete bio profiles, family links, academic pathways, and documentation.</p>
      </div>

      <!-- 2. Academic Management -->
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <h3>Academic Management</h3>
        <p>Gradebooks, standardized reporting, examinations planning, and timetables.</p>
      </div>

      <!-- 3. Teacher & Staff Management -->
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        </div>
        <h3>Teacher & Staff Management</h3>
        <p>Workload tracking, assignments, performance, and communication hubs.</p>
      </div>

      <!-- 4. Finance Management -->
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
        </div>
        <h3>Finance Management</h3>
        <p>Automated billing templates, outstanding invoice reminders, and custom payments.</p>
      </div>

      <!-- 5. Parent Communication -->
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h3>Parent Communication</h3>
        <p>Direct portal, push updates, automated SMS alerts, and seamless integration.</p>
      </div>

      <!-- 6. Attendance Management -->
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline>
          </svg>
        </div>
        <h3>Attendance Management</h3>
        <p>Fast morning roll calls, modern scan logs, and automated absence alerts.</p>
      </div>

      <!-- 7. Reports & Analytics -->
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </div>
        <h3>Reports & Analytics</h3>
        <p>Intuitive charts mapping metrics from enrollment to cash collection.</p>
      </div>

      <!-- 8. Administration Control -->
      <div class="card">
        <div class="icon-wrapper">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <h3>Administration Control</h3>
        <p>Modular permission matrix controls, campus security, and historical logbooks.</p>
      </div>
    </div>
  </section>

  <!-- 6. Alternating Feature Blocks -->
  <section class="section feature-blocks">
    <!-- Block A: Student Profiles -->
    <div class="feature-block">
      <div class="feature-text">
        <span class="section-label">STUDENT PROFILES</span>
        <h2>Know every student. Manage every detail.</h2>
        <p>Our student records system keeps essential profiles up-to-date and instantly accessible by authorized personnel.</p>
        <ul class="feature-list">
          <li>
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Complete bio-data, documentation upload, and admissions history.
          </li>
          <li>
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Visual linkage to parents, guardians, and immediate family members.
          </li>
          <li>
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Integrated timelines combining academic performance with attendance.
          </li>
          <li>
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Tuition invoices, fee balances, and receipt history on one card.
          </li>
        </ul>
      </div>
      <div class="feature-visual">
        <div class="mockup-profile-card">
          <div class="mockup-profile-header">
            <span class="title">Student Profile</span>
            <span class="badge active-badge">Active (Class 10A)</span>
          </div>
          <div class="mockup-profile-user">
            <div class="avatar">
              <img src="https://images.unsplash.com/photo-1531123897727-8f129e1bf98c?w=150&h=150&fit=crop" alt="Student Profile Picture" />
            </div>
            <div class="user-info">
              <strong>Amani Juma</strong>
              <span>Reg ID: SA-2025-08412</span>
            </div>
          </div>
          <div class="mockup-profile-grid">
            <div class="grid-item">
              <span class="label">Guardian Name</span>
              <span class="value">Rashid Juma (Father)</span>
            </div>
            <div class="grid-item">
              <span class="label">Contact Number</span>
              <span class="value">+255 712 345 678</span>
            </div>
            <div class="grid-item">
              <span class="label">Academic Performance</span>
              <span class="value text-green">Excellent (A- Average)</span>
            </div>
            <div class="grid-item">
              <span class="label">Fee Payment Status</span>
              <span class="value text-orange">TZS 450,000 Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Block B: Academic Suite -->
    <div class="feature-block reverse">
      <div class="feature-text">
        <span class="section-label">ACADEMIC SUITE</span>
        <h2>Make academic management simpler</h2>
        <p>Empower your teachers with clean layouts to input marks, log lesson plans, schedule report card print runs, and coordinate syllabus expectations.</p>
        <ul class="feature-list">
          <li>
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Highly customizable grading scales tailored to national guidelines.
          </li>
          <li>
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Clean digital gradebooks that instantly average periodic assessments.
          </li>
          <li>
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Report card builders ready to compile results in single-click PDFs.
          </li>
          <li>
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Schedules and room-allocation calendars to prevent planning clashes.
          </li>
        </ul>
      </div>
      <div class="feature-visual">
        <div class="mockup-table-card">
          <div class="mockup-table-header">
            <span class="title">Gradebook: Form 4 Biology</span>
            <span class="badge term-badge">Term 2 Exams</span>
          </div>
          <div class="mockup-table-body">
            <div class="table-row table-head">
              <div class="col-name">Student Name</div>
              <div class="col-num">Test (30)</div>
              <div class="col-num">Exam (70)</div>
              <div class="col-num">Total (100)</div>
              <div class="col-grade">Grade</div>
            </div>
            <div class="table-row">
              <div class="col-name">Amani Juma</div>
              <div class="col-num">26</div>
              <div class="col-num">62</div>
              <div class="col-num font-bold">88</div>
              <div class="col-grade text-green">A</div>
            </div>
            <div class="table-row">
              <div class="col-name">Fadhili Omari</div>
              <div class="col-num">18</div>
              <div class="col-num">44</div>
              <div class="col-num font-bold">62</div>
              <div class="col-grade">B-</div>
            </div>
            <div class="table-row">
              <div class="col-name">Sarafina Mushi</div>
              <div class="col-num">28</div>
              <div class="col-num">65</div>
              <div class="col-num font-bold">93</div>
              <div class="col-grade text-green">A+</div>
            </div>
            <div class="table-row">
              <div class="col-name">Neema Masawe</div>
              <div class="col-num">14</div>
              <div class="col-num">32</div>
              <div class="col-num font-bold">46</div>
              <div class="col-grade text-red">D</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 7. Security & Roles Grid (NEW) -->
  <section class="section security-roles bg-gray">
    <div class="container text-center">
      <span class="section-label">SECURITY & ROLES</span>
      <h2>The right information for the right people</h2>
      <p class="section-subtitle mx-auto">Protect private information with a comprehensive, role-based security clearance matrix custom-fitted for every actor in your institution.</p>
      
      <div class="grid-3 security-grid">
        <div class="card security-card">
          <div class="icon-wrapper">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h3>Administrator</h3>
          <p>Complete oversight. Create terms, configure classes, modify security clearances, and track global school audit trails.</p>
        </div>

        <div class="card security-card">
          <div class="icon-wrapper">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <h3>Teacher</h3>
          <p>Classroom focused. Manage assigned student rosters, input assessment marks, record morning attendance rolls, and issue notes.</p>
        </div>

        <div class="card security-card">
          <div class="icon-wrapper">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </div>
          <h3>Accountant</h3>
          <p>Financial ledger master. Publish tuition invoice cycles, log student payments, adjust fee waivers, and compile summaries.</p>
        </div>

        <div class="card security-card">
          <div class="icon-wrapper">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </div>
          <h3>Receptionist</h3>
          <p>Front desk efficiency. Record daily student lateness metrics, monitor visitor logs, and verify basic biological card lookups.</p>
        </div>

        <div class="card security-card">
          <div class="icon-wrapper">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3>Parent</h3>
          <p>At-home insight portal. View children's attendance reports, monitor grade averages, check invoice balances, and chat with teachers.</p>
        </div>

        <div class="card security-card">
          <div class="icon-wrapper">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h3>Student</h3>
          <p>Personal pathway tracker. Check timetables, review graded exam remarks, submit classroom documents, and log homework plans.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 8. Footer -->
  <footer class="footer">
    <div class="container footer-container">
      <div class="footer-logo">
        <div class="logo-icon"></div>
        <span class="logo-text">SyncAcademy</span>
      </div>
      <div class="footer-links">
        <a href="#features">Features</a>
        <a href="#solutions">Solutions</a>
        <a href="#pricing">Pricing</a>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>&copy; 2026 SyncAcademy. All rights reserved.</p>
    </div>
  </footer>
</div>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(new_html)

print("Restored HTML successfully.")

