import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
if (existsSync(".env"))
  throw new Error(".env already exists; refusing to replace secrets.");
const secret = (n) => randomBytes(n).toString("hex");
const dbPassword = secret(24);
writeFileSync(
  ".env",
  `NODE_ENV=development\nAPP_ORIGIN=http://localhost:8080\nPOSTGRES_PASSWORD=${dbPassword}\nRUNTIME_DB_PASSWORD=${secret(24)}\nDATABASE_URL=postgresql://syncacademy:${dbPassword}@localhost:55432/syncacademy?connection_limit=10\nSESSION_SECRET=${secret(48)}\nDATA_ENCRYPTION_KEY=${secret(32)}\nSMTP_HOST=smtp.gmail.com\nDOCKER_SMTP_HOST=smtp.gmail.com\nSMTP_PORT=465\nSMTP_SECURE=true\nSMTP_USER=stanlymbilinyi@gmail.com\nSMTP_PASSWORD=\nMAIL_FROM=stanlymbilinyi@gmail.com\nTRUST_PROXY_HOPS=0\n`,
  { mode: 0o600, flag: "wx" },
);
mkdirSync(".runtime", { recursive: true, mode: 0o700 });
console.log("Local secrets generated. Do not commit .env or .runtime.");
