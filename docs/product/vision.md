# SyncAcademy — Product Vision

## 1. Executive Summary

**SyncAcademy** is a multi-tenant education management SaaS platform built initially for Tanzanian primary and secondary schools. Its long-term vision is to provide **one connected education ecosystem** uniting school administrators, headmasters, registrars, bursars, class teachers, subject teachers, students, and families.

Many primary and secondary schools in Tanzania still rely on disconnected spreadsheets, paper ledgers, manual NECTA grading sheets, and ad-hoc WhatsApp groups to manage admissions, academic marks, fee collection, and parent reporting. SyncAcademy replaces these fragmented workflows with an integrated, auditable, low-bandwidth-friendly web platform tailored to Tanzanian educational standards.

---

## 2. Core Problem Statement

1. **Fragmented School Operations**: Admissions (Registrar), academics (Academic Master / Teachers), finance (Bursar), and executive oversight (Headmaster) operate in silos, causing data duplication and reconciliation delays at the end of every term.
2. **Error-Prone Examination & Grading Workflows**: Manual calculation of subject averages, divisions, positions, and NECTA-style grades leads to transcription errors, delayed report cards, and lack of approval auditability.
3. **Opaque Parent Communication**: Guardians often receive delayed or incomplete paper report cards and lack reliable, verifiable channels (SMS, WhatsApp, Email, and secure digital links) to track their children's academic progress, attendance, and fee balances.
4. **Multi-Child, Multi-School Friction for Families**: Parents with children attending both a primary school and a secondary school on the platform need a unified guardian identity rather than disconnected school-specific credentials.

---

## 3. Strategic Pillars

### Pillar 1: Institutional Operational Excellence
Provide role-specific workspaces for every school officer—Super Admin, School Admin, Headmaster, Academic Master, Registrar, Bursar, Class Teacher, and Subject Teacher—connected by real-time state synchronization and immutable audit logs.

### Pillar 2: Tanzanian Academic Alignment
Support Tanzanian primary and secondary school structures out of the box:
- Academic years and multi-term calendars (`Term 1`, `Term 2`, mid-term assessments, terminal and annual exams).
- Configurable grading scales supporting NECTA divisions, grade points, and score ranges (`A`, `B`, `C`, `D`, `E`, `F`).
- Multi-stage marks entry and approval workflows (`DRAFT` -> `SUBMITTED` -> `ACADEMIC_APPROVED` -> `HEADMASTER_APPROVED` -> `PUBLISHED`).

### Pillar 3: Multi-Channel Guardian Connectivity
Meet Tanzanian parents on the channels they actually use:
- **SMS** for universal reach across feature phones and low-connectivity regions.
- **WhatsApp** and **Email** for rich notifications and interactive updates.
- **Secure, Expiring Report-Access Links** enabling guardians to view and download official term report cards without requiring complex portal onboarding, while laying the foundation for a unified cross-school parent portal.

### Pillar 4: Low-Cost, High-Trust Cloud Architecture
Deliver enterprise-grade multi-tenant isolation, cryptographic session security, and reliable background message delivery on a lean, cost-conscious infrastructure footprint (Cloudflare Pages + R2, containerized NestJS API/Worker, and managed PostgreSQL).
