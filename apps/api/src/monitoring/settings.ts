import { z } from 'zod';
export const settingsSchema = z.object({ cpuWarning: z.number().min(1).max(100), cpuCritical: z.number().min(1).max(100), memoryWarning: z.number().min(1).max(100), memoryCritical: z.number().min(1).max(100), diskWarning: z.number().min(1).max(100), diskCritical: z.number().min(1).max(100), latencyWarning: z.number().min(10).max(30000), latencyCritical: z.number().min(10).max(120000), errorWarning: z.number().min(.1).max(100), errorCritical: z.number().min(.1).max(100), consecutive: z.number().int().min(2).max(10), refreshSeconds: z.number().int().min(30).max(300), retentionDays: z.number().int().min(1).max(31) }).strict().refine(s => s.cpuWarning < s.cpuCritical && s.memoryWarning < s.memoryCritical && s.diskWarning < s.diskCritical && s.latencyWarning < s.latencyCritical && s.errorWarning < s.errorCritical, 'Critical thresholds must exceed warning thresholds.');
export type Settings = z.infer<typeof settingsSchema>;
export const defaults: Settings = { cpuWarning: 80, cpuCritical: 95, memoryWarning: 80, memoryCritical: 95, diskWarning: 80, diskCritical: 95, latencyWarning: 500, latencyCritical: 2000, errorWarning: 2, errorCritical: 5, consecutive: 3, refreshSeconds: 30, retentionDays: 31 };
export const ranges: Record<string, number> = { '15m': 900, '1h': 3600, '6h': 21600, '24h': 86400, '7d': 604800, '30d': 2592000 };
export function severity(value: number | null, warning: number, critical: number) { return value === null ? 'unknown' : value >= critical ? 'critical' : value >= warning ? 'warning' : 'healthy'; }
export function overall(states: string[]) { if (!states.length || states.every(s => s === 'unknown'))
    return 'Unknown'; if (states[0] === 'critical' && states[1] === 'critical')
    return 'Major Outage'; if (states.includes('critical'))
    return 'Partial Outage'; if (states.includes('warning'))
    return 'Degraded Performance'; if (states.includes('unknown'))
    return 'Unknown'; return 'Operational'; }
