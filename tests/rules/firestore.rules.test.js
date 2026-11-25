import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const emulatorConfigured = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
let testEnv

before(async () => {
  if (!emulatorConfigured) return
  testEnv = await initializeTestEnvironment({
    projectId: 'fleet-rules-test',
    firestore: {
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
    },
  })

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore()
    await setDoc(doc(adminDb, 'users/renter'), {
      uid: 'renter',
      role: 'renter',
      kycStatus: 'not_submitted',
    })
    await setDoc(doc(adminDb, 'users/vendor'), {
      uid: 'vendor',
      role: 'vendor',
      kycStatus: 'approved',
    })
    await setDoc(doc(adminDb, 'vehicles/vehicle-1'), {
      ownerId: 'vendor',
      status: 'active',
      available: true,
      name: 'Test vehicle',
    })
    await setDoc(doc(adminDb, 'notifications/notification-1'), {
      userId: 'renter',
      title: 'Hello',
      read: false,
    })
    await setDoc(doc(adminDb, 'bookings/booking-1'), {
      renterId: 'renter',
      ownerId: 'vendor',
      status: 'pending',
    })
    await setDoc(doc(adminDb, 'adminCredentials/root'), {
      passwordHash: 'secret-hash',
      active: true,
    })
  })
})

after(async () => {
  if (testEnv) await testEnv.cleanup()
})

test('unauthenticated users cannot read vehicle documents', { skip: !emulatorConfigured }, async () => {
  const db = testEnv.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(db, 'vehicles/vehicle-1')))
})

test('authenticated users can read listing documents', { skip: !emulatorConfigured }, async () => {
  const db = testEnv.authenticatedContext('renter').firestore()
  await assertSucceeds(getDoc(doc(db, 'vehicles/vehicle-1')))
})

test('a renter cannot promote their own account to vendor', { skip: !emulatorConfigured }, async () => {
  const db = testEnv.authenticatedContext('renter').firestore()
  await assertFails(setDoc(doc(db, 'users/renter'), { role: 'vendor' }, { merge: true }))
})

test('clients cannot create notifications directly', { skip: !emulatorConfigured }, async () => {
  const db = testEnv.authenticatedContext('renter').firestore()
  await assertFails(setDoc(doc(db, 'notifications/forged'), {
    userId: 'vendor',
    title: 'Forged notification',
    read: false,
  }))
})

test('booking reads are limited to participants', { skip: !emulatorConfigured }, async () => {
  const renterDb = testEnv.authenticatedContext('renter').firestore()
  const outsiderDb = testEnv.authenticatedContext('outsider').firestore()
  await assertSucceeds(getDoc(doc(renterDb, 'bookings/booking-1')))
  await assertFails(getDoc(doc(outsiderDb, 'bookings/booking-1')))
})

test('adminCredentials cannot be read or written by any client', { skip: !emulatorConfigured }, async () => {
  const anonDb = testEnv.unauthenticatedContext().firestore()
  const renterDb = testEnv.authenticatedContext('renter').firestore()
  await assertFails(getDoc(doc(anonDb, 'adminCredentials/root')))
  await assertFails(getDoc(doc(renterDb, 'adminCredentials/root')))
  await assertFails(setDoc(doc(renterDb, 'adminCredentials/forged'), { password: '123', active: true }))
})

