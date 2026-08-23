// ============================================================================
// M-FTAMS — Fleet Common Operating Picture & Dashboard Reporting Router
// ============================================================================

import { Router, Response } from 'express';
import { db } from '../models/db';
import { authenticateJwt, AuthenticatedRequest } from '../auth/auth.middleware';

export const fleetRouter = Router();

// GET /fleet/status — Real-time vehicle status array
fleetRouter.get('/status', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const vehicles = Array.from(db.vehicles.values()).map(v => {
    // Find active trip if on sortie or reserved
    const activeTrip = Array.from(db.trips.values()).find(
      t => t.vehicle_id === v.vehicle_id && (t.status === 'ON_SORTIE' || t.status === 'DISPATCHED')
    );
    const driver = activeTrip ? db.drivers.get(activeTrip.driver_id) : null;
    const reqInfo = activeTrip ? db.requisitions.get(activeTrip.requisition_id) : null;

    return {
      vehicle_id: v.vehicle_id,
      registration_number: v.registration_number,
      vehicle_type: v.vehicle_type,
      status: v.status,
      current_odometer: v.current_odometer,
      rfid_tag_id: v.rfid_tag_id,
      active_driver: driver ? driver.full_name : null,
      active_destination: reqInfo ? reqInfo.destination : null,
      updated_at: v.updated_at
    };
  });

  return res.json(vehicles);
});

// GET /fleet/active-sorties — Trips currently ON_SORTIE with live ETA countdowns
fleetRouter.get('/active-sorties', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const activeSorties = Array.from(db.trips.values())
    .filter(t => t.status === 'ON_SORTIE' || t.status === 'DISPATCHED')
    .map(trip => {
      const vehicle = db.vehicles.get(trip.vehicle_id);
      const driver = db.drivers.get(trip.driver_id);
      const requisition = db.requisitions.get(trip.requisition_id);
      const token = db.tokens.get(trip.token_id);

      const nowMs = Date.now();
      const departureMs = new Date(trip.created_at).getTime();
      const elapsedMinutes = Math.max(0, Math.floor((nowMs - departureMs) / 60000));

      let etaMs = nowMs;
      let isOverdue = false;
      let remainingMinutes = 0;

      if (requisition) {
        etaMs = new Date(requisition.expected_return).getTime();
        remainingMinutes = Math.floor((etaMs - nowMs) / 60000);
        isOverdue = nowMs > etaMs;
      }

      return {
        trip_id: trip.trip_id,
        requisition_id: trip.requisition_id,
        status: trip.status,
        vehicle_id: trip.vehicle_id,
        registration_number: vehicle ? vehicle.registration_number : 'UNKNOWN',
        vehicle_type: vehicle ? vehicle.vehicle_type : 'UNKNOWN',
        driver_id: trip.driver_id,
        driver_name: driver ? driver.full_name : 'UNKNOWN',
        destination: requisition ? requisition.destination : 'UNKNOWN',
        purpose: requisition ? requisition.purpose : 'UNKNOWN',
        planned_distance_km: requisition ? requisition.planned_distance_km : 0,
        outbound_odometer: trip.outbound_odometer,
        departed_at: trip.created_at,
        expected_return: requisition ? requisition.expected_return : new Date().toISOString(),
        elapsed_minutes: elapsedMinutes,
        remaining_minutes: remainingMinutes,
        is_overdue: isOverdue,
        token_id: trip.token_id,
        token_valid_until: token ? token.valid_until : null
      };
    });

  return res.json(activeSorties);
});

// GET /fleet/stats — Overview counts for Commander & MTO Dashboard
fleetRouter.get('/stats', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const vehicles = Array.from(db.vehicles.values());
  const trips = Array.from(db.trips.values());
  const requisitions = Array.from(db.requisitions.values());
  const alerts = Array.from(db.alerts.values()).filter(a => a.acknowledged_at === null);

  const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const onSortieVehicles = vehicles.filter(v => v.status === 'ON_SORTIE').length;
  const reservedVehicles = vehicles.filter(v => v.status === 'RESERVED').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'MAINTENANCE').length;
  const pendingRequisitions = requisitions.filter(r => r.status === 'SUBMITTED').length;
  const overdueOrFlaggedTrips = trips.filter(t => t.status === 'COMPLETED_FLAGGED').length;

  return res.json({
    total_vehicles: vehicles.length,
    available_vehicles: availableVehicles,
    on_sortie_vehicles: onSortieVehicles,
    reserved_vehicles: reservedVehicles,
    maintenance_vehicles: maintenanceVehicles,
    pending_requisitions: pendingRequisitions,
    overdue_or_flagged_trips: overdueOrFlaggedTrips,
    unacknowledged_alerts: alerts.length
  });
});
