import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteFare, compatible, routeGroup, nextPoolStatus } from '../src/domain.js';

test('Banani fares can be checked by hand in integer paisa', () => {
  assert.deepEqual(quoteFare('Banani','Mohakhali'), {
    distanceKm:4, basePaisa:5000, distancePaisa:6000, poolDiscountPaisa:1200, farePaisa:9800, seats:1
  });
  assert.equal(quoteFare('Banani','Gulshan 1').farePaisa,8600);
  assert.equal(quoteFare('Banani','Mohakhali',2).farePaisa,19600);
});

test('the Banani corridor shares a pickup; unrelated routes do not', () => {
  assert.equal(compatible({pickup_zone:'Banani',destination_zone:'Mohakhali'}, {pickup_zone:'Banani',destination_zone:'Gulshan 1'}),true);
  assert.equal(compatible({pickup_zone:'Banani',destination_zone:'Mohakhali'}, {pickup_zone:'Uttara',destination_zone:'Gulshan 1'}),false);
  assert.equal(routeGroup('Mirpur','Dhanmondi'), 'DIRECT:Mirpur:Dhanmondi');
});

test('driver transitions are ordered', () => {
  assert.equal(nextPoolStatus.MATCHED,'DRIVER_ARRIVED');
  assert.equal(nextPoolStatus.DRIVER_ARRIVED,'STARTED');
  assert.equal(nextPoolStatus.STARTED,'COMPLETED');
  assert.equal(nextPoolStatus.COMPLETED,undefined);
});
