
import os

scss_path = r"src/app/features/landing/landing.page.scss"

with open(scss_path, "r", encoding="utf-8") as f:
    original_scss = f.read()

# We need to extract the ".dashboard-preview-section" block to keep it.
# It starts at "/* 4. System Overview" and probably ends before "/* 5. Functional Modules".

start_str = "/* 4. System Overview"
end_str = "/* 5. Functional Modules"

start_idx = original_scss.find(start_str)
end_idx = original_scss.find(end_str)

dashboard_scss = original_scss[start_idx:end_idx] if start_idx != -1 and end_idx != -1 else ""

new_scss = f"""
:host {{
  display: block;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #334155;
  --sa-primary: #E87E24;
  --sa-primary-hover: #d6701c;
  --sa-dark: #0f172a;
  --sa-dark-lighter: #1e293b;
  --sa-gray-light: #f8fafc;
  --sa-gray: #cbd5e1;
}}

.landing-page {{
  /* wrapper */
}}

.container {{
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}}
.text-center {{ text-align: center; }}
.mx-auto {{ margin-left: auto; margin-right: auto; }}
.bg-gray {{ background-color: var(--sa-gray-light); }}

/* Utilities */
.btn {{
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  
  &.btn-primary {{
    background-color: var(--sa-primary);
    color: white;
    &:hover {{ background-color: var(--sa-primary-hover); }}
  }}
  
  &.btn-outline {{
    background-color: transparent;
    border: 2px solid var(--sa-gray);
    color: var(--sa-dark);
    &:hover {{ border-color: var(--sa-dark); }}
  }}

  &.btn-outline-white {{
    background-color: transparent;
    border: 2px solid rgba(255, 255, 255, 0.8);
    color: white;
    &:hover {{ background-color: white; color: var(--sa-primary); }}
  }}
  
  &.btn-ghost {{
    background-color: transparent;
    color: var(--sa-dark);
    &:hover {{ background-color: var(--sa-gray-light); }}
  }}
  
  &.btn-lg {{
    padding: 0.75rem 1.75rem;
    font-size: 1rem;
    border-radius: 0.5rem;
  }}
}}

.section {{
  padding: 6rem 0;
  
  h2 {{
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    color: var(--sa-dark-lighter);
  }}
  
  .section-label {{
    display: inline-block;
    color: var(--sa-primary);
    font-weight: 700;
    font-size: 0.875rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 1rem;
  }}
  
  .section-subtitle {{
    font-size: 1.25rem;
    color: #64748b;
    max-width: 700px;
    line-height: 1.6;
    margin-bottom: 4rem;
  }}
}}

/* 1. Navbar */
.navbar {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 2rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 100;
  
  .logo {{
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    .logo-icon {{
      width: 32px;
      height: 32px;
      background: var(--sa-primary);
      border-radius: 8px;
    }}
    
    .logo-text {{
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--sa-dark);
    }}
  }}
  
  .nav-links {{
    display: flex;
    gap: 2.5rem;
    
    a {{
      color: #64748b;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
      transition: color 0.2s;
      
      &:hover {{
        color: var(--sa-primary);
      }}
    }}
  }}
  
  .nav-actions {{
    display: flex;
    gap: 1rem;
    align-items: center;
  }}
  
  @media (max-width: 768px) {{
    .desktop-only {{ display: none; }}
  }}
}}

/* 2. Hero */
.hero {{
  padding: 8rem 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  text-align: center;
  
  .hero-content {{
    max-width: 800px;
    margin: 0 auto;
    
    .hero-badge {{
      display: inline-block;
      padding: 0.5rem 1rem;
      background: rgba(232, 126, 36, 0.1);
      color: var(--sa-primary);
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }}
    
    h1 {{
      font-size: 3.5rem;
      font-weight: 900;
      color: var(--sa-dark);
      margin-bottom: 1.5rem;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }}
    
    p {{
      font-size: 1.25rem;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 2.5rem;
      max-width: 650px;
      margin-left: auto;
      margin-right: auto;
    }}
    
    .hero-actions {{
      display: flex;
      gap: 1rem;
      justify-content: center;
      
      @media (max-width: 576px) {{
        flex-direction: column;
      }}
    }}
  }}
}}

/* 3. What is EduSync */
.what-is-edusync {{
  .pillars-container {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3rem;
    margin-top: 2rem;
    
    .pillar {{
      padding: 2rem;
      
      .pillar-icon {{
        width: 64px;
        height: 64px;
        background: #fff3e0;
        border-radius: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem auto;
        
        svg {{
          width: 32px;
          height: 32px;
          stroke: var(--sa-primary);
        }}
      }}
      
      h3 {{
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--sa-dark-lighter);
        margin-bottom: 1rem;
      }}
      
      p {{
        color: #64748b;
        line-height: 1.6;
      }}
    }}
    
    @media (max-width: 992px) {{
      grid-template-columns: 1fr;
      gap: 2rem;
    }}
  }}
}}

{dashboard_scss}

/* 5. Features Section */
.features-section {{
  .spacious-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4rem 3rem;
    margin-top: 3rem;
    
    .feature-item {{
      text-align: left;
      
      .icon {{
        width: 48px;
        height: 48px;
        background: #f1f5f9;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1.25rem;
        
        svg {{
          width: 24px;
          height: 24px;
          stroke: var(--sa-primary);
        }}
      }}
      
      h4 {{
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--sa-dark-lighter);
        margin-bottom: 0.75rem;
      }}
      
      p {{
        color: #64748b;
        line-height: 1.6;
        font-size: 1rem;
      }}
    }}
    
    @media (max-width: 992px) {{
      grid-template-columns: repeat(2, 1fr);
    }}
    
    @media (max-width: 576px) {{
      grid-template-columns: 1fr;
    }}
  }}
}}

/* 6. Connection Section */
.connection-section {{
  .connection-flow {{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 4rem;
    
    .flow-node {{
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 2rem 3rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      z-index: 2;
      
      .node-icon {{
        width: 64px;
        height: 64px;
        margin: 0 auto 1rem auto;
        
        svg {{
          width: 100%;
          height: 100%;
          stroke: var(--sa-primary);
        }}
      }}
      
      h4 {{
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
        color: var(--sa-dark);
      }}
    }}
    
    .flow-line {{
      height: 4px;
      width: 100px;
      background: #e2e8f0;
      position: relative;
      border-radius: 2px;
      overflow: hidden;
      
      .line-pulse {{
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 50%;
        background: var(--sa-primary);
        animation: flow 2s infinite linear;
      }}
    }}
    
    @keyframes flow {{
      0% {{ transform: translateX(-100%); }}
      100% {{ transform: translateX(200%); }}
    }}
    
    @media (max-width: 992px) {{
      flex-direction: column;
      
      .flow-line {{
        width: 4px;
        height: 60px;
        
        .line-pulse {{
          width: 100%;
          height: 50%;
          animation: flow-y 2s infinite linear;
        }}
      }}
      
      @keyframes flow-y {{
        0% {{ transform: translateY(-100%); }}
        100% {{ transform: translateY(200%); }}
      }}
    }}
  }}
}}

/* 7. Analytics Section */
.analytics-section {{
  .analytics-visual {{
    margin-top: 3rem;
    display: flex;
    justify-content: center;
    
    .mockup-chart-large {{
      width: 100%;
      max-width: 800px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 3rem 2rem 2rem 4rem;
      box-shadow: 0 10px 40px rgba(0,0,0,0.08);
      position: relative;
      height: 400px;
      
      .chart-y-axis {{
        position: absolute;
        left: 1rem;
        top: 3rem;
        bottom: 2rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        color: #94a3b8;
        font-size: 0.75rem;
        font-weight: 600;
      }}
      
      .chart-bars {{
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        height: 100%;
        border-bottom: 2px solid #f1f5f9;
        
        .chart-col {{
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          justify-content: flex-end;
          gap: 1rem;
          width: 80px;
          
          .bar {{
            width: 100%;
            border-radius: 0.5rem 0.5rem 0 0;
            transition: height 1s ease-out;
            
            &.bar-blue {{ background: #3b82f6; }}
            &.bar-orange {{ background: var(--sa-primary); }}
            
            &:hover {{
              opacity: 0.9;
            }}
          }}
          
          .label {{
            color: #64748b;
            font-size: 0.875rem;
            font-weight: 600;
          }}
        }}
      }}
    }}
  }}
}}

/* 8. CTA Section */
.cta-section {{
  background: var(--sa-primary);
  color: white;
  padding: 6rem 0;
  
  h2 {{
    color: white;
    font-size: 3rem;
  }}
  
  p {{
    font-size: 1.25rem;
    opacity: 0.9;
    margin-bottom: 3rem;
  }}
  
  .cta-actions {{
    display: flex;
    gap: 1rem;
    justify-content: center;
  }}
}}

/* 9. Footer */
.footer {{
  background: var(--sa-dark);
  color: white;
  padding: 4rem 0 2rem 0;
  
  .footer-container {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 2rem;
    margin-bottom: 2rem;
    
    @media (max-width: 576px) {{
      flex-direction: column;
      gap: 2rem;
    }}
  }}
  
  .footer-logo {{
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    .logo-icon {{
      width: 24px;
      height: 24px;
      background: var(--sa-primary);
      border-radius: 6px;
    }}
    
    .logo-text {{
      font-size: 1.25rem;
      font-weight: 800;
    }}
  }}
  
  .footer-links {{
    display: flex;
    gap: 2rem;
    
    a {{
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      font-size: 0.875rem;
      
      &:hover {{
        color: white;
      }}
    }}
  }}
  
  .footer-bottom {{
    text-align: center;
    color: rgba(255,255,255,0.5);
    font-size: 0.875rem;
  }}
}}
"""

with open(scss_path, "w", encoding="utf-8") as f:
    f.write(new_scss)

print("SCSS rewritten successfully.")

