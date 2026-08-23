// ============================================================================
// M-FTAMS Edge — Hardware Relay & Boom-Barrier Actuator Controller
// Simulates Modbus TCP / RTU and RPi.GPIO relay outputs with safety interlock
// ============================================================================

export type BarrierState = 'LOWERED' | 'RAISING' | 'OPEN' | 'LOWERING' | 'EMERGENCY_STOP' | 'HOLD_OPEN' | 'FAULT';

export interface BarrierStatus {
  barrier_id: string;
  state: BarrierState;
  relay_mode: 'MODBUS_TCP' | 'GPIO_RELAY';
  safety_loop_active: boolean;
  interlock_engaged: boolean;
  total_cycles: number;
  last_actuated_at: string;
  auto_close_timeout_sec: number;
}

export class HardwareRelayController {
  private barrierId: string = 'BARRIER-RELAY-04';
  private state: BarrierState = 'LOWERED';
  private relayMode: 'MODBUS_TCP' | 'GPIO_RELAY' = 'MODBUS_TCP';
  private safetyLoopActive: boolean = true;
  private interlockEngaged: boolean = true;
  private totalCycles: number = 0;
  private lastActuatedAt: string = new Date().toISOString();
  private autoCloseTimer: NodeJS.Timeout | null = null;
  private autoCloseTimeoutSec: number = 6;

  /**
   * Get live hardware barrier & relay actuator status.
   */
  public getStatus(): BarrierStatus {
    return {
      barrier_id: this.barrierId,
      state: this.state,
      relay_mode: this.relayMode,
      safety_loop_active: this.safetyLoopActive,
      interlock_engaged: this.interlockEngaged,
      total_cycles: this.totalCycles,
      last_actuated_at: this.lastActuatedAt,
      auto_close_timeout_sec: this.autoCloseTimeoutSec
    };
  }

  /**
   * Triggers hardware barrier release (RAISE signal).
   */
  public triggerRaise(reason: string = 'GATE_HANDSHAKE_RELEASE'): { success: boolean; state: BarrierState; message: string } {
    if (this.state === 'EMERGENCY_STOP') {
      return { success: false, state: this.state, message: 'Barrier locked in EMERGENCY_STOP. Manual reset required.' };
    }

    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }

    this.state = 'RAISING';
    this.totalCycles++;
    this.lastActuatedAt = new Date().toISOString();

    // Transition to OPEN after raising interval (e.g. 500ms in simulation)
    setTimeout(() => {
      if (this.state === 'RAISING') {
        this.state = 'OPEN';

        // Auto-close safety interlock after timeout
        this.autoCloseTimer = setTimeout(() => {
          this.triggerLower('AUTO_CLOSE_SAFETY_INTERLOCK');
        }, this.autoCloseTimeoutSec * 1000);
      }
    }, 500);

    return {
      success: true,
      state: 'RAISING',
      message: `Relay actuated: Boom barrier raising on ${this.barrierId} (${reason})`
    };
  }

  /**
   * Triggers hardware barrier closure (LOWER signal).
   */
  public triggerLower(reason: string = 'MANUAL_LOWER'): { success: boolean; state: BarrierState; message: string } {
    if (this.state === 'HOLD_OPEN') {
      return { success: false, state: this.state, message: 'Barrier is set to HOLD_OPEN. Release hold first.' };
    }

    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }

    this.state = 'LOWERING';
    this.lastActuatedAt = new Date().toISOString();

    setTimeout(() => {
      if (this.state === 'LOWERING') {
        this.state = 'LOWERED';
      }
    }, 500);

    return {
      success: true,
      state: 'LOWERING',
      message: `Relay actuated: Boom barrier lowering (${reason})`
    };
  }

  /**
   * Sentry Emergency Manual Commands.
   */
  public executeManualControl(action: 'RAISE' | 'LOWER' | 'HOLD_OPEN' | 'EMERGENCY_STOP' | 'RESET'): { success: boolean; state: BarrierState; message: string } {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }

    switch (action) {
      case 'RAISE':
        return this.triggerRaise('SENTRY_MANUAL_OVERRIDE');
      case 'LOWER':
        return this.triggerLower('SENTRY_MANUAL_COMMAND');
      case 'HOLD_OPEN':
        this.state = 'HOLD_OPEN';
        this.lastActuatedAt = new Date().toISOString();
        return { success: true, state: this.state, message: 'Barrier locked in HOLD_OPEN mode (Convoys / VIP Clearance)' };
      case 'EMERGENCY_STOP':
        this.state = 'EMERGENCY_STOP';
        this.lastActuatedAt = new Date().toISOString();
        return { success: true, state: this.state, message: 'EMERGENCY STOP ACTIVATED — Barrier locked immediately' };
      case 'RESET':
        this.state = 'LOWERED';
        this.lastActuatedAt = new Date().toISOString();
        return { success: true, state: this.state, message: 'Hardware relay reset to LOWERED default' };
    }
  }
}

export const barrierRelayController = new HardwareRelayController();
