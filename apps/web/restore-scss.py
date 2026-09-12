
import os

scss_path = r"src/app/features/landing/landing.page.scss"

scss_content = """
:host {
  display: block;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #334155;
  --sa-primary: #E87E24;
  --sa-primary-hover: #d6701c;
  --sa-dark: #0f172a;
  --sa-dark-lighter: #1e293b;
  --sa-gray-light: #f8fafc;
  --sa-gray: #cbd5e1;
}

.landing-page {
  /* Common Utilities */
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  
  &.btn-primary {
    background-color: var(--sa-primary);
    color: white;
    &:hover { background-color: var(--sa-primary-hover); }
  }
  
  &.btn-outline {
    background-color: transparent;
    border: 2px solid var(--sa-gray);
    color: var(--sa-dark);
    &:hover { border-color: var(--sa-dark); }
  }

  &.btn-ghost {
    background-color: transparent;
    color: var(--sa-dark);
    &:hover { background-color: var(--sa-gray-light); }
  }
  
  &.btn-lg {
    padding: 0.75rem 1.75rem;
    font-size: 1rem;
    border-radius: 0.5rem;
  }
}

.section {
  padding: 6rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  
  h2 {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    color: var(--sa-dark-lighter);
  }
  
  .section-label {
    display: inline-block;
    color: var(--sa-primary);
    font-weight: 700;
    font-size: 0.875rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 1rem;
  }
  
  .section-subtitle {
    font-size: 1.25rem;
    color: #64748b;
    max-width: 700px;
    margin: 0 auto 4rem auto;
    line-height: 1.6;
  }
}

/* 1. Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 2rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 100;
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    .logo-icon {
      width: 32px;
      height: 32px;
      background: var(--sa-primary);
      border-radius: 8px;
    }
    
    .logo-text {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--sa-dark);
    }
  }
  
  .nav-links {
    display: flex;
    gap: 2.5rem;
    
    a {
      color: #64748b;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
      transition: color 0.2s;
      
      &:hover { color: var(--sa-primary); }
    }
  }
  
  .nav-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  @media (max-width: 768px) {
    .desktop-only { display: none; }
  }
}

/* 2. Hero */
.hero {
  padding: 8rem 2rem 4rem 2rem;
  text-align: center;
  
  .hero-content {
    max-width: 800px;
    margin: 0 auto 4rem auto;
    
    .hero-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: rgba(232, 126, 36, 0.1);
      color: var(--sa-primary);
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }
    
    h1 {
      font-size: 3.5rem;
      font-weight: 900;
      color: var(--sa-dark);
      margin-bottom: 1.5rem;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    
    p {
      font-size: 1.25rem;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 2.5rem;
      max-width: 650px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .hero-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-bottom: 1.5rem;
    }
    
    .hero-subtext {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-bottom: 0;
    }
  }
  
  .hero-visual {
    max-width: 1000px;
    margin: 0 auto;
    
    .glass-mockup {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 1rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      height: 400px;
      
      .mockup-header {
        background: #f1f5f9;
        padding: 0.75rem 1rem;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #e2e8f0;
        
        .dots {
          display: flex;
          gap: 0.5rem;
          
          .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            
            &.red { background: #ef4444; }
            &.yellow { background: #f59e0b; }
            &.green { background: #10b981; }
          }
        }
      }
      
      .mockup-body {
        display: flex;
        height: calc(100% - 40px);
        
        .mockup-sidebar {
          width: 200px;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
        }
        
        .mockup-main {
          flex: 1;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          
          .mockup-card {
            height: 100px;
            background: white;
            border-radius: 0.5rem;
            border: 1px solid #e2e8f0;
          }
          
          .mockup-row {
            display: flex;
            gap: 1.5rem;
            flex: 1;
            
            .mockup-chart {
              flex: 1;
              background: white;
              border-radius: 0.5rem;
              border: 1px solid #e2e8f0;
            }
          }
        }
      }
    }
  }
}

/* Common Grids */
.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  
  @media (max-width: 992px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 576px) { grid-template-columns: 1fr; }
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  
  @media (max-width: 992px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 768px) { grid-template-columns: 1fr; }
}

/* Card Styles */
.card {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  text-align: left;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  
  .icon-wrapper {
    width: 48px;
    height: 48px;
    background: #fff3e0;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
    
    .icon-svg {
      width: 24px;
      height: 24px;
      stroke: var(--sa-primary);
    }
  }
  
  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: var(--sa-dark);
  }
  
  p {
    color: #64748b;
    line-height: 1.6;
    font-size: 0.95rem;
  }
}

/* 4. Dashboard Mockup */
.dashboard-preview-section {
  background: #f8fafc;
  padding: 6rem 2rem;
  max-width: 100%;
}

.dashboard-mockup {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
  overflow: hidden;
  text-align: left;
  
  .mockup-window-header {
    background: #f1f5f9;
    padding: 1rem;
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    
    .dots {
      display: flex;
      gap: 0.5rem;
      .dot {
        width: 12px; height: 12px; border-radius: 50%;
        &.red { background: #ef4444; }
        &.yellow { background: #f59e0b; }
        &.green { background: #10b981; }
      }
    }
  }
  
  .mockup-content {
    display: flex;
    height: 500px;
    
    .mock-sidebar {
      width: 220px;
      background: #1e293b;
      color: white;
      padding: 1.5rem;
      
      .mock-logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 700;
        font-size: 1.1rem;
        margin-bottom: 2rem;
        
        .mock-logo-icon {
          width: 24px; height: 24px; background: var(--sa-primary); border-radius: 6px;
        }
      }
      
      .mock-nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        color: #94a3b8;
        
        svg { width: 18px; height: 18px; }
        
        &.active {
          background: rgba(255,255,255,0.1);
          color: white;
          svg { stroke: var(--sa-primary); }
        }
      }
    }
    
    .mock-main {
      flex: 1;
      background: #f8fafc;
      padding: 2rem;
      overflow-y: auto;
      
      .mock-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        
        .mock-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
        .mock-avatar { width: 36px; height: 36px; background: #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #475569; }
      }
      
      .mock-stats-row {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 2rem;
        
        .mock-stat-card {
          flex: 1;
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          
          .stat-title { font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem; }
          .stat-value { 
            font-size: 1.5rem; font-weight: 700; color: #0f172a; display: flex; align-items: baseline; gap: 0.5rem;
            .trend { font-size: 0.75rem; font-weight: 600; color: #10b981; background: #d1fae5; padding: 0.1rem 0.4rem; border-radius: 1rem; }
          }
        }
      }
      
      .mock-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
        
        .mock-chart, .mock-activity {
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          
          .chart-header, .activity-header {
            font-weight: 600; margin-bottom: 1.5rem; color: #0f172a;
          }
        }
        
        .chart-body {
          display: flex; align-items: flex-end; justify-content: space-between; height: 150px; padding-top: 1rem;
          .bar { width: 12%; background: var(--sa-primary); border-radius: 4px 4px 0 0; }
        }
        
        .activity-list {
          display: flex; flex-direction: column; gap: 1rem;
          .activity-item {
            display: flex; gap: 1rem; align-items: flex-start;
            .dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; }
            .dot.green { background: #10b981; }
            .dot.orange { background: var(--sa-primary); }
            .dot.blue { background: #3b82f6; }
            .details {
              display: flex; flex-direction: column;
              .text { font-size: 0.875rem; font-weight: 500; color: #334155; }
              .time { font-size: 0.75rem; color: #94a3b8; }
            }
          }
        }
      }
    }
  }
}

/* 6. Feature Blocks */
.feature-blocks {
  padding: 6rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  
  .feature-block {
    display: flex;
    align-items: center;
    gap: 4rem;
    margin-bottom: 8rem;
    
    &:last-child { margin-bottom: 0; }
    
    &.reverse { flex-direction: row-reverse; }
    
    .feature-text {
      flex: 1;
      text-align: left;
      
      .section-label {
        display: inline-block;
        color: var(--sa-primary);
        font-weight: 700;
        font-size: 0.875rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-bottom: 1rem;
      }
      
      h2 {
        font-size: 2.25rem;
        font-weight: 800;
        margin-bottom: 1.5rem;
        color: #1e293b;
      }
      
      p {
        font-size: 1.125rem;
        color: #64748b;
        line-height: 1.6;
        margin-bottom: 2rem;
      }
      
      .feature-list {
        list-style: none;
        padding: 0;
        margin: 0;
        
        li {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.25rem;
          font-size: 1.05rem;
          color: #334155;
          line-height: 1.5;
          
          .check-icon {
            width: 24px;
            height: 24px;
            stroke: #10b981;
            flex-shrink: 0;
            margin-top: 2px;
          }
        }
      }
    }
    
    .feature-visual {
      flex: 1;
      display: flex;
      justify-content: center;
      
      /* Profile Card Mockup */
      .mockup-profile-card {
        width: 100%;
        max-width: 480px;
        background: white;
        border-radius: 1rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
        padding: 2rem;
        
        .mockup-profile-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;
          .title { font-weight: 800; color: #1e293b; font-size: 1.1rem; }
          .active-badge { background: #d1fae5; color: #059669; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; }
        }
        
        .mockup-profile-user {
          display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #f1f5f9;
          .avatar { width: 80px; height: 80px; border-radius: 50%; overflow: hidden; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); img { width: 100%; height: 100%; object-fit: cover; } }
          .user-info { display: flex; flex-direction: column; gap: 0.25rem; strong { color: #1e293b; font-size: 1.1rem; } span { color: #94a3b8; font-size: 0.75rem; } }
        }
        
        .mockup-profile-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;
          .grid-item {
            display: flex; flex-direction: column; gap: 0.35rem;
            .label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { font-size: 0.85rem; font-weight: 600; color: #1e293b; }
            .text-green { color: #10b981; }
            .text-orange { color: var(--sa-primary); }
          }
        }
      }
      
      /* Table Card Mockup */
      .mockup-table-card {
        width: 100%;
        max-width: 580px;
        background: white;
        border-radius: 1rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
        padding: 1.5rem;
        
        .mockup-table-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;
          .title { font-weight: 800; color: #1e293b; font-size: 1rem; }
          .term-badge { background: #ffedd5; color: #ea580c; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; }
        }
        
        .mockup-table-body {
          .table-row {
            display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 1rem; border-bottom: 1px solid #f1f5f9;
            &:last-child { border-bottom: none; }
            &.table-head { background: #f8fafc; color: #64748b; font-size: 0.75rem; font-weight: 600; border-bottom: 1px solid #e2e8f0; border-radius: 0.25rem; }
            .col-name { flex: 2; font-size: 0.85rem; color: #475569; }
            .col-num { flex: 1; text-align: right; font-size: 0.85rem; color: #64748b; &.font-bold { font-weight: 800; color: #1e293b; } }
            .col-grade { flex: 0.8; text-align: right; font-size: 0.85rem; font-weight: 800; color: #475569; &.text-green { color: #10b981; } &.text-red { color: #ef4444; } }
          }
        }
      }
    }
    
    @media (max-width: 992px) {
      flex-direction: column !important; gap: 3rem;
      .feature-visual { width: 100%; }
    }
  }
}

/* 7. Security & Roles */
.security-roles {
  background: var(--sa-gray-light);
  max-width: 100%;
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .security-grid {
    margin-top: 4rem;
    
    .security-card {
      text-align: left;
      padding: 2.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      border: 1px solid rgba(0,0,0,0.05);
      
      .icon-wrapper {
        width: 48px;
        height: 48px;
        background: #fff3e0;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1.5rem;
        
        svg {
          width: 24px;
          height: 24px;
          stroke: var(--sa-primary);
        }
      }
      
      h3 {
        font-size: 1.25rem;
        font-weight: 800;
        margin-bottom: 1rem;
        color: var(--sa-dark-lighter);
      }
      
      p {
        font-size: 0.95rem;
        color: #64748b;
        line-height: 1.7;
      }
    }
  }
}

/* 8. Footer */
.footer {
  background: white;
  border-top: 1px solid #e2e8f0;
  padding: 4rem 2rem 2rem 2rem;
  
  .footer-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 2rem;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 2rem;
    
    @media (max-width: 576px) {
      flex-direction: column;
      gap: 2rem;
    }
  }
  
  .footer-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    .logo-icon {
      width: 24px; height: 24px; background: var(--sa-primary); border-radius: 6px;
    }
    
    .logo-text {
      font-size: 1.25rem; font-weight: 800; color: var(--sa-dark);
    }
  }
  
  .footer-links {
    display: flex; gap: 2rem;
    
    a {
      color: #64748b; text-decoration: none; font-size: 0.875rem; font-weight: 600;
      &:hover { color: var(--sa-primary); }
    }
  }
  
  .footer-bottom {
    max-width: 1200px; margin: 0 auto; text-align: center; color: #94a3b8; font-size: 0.875rem;
  }
}
"""

with open(scss_path, "w", encoding="utf-8") as f:
    f.write(scss_content)

print("Restored SCSS successfully.")

