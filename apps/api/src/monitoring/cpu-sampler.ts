/** Process CPU relative to one core. Never compare startup micro-windows with 30s averages. */
export class CpuSampler {
    private previous?: { user: number; system: number; at: number };
    constructor(private readonly usage = () => process.cpuUsage(), private readonly clock = () => performance.now()) {}
    sample() {
        const usage = this.usage(), at = this.clock(), previous = this.previous;
        if (!previous) { this.previous = { ...usage, at }; return { percent: null, seconds: 0 }; }
        const elapsed = at - previous.at;
        if (elapsed < 25000) return { percent: null, seconds: 0 };
        this.previous = { ...usage, at };
        return { percent: ((usage.user - previous.user) + (usage.system - previous.system)) / (elapsed * 10), seconds: elapsed / 1000 };
    }
}
