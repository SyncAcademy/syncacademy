
import os

html_path = r"src/app/features/landing/landing.page.html"
scss_path = r"src/app/features/landing/landing.page.scss"

new_html = """<div class="landing-page">
  <!-- 1. NAVBAR -->
  <nav class="navbar">
    <div class="logo">
      <div class="logo-icon"></div>
      <span class="logo-text">EduSync</span>
    </div>
    <div class="nav-links desktop-only">
      <a href="#what">What is it?</a>
      <a href="#features">Features</a>
      <a href="#connection">Connection</a>
      <a href="#analytics">Analytics</a>
    </div>
    <div class="nav-actions">
      <button class="btn btn-ghost desktop-only" routerLink="/auth/login">Log in</button>
      <button class="btn btn-primary" (click)="bypassAuth()">Get Started</button>
    </div>
  </nav>

  <!-- 2. HERO -->
  <header class="hero">
    <div class="hero-content">
      <span class="hero-badge">School Management Platform</span>
      <h1>A smarter way to manage your school</h1>
      <p>Streamline your administrative tasks, empower your teachers, and keep parents in the loop. Everything you need to run a modern educational institution in one seamless platform.</p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" (click)="bypassAuth()">Get Started</button>
        <button class="btn btn-outline btn-lg">Request a Demo</button>
      </div>
    </div>
  </header>

  <!-- 3. WHAT IS EDUSYNC? -->
  <section id="what" class="section what-is-edusync">
    <div class="container text-center">
      <span class="section-label">WHAT IS EDUSYNC?</span>
      <h2>Everything your school needs in one place</h2>
      <p class="section-subtitle mx-auto">A unified ecosystem built specifically for the three pillars of your educational community.</p>
      
      <div class="pillars-container">
        <div class="pillar">
          <div class="pillar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <h3>School Administration</h3>
          <p>Tools to manage enrollment, human resources, scheduling, and high-level analytics without the overhead.</p>
        </div>
        <div class="pillar">
          <div class="pillar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
          </div>
          <h3>Teachers</h3>
          <p>Intuitive gradebooks, attendance tracking, and lesson planning designed to save time and reduce burnout.</p>
        </div>
        <div class="pillar">
          <div class="pillar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <h3>Parents</h3>
          <p>Real-time updates on academic performance, fee balances, and direct communication with staff.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 4. DASHBOARD -->
  <section class="section dashboard-preview-section bg-gray">
    <div class="container text-center">
      <span class="section-label">SYSTEM OVERVIEW</span>
      <h2>See your entire school at a glance</h2>
      
      <div class="dashboard-mockup">
        <!-- MacOS-style Header -->
        <div class="mockup-window-header">
          <div class="dots">
            <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
          </div>
        </div>
        
        <!-- Mockup Content -->
        <div class="mockup-content">
          <div class="mock-sidebar">
            <div class="mock-logo">
              <div class="mock-logo-icon"></div>
              <span>EduSync</span>
            </div>
            <div class="mock-nav">
              <div class="mock-nav-item active"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>Dashboard</div>
              <div class="mock-nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>Students</div>
              <div class="mock-nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path></svg>Academics</div>
              <div class="mock-nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect></svg>Finance</div>
            </div>
          </div>
          
          <div class="mock-main">
            <div class="mock-header">
              <div class="mock-title">Director's Dashboard</div>
              <div class="mock-user"><div class="mock-avatar">AD</div></div>
            </div>
            
            <div class="mock-stats-row">
              <div class="mock-stat-card"><div class="stat-title">Total Students</div><div class="stat-value">1,240 <span class="trend up">Active</span></div></div>
              <div class="mock-stat-card"><div class="stat-title">Fee Collection (Term 1)</div><div class="stat-value">TZS 102M <span class="trend">78%</span></div></div>
              <div class="mock-stat-card"><div class="stat-title">Subjects</div><div class="stat-value">18 <span class="trend">Running</span></div></div>
            </div>
            
            <div class="mock-grid">
              <div class="mock-chart">
                <div class="chart-header">Enrollment Trend</div>
                <div class="chart-body">
                  <div class="bar" style="height: 60%"></div><div class="bar" style="height: 70%"></div><div class="bar" style="height: 65%"></div><div class="bar" style="height: 85%"></div><div class="bar" style="height: 90%"></div><div class="bar" style="height: 100%"></div>
                </div>
              </div>
              
              <div class="mock-activity">
                <div class="activity-header">Recent Activity</div>
                <div class="activity-list">
                  <div class="activity-item"><div class="dot green"></div><div class="details"><span class="text">Form 4 Results Published</span><span class="time">10 mins ago</span></div></div>
                  <div class="activity-item"><div class="dot orange"></div><div class="details"><span class="text">Fee Payment: Amani Juma</span><span class="time">1 hour ago</span></div></div>
                  <div class="activity-item"><div class="dot blue"></div><div class="details"><span class="text">Term 2 Syllabus Updated</span><span class="time">2 hours ago</span></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 5. FEATURES -->
  <section id="features" class="section features-section">
    <div class="container text-center">
      <span class="section-label">FEATURES</span>
      <h2>Everything your school needs to run smoothly</h2>
      
      <div class="spacious-grid">
        <div class="feature-item">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg></div>
          <h4>Students</h4>
          <p>Complete bio profiles, family links, academic pathways, and documentation.</p>
        </div>
        <div class="feature-item">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
          <h4>Academics</h4>
          <p>Gradebooks, standardized reporting, examinations planning, and timetables.</p>
        </div>
        <div class="feature-item">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="17 11 19 13 23 9"></polyline><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle></svg></div>
          <h4>Attendance</h4>
          <p>Fast morning roll calls, modern scan logs, and automated absence alerts.</p>
        </div>
        <div class="feature-item">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg></div>
          <h4>Finance</h4>
          <p>Automated billing templates, outstanding invoice reminders, and payments.</p>
        </div>
        <div class="feature-item">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
          <h4>Communication</h4>
          <p>Direct portal, push updates, automated SMS alerts, and seamless integration.</p>
        </div>
        <div class="feature-item">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
          <h4>Reports</h4>
          <p>Intuitive charts mapping metrics from enrollment to cash collection.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 6. CONNECTION -->
  <section id="connection" class="section connection-section bg-gray">
    <div class="container text-center">
      <span class="section-label">CONNECTION</span>
      <h2>Keep teachers, parents and school connected</h2>
      <p class="section-subtitle mx-auto">A seamless flow of information ensures everyone is aligned and engaged in the student's journey.</p>
      
      <div class="connection-flow">
        <div class="flow-node">
          <div class="node-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg></div>
          <h4>School</h4>
        </div>
        <div class="flow-line"><div class="line-pulse"></div></div>
        <div class="flow-node">
          <div class="node-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path></svg></div>
          <h4>Teachers</h4>
        </div>
        <div class="flow-line"><div class="line-pulse"></div></div>
        <div class="flow-node">
          <div class="node-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg></div>
          <h4>Parents</h4>
        </div>
      </div>
    </div>
  </section>

  <!-- 7. ANALYTICS -->
  <section id="analytics" class="section analytics-section">
    <div class="container text-center">
      <span class="section-label">ANALYTICS</span>
      <h2>Make better decisions with your data</h2>
      <p class="section-subtitle mx-auto">Turn raw data into actionable insights with powerful, easy-to-read dashboards.</p>
      
      <div class="analytics-visual">
        <div class="mockup-chart-large">
          <div class="chart-y-axis">
            <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
          </div>
          <div class="chart-bars">
            <div class="chart-col"><div class="bar bar-blue" style="height: 60%"></div><span class="label">Term 1</span></div>
            <div class="chart-col"><div class="bar bar-orange" style="height: 85%"></div><span class="label">Term 2</span></div>
            <div class="chart-col"><div class="bar bar-blue" style="height: 70%"></div><span class="label">Term 3</span></div>
            <div class="chart-col"><div class="bar bar-orange" style="height: 95%"></div><span class="label">Term 4</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 8. CTA -->
  <section class="section cta-section">
    <div class="container text-center">
      <h2>Ready to bring your school together?</h2>
      <p>Get started today and see how EduSync can transform your educational community.</p>
      <div class="cta-actions">
        <button class="btn btn-primary btn-lg" (click)="bypassAuth()">Get Started</button>
        <button class="btn btn-outline-white btn-lg">Request Demo</button>
      </div>
    </div>
  </section>

  <!-- 9. FOOTER -->
  <footer class="footer">
    <div class="container footer-container">
      <div class="footer-logo">
        <div class="logo-icon"></div>
        <span class="logo-text">EduSync</span>
      </div>
      <div class="footer-links">
        <a href="#what">What is it?</a>
        <a href="#features">Features</a>
        <a href="#connection">Connection</a>
        <a href="#analytics">Analytics</a>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>&copy; 2026 EduSync. All rights reserved.</p>
    </div>
  </footer>
</div>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(new_html)

print("HTML rewritten successfully.")

