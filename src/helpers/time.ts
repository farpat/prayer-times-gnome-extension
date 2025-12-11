/**
 * Time management utilities
 * Functions to parse and format prayer times
 */

import type { PrayerTimes, NextPrayer } from '../types/index.js';
import { PRAYERS } from './constants.js';

/**
 * Returns today's date in YYYY-MM-DD format
 * Used for caching prayer times
 */
export function getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parses a "HH:MM" time string into a Date object
 * @param timeStr - Time in "HH:MM" or "HH:MM (timezone)" format
 * @returns Today's Date with specified time, or null if invalid format
 */
export function parseTime(timeStr: string): Date | null {
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    if (!match) return null;

    const now = new Date();
    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        parseInt(match[1]),
        parseInt(match[2]),
        0
    );
}

/**
 * Formats a time string for display
 * @param timeStr - Time in "HH:MM" format
 * @param use24h - true for 24h format, false for AM/PM
 */
export function formatTime(timeStr: string, use24h: boolean): string {
    const date = parseTime(timeStr);
    if (!date) return timeStr;

    if (use24h) {
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    }

    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Determines the next prayer to perform
 * @param prayerTimes - All prayer times for the day
 * @returns The next prayer and its time
 */
export function getNextPrayer(prayerTimes: PrayerTimes): NextPrayer {
    const now = new Date();

    // Iterate through prayers in order to find the next one
    for (const prayer of PRAYERS) {
        const prayerTime = parseTime(prayerTimes[prayer.id]);
        if (prayerTime && now < prayerTime) {
            return { prayer, time: prayerTimes[prayer.id] };
        }
    }

    // If all prayers have passed, next is Fajr (tomorrow)
    return { prayer: PRAYERS[0], time: prayerTimes.Fajr };
}

export type UrgencyStatus = 'green' | 'orange' | 'red';

export type UrgencyThresholds = {
    orangeMinutes: number;
    redMinutes: number;
};

/**
 * Calculates urgency level based on time remaining before next prayer
 * @param timeStr - Prayer time
 * @param thresholds - Configurable thresholds (orange and red in minutes)
 */
export function getUrgencyStatus(timeStr: string, thresholds: UrgencyThresholds): UrgencyStatus {
    const prayerTime = parseTime(timeStr);
    if (!prayerTime) return 'green';

    const now = new Date();
    const diffMs = prayerTime.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes <= 0) {
        // Prayer has passed (probably Fajr tomorrow)
        return 'green';
    }

    if (diffMinutes <= thresholds.redMinutes) {
        return 'red';
    }

    if (diffMinutes <= thresholds.orangeMinutes) {
        return 'orange';
    }

    return 'green';
}
