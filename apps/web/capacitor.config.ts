import type { CapacitorConfig } from '@capacitor/cli';

const target = process.env.CAP_TARGET || 'parent';
const isTeacher = target === 'teacher';

const config: CapacitorConfig = {
  appId: isTeacher ? 'tz.co.syncacademy.teachers' : 'tz.co.syncacademy.parents',
  appName: isTeacher ? 'SyncAcademy Teachers' : 'SyncAcademy Parents',
  webDir: 'dist/syncacademy-web/browser',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
