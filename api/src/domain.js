export const ZONES = ['Banani','Gulshan 1','Mohakhali','Dhanmondi','Mirpur','Uttara','Farmgate','Bashundhara'];
const points = {
  Banani: [23.7937,90.4066], 'Gulshan 1': [23.7808,90.4169], Mohakhali: [23.7788,90.3987],
  Dhanmondi: [23.7461,90.3742], Mirpur: [23.8069,90.3687], Uttara: [23.8759,90.3795],
  Farmgate: [23.7586,90.3895], Bashundhara: [23.8195,90.4520]
};

export function distanceKm(from, to) {
  if (!ZONES.includes(from) || !ZONES.includes(to) || from === to) throw new Error('Invalid route');
  if (from === 'Banani' && to === 'Mohakhali') return 4;
  if (from === 'Banani' && to === 'Gulshan 1') return 3;
  const [a,b] = points[from], [c,d] = points[to];
  const lat = (c-a)*Math.PI/180, lon = (d-b)*Math.PI/180;
  const h = Math.sin(lat/2)**2 + Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(lon/2)**2;
  return Math.max(1, Math.round(6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))*1.35));
}

export function routeGroup(pickup, destination) {
  if (pickup === 'Banani' && ['Mohakhali','Gulshan 1'].includes(destination)) return 'BANANI_EAST';
  return `DIRECT:${pickup}:${destination}`;
}

export function compatible(a, b) {
  return a.pickup_zone === b.pickup_zone && routeGroup(a.pickup_zone,a.destination_zone) === routeGroup(b.pickup_zone,b.destination_zone);
}

// Integer paisa throughout. Every booked seat gets the same transparent per-seat fare.
export function quoteFare(pickup, destination, seats = 1) {
  const km = distanceKm(pickup,destination);
  const base = 5000, distanceCharge = km * 1500;
  const discount = distanceCharge * 20 / 100;
  return {
    distanceKm: km,
    basePaisa: base,
    distancePaisa: distanceCharge,
    poolDiscountPaisa: discount,
    farePaisa: (base + distanceCharge - discount) * seats,
    seats,
  };
}

export const nextPoolStatus = Object.freeze({
  MATCHED: 'DRIVER_ARRIVED',
  DRIVER_ARRIVED: 'STARTED',
  STARTED: 'COMPLETED',
});
