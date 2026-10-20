import { HttpErrorResponse } from '@angular/common/http';

/** Keep transport/schema diagnostics out of user-facing sections. */
export function requestErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';
  if (error.status === 0) return 'Cannot reach the server. Check your connection and try again.';
  if (error.status >= 500) return 'The service is temporarily unavailable. Please try again.';
  const message = error.error?.message;
  if (typeof message !== 'string' || !message.trim()) return 'The request failed. Try again.';
  if (/unrecognized key|invalid_type|expected .+, received|invalid input|<[^>]+>|\b(?:prisma|zod)\b/i.test(message)) {
    return 'This request could not be processed. Reload the page and try again. If it continues, contact your school administrator.';
  }
  return message;
}
