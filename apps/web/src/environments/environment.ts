export const environment = {
  production: false,
  apiUrl: typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()
    ? 'http://10.0.2.2:3101/api/v1'
    : '/api/v1',
};
