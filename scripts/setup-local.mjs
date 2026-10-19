import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
if (existsSync(".env"))
  throw new Error(".env already exists; refusing to replace secrets.");
const secret = (n) => randomBytes(n).toString("hex");
const dbPassword = secret(24);
writeFileSync(
  ".env",
  `NODE_ENV=development
APP_ORIGIN=http://localhost:8080
WEB_PORT=8080
POSTGRES_PASSWORD=${dbPassword}
RUNTIME_DB_PASSWORD=${secret(24)}
DATABASE_URL=postgresql://syncacademy:${dbPassword}@localhost:55432/syncacademy?connection_limit=10
SESSION_SECRET=${secret(48)}
DATA_ENCRYPTION_KEY=${secret(32)}
SMTP_HOST=smtp.gmail.com
DOCKER_SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=noreply@syncacademy.local
CONTACT_NOTIFICATION_EMAIL=support@syncacademy.local
TRUST_PROXY_HOPS=0

# NextSMS Telecom Gateway (Tanzania SMS & WhatsApp)
NEXTSMS_API_URL=https://messaging-service.co.tz
NEXTSMS_TOKEN=
NEXTSMS_SENDER_ID=SYNCACADEMY
NEXTSMS_WHATSAPP_ACCOUNT=SYNCACADEMY
NEXTSMS_WEBHOOK_VERIFY_TOKEN=${secret(24)}
COMMUNICATION_MOCK_DISPATCH=false

# Realtime transport
REALTIME_TRANSPORT=local
`,
  { mode: 0o600, flag: "wx" },
);
mkdirSync(".runtime", { recursive: true, mode: 0o700 });
console.log("Local secrets generated. Do not commit .env or .runtime.");
