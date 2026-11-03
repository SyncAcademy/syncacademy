-- AlterTable
ALTER TABLE "School"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "logoStorageKey" TEXT,
  ADD COLUMN "publishedTheme" JSONB,
  ADD COLUMN "draftTheme" JSONB,
  ADD COLUMN "previousPublishedTheme" JSONB,
  ADD COLUMN "themeVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- AddCheckConstraints
ALTER TABLE "School"
  ADD CONSTRAINT "School_slug_format_check"
  CHECK (
    "slug" IS NULL OR (
      char_length("slug") BETWEEN 3 AND 50
      AND "slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  ),
  ADD CONSTRAINT "School_slug_reserved_check"
  CHECK (
    "slug" IS NULL OR "slug" NOT IN (
      'academic',
      'academic-setup',
      'accept-invitation',
      'admin',
      'api',
      'app',
      'assets',
      'audit',
      'audit-logs',
      'auth',
      'bursar',
      'class-teacher',
      'contact',
      'demo-requests',
      'faq',
      'head',
      'head-oversight',
      'headmaster',
      'health',
      'help',
      'invitation',
      'invitations',
      'login',
      'logout',
      'mail',
      'media',
      'parent',
      'parents',
      'platform',
      'platform-access',
      'portal',
      'privacy',
      'public',
      'r',
      'realtime',
      'recover',
      'register',
      'registrar',
      'request-demo',
      'reset',
      'reset-password',
      'root',
      's',
      'school-admin',
      'school-setup',
      'schools',
      'security',
      'socket-io',
      'static',
      'status',
      'student',
      'students',
      'super-admin',
      'support',
      'syncacademy',
      'system',
      'system-health',
      'teacher',
      'teachers',
      'teaching-responsibilities',
      'terms',
      'webhook',
      'webhooks',
      'workspace',
      'www'
    )
  ),
  ADD CONSTRAINT "School_logoStorageKey_format_check"
  CHECK (
    "logoStorageKey" IS NULL OR "logoStorageKey" ~ '^school-logos/[0-9a-f-]{36}/[0-9a-f-]{36}\.png$'
  ),
  ADD CONSTRAINT "School_publishedTheme_object_check"
  CHECK (
    "publishedTheme" IS NULL OR jsonb_typeof("publishedTheme") = 'object'
  ),
  ADD CONSTRAINT "School_draftTheme_object_check"
  CHECK (
    "draftTheme" IS NULL OR jsonb_typeof("draftTheme") = 'object'
  ),
  ADD CONSTRAINT "School_previousPublishedTheme_object_check"
  CHECK (
    "previousPublishedTheme" IS NULL OR jsonb_typeof("previousPublishedTheme") = 'object'
  ),
  ADD CONSTRAINT "School_themeVersion_nonnegative_check"
  CHECK (
    "themeVersion" >= 0
  );
