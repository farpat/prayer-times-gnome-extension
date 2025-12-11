/**
 * Local prayer times calculator
 * Uses astronomical formulas to calculate prayer times without API
 */

import type { PrayerTimes } from '../types/index.js';

/**
 * Calculation method angles (Fajr and Isha angles below horizon)
 */
const METHOD_ANGLES: Record<number, { fajr: number; isha: number; ishaMinutes?: number }> = {
    0: { fajr: 16, isha: 14 },           // Shia Ithna-Ashari
    1: { fajr: 18, isha: 18 },           // Karachi
    2: { fajr: 15, isha: 15 },           // ISNA
    3: { fajr: 18, isha: 17 },           // MWL
    4: { fajr: 18.5, ishaMinutes: 90, isha: 0 }, // Umm Al-Qura (90 min after Maghrib)
    5: { fajr: 19.5, isha: 17.5 },       // Egypt
    7: { fajr: 17.7, isha: 14 },         // Tehran
    8: { fajr: 19.5, isha: 0, ishaMinutes: 90 }, // Gulf
    9: { fajr: 18, isha: 17.5 },         // Kuwait
    10: { fajr: 18, isha: 0, ishaMinutes: 90 }, // Qatar
    11: { fajr: 20, isha: 18 },          // Singapore
    12: { fajr: 12, isha: 12 },          // UOIF (France)
    13: { fajr: 18, isha: 17 },          // Turkey
    14: { fajr: 16, isha: 15 },          // Russia
    15: { fajr: 18, isha: 18 },          // Moonsighting
};

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
function toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
}

/**
 * Calculates the Julian day number for a given date
 */
function getJulianDay(year: number, month: number, day: number): number {
    if (month <= 2) {
        year -= 1;
        month += 12;
    }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

/**
 * Calculates the sun's declination angle for a given Julian day
 */
function getSunDeclination(julianDay: number): number {
    const D = julianDay - 2451545.0;
    const g = toRadians((357.529 + 0.98560028 * D) % 360);
    const q = (280.459 + 0.98564736 * D) % 360;
    const L = toRadians((q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360);
    const e = toRadians(23.439 - 0.00000036 * D);
    return toDegrees(Math.asin(Math.sin(e) * Math.sin(L)));
}

/**
 * Calculates the equation of time for a given Julian day
 */
function getEquationOfTime(julianDay: number): number {
    const D = julianDay - 2451545.0;
    const g = toRadians((357.529 + 0.98560028 * D) % 360);
    const q = (280.459 + 0.98564736 * D) % 360;
    const L = toRadians((q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360);
    const e = toRadians(23.439 - 0.00000036 * D);
    const RA = toDegrees(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) / 15;
    return (q / 15) - fixHour(RA);
}

/**
 * Fixes hour to be in 0-24 range
 */
function fixHour(hour: number): number {
    hour = hour % 24;
    return hour < 0 ? hour + 24 : hour;
}

/**
 * Calculates midday (Dhuhr) time
 */
function getMidDay(julianDay: number, longitude: number, timezone: number): number {
    const eqt = getEquationOfTime(julianDay);
    return fixHour(12 - eqt - longitude / 15 + timezone);
}

/**
 * Calculates the time for a given sun angle
 */
function getTimeForAngle(
    julianDay: number,
    angle: number,
    latitude: number,
    longitude: number,
    timezone: number,
    direction: 'ccw' | 'cw'
): number {
    const declination = getSunDeclination(julianDay);
    const midDay = getMidDay(julianDay, longitude, timezone);

    const latRad = toRadians(latitude);
    const decRad = toRadians(declination);
    const angleRad = toRadians(angle);

    const cosHA = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(decRad)) /
        (Math.cos(latRad) * Math.cos(decRad));

    if (cosHA > 1 || cosHA < -1) {
        // Sun never reaches this angle (polar regions)
        return NaN;
    }

    const HA = toDegrees(Math.acos(cosHA)) / 15;
    return direction === 'ccw' ? midDay - HA : midDay + HA;
}

/**
 * Calculates Asr time using shadow length formula
 * @param shadowFactor - 1 for standard (Shafi'i), 2 for Hanafi
 */
function getAsrTime(
    julianDay: number,
    latitude: number,
    longitude: number,
    timezone: number,
    shadowFactor: number = 1
): number {
    const declination = getSunDeclination(julianDay);
    const midDay = getMidDay(julianDay, longitude, timezone);

    const latRad = toRadians(latitude);
    const decRad = toRadians(declination);

    // Shadow ratio at midday
    const A = Math.abs(latRad - decRad);

    // Asr angle: when shadow = shadowFactor * object height + midday shadow
    // cot(angle) = shadowFactor + tan(|lat - dec|)
    // angle = acot(shadowFactor + tan(|lat - dec|))
    const asrAngle = Math.atan(1 / (shadowFactor + Math.tan(A)));

    // Hour angle for Asr
    const cosHA = (Math.sin(asrAngle) - Math.sin(latRad) * Math.sin(decRad)) /
        (Math.cos(latRad) * Math.cos(decRad));

    if (cosHA > 1 || cosHA < -1) {
        return NaN;
    }

    const HA = toDegrees(Math.acos(cosHA)) / 15;
    return midDay + HA;
}

/**
 * Formats decimal hours to HH:MM string
 */
function formatDecimalTime(decimalHours: number): string {
    if (isNaN(decimalHours)) {
        return '--:--';
    }
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculates all prayer times for a given date and location
 */
export function calculatePrayerTimes(
    date: Date,
    latitude: number,
    longitude: number,
    timezone: number,
    method: number
): PrayerTimes {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const julianDay = getJulianDay(year, month, day);
    const angles = METHOD_ANGLES[method] || METHOD_ANGLES[3]; // Default to MWL

    // Sunrise angle: sun center at horizon + refraction + sun radius
    const sunriseAngle = -0.833;

    const fajr = getTimeForAngle(julianDay, -angles.fajr, latitude, longitude, timezone, 'ccw');
    const sunrise = getTimeForAngle(julianDay, sunriseAngle, latitude, longitude, timezone, 'ccw');
    const dhuhr = getMidDay(julianDay, longitude, timezone) + 1 / 60; // Add 1 minute for safety
    const asr = getAsrTime(julianDay, latitude, longitude, timezone, 1); // Standard Asr
    const maghrib = getTimeForAngle(julianDay, sunriseAngle, latitude, longitude, timezone, 'cw');

    let isha: number;
    if (angles.ishaMinutes) {
        // Fixed minutes after Maghrib (Umm Al-Qura, etc.)
        isha = maghrib + angles.ishaMinutes / 60;
    } else {
        isha = getTimeForAngle(julianDay, -angles.isha, latitude, longitude, timezone, 'cw');
    }

    return {
        Fajr: formatDecimalTime(fajr),
        Sunrise: formatDecimalTime(sunrise),
        Dhuhr: formatDecimalTime(dhuhr),
        Asr: formatDecimalTime(asr),
        Maghrib: formatDecimalTime(maghrib),
        Isha: formatDecimalTime(isha),
    };
}

/**
 * Gets the current timezone offset in hours
 */
export function getTimezoneOffset(): number {
    return -new Date().getTimezoneOffset() / 60;
}
