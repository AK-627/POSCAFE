/**
 * Simple circuit breaker for external service calls (email, payment gateway, etc.)
 *
 * States: CLOSED (normal) → OPEN (failing, reject fast) → HALF_OPEN (probe)
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold?: number;   // failures before opening (default 5)
  recoveryTimeMs?: number;     // ms to wait before probing (default 30s)
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailureAt: number | null = null;
  private readonly failureThreshold: number;
  private readonly recoveryTimeMs: number;
  readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.recoveryTimeMs   = options.recoveryTimeMs   ?? 30_000;
    this.name             = options.name             ?? 'unnamed';
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - (this.lastFailureAt ?? 0);
      if (elapsed >= this.recoveryTimeMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`CircuitBreaker[${this.name}] is OPEN — rejecting request`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureAt = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): CircuitState { return this.state; }
  getFailures(): number    { return this.failures; }
}

// Singleton breakers for external services
export const paymentGatewayBreaker = new CircuitBreaker({ name: 'payment-gateway', failureThreshold: 3, recoveryTimeMs: 60_000 });
export const emailServiceBreaker   = new CircuitBreaker({ name: 'email-service',   failureThreshold: 5, recoveryTimeMs: 30_000 });
export const smsServiceBreaker     = new CircuitBreaker({ name: 'sms-service',     failureThreshold: 5, recoveryTimeMs: 30_000 });
