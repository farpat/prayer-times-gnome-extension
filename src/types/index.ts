/**
 * Prayer Times extension types
 * Centralizes all type definitions used in the extension
 */

import type Gio from 'gi://Gio';

/**
 * Prayer times returned by Aladhan API
 */
export interface PrayerTimes {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
}

/**
 * Prayer information (for display)
 */
export interface PrayerInfo {
    /** Prayer identifier (matches key in PrayerTimes) */
    id: keyof PrayerTimes;
    /** Display name */
    label: string;
    /** Icon filename (without extension) */
    icon: string;
}

/**
 * Next prayer to display
 */
export interface NextPrayer {
    prayer: PrayerInfo;
    time: string;
}

/**
 * City search result (Open-Meteo API)
 */
export interface CityResult {
    name: string;
    country: string;
    admin1: string;
    admin2: string;
    latitude: number;
    longitude: number;
}

/**
 * Shared extension context
 */
export interface ExtensionContext {
    settings: Gio.Settings;
    extensionPath: string;
}

/**
 * Callback for fetching prayer times
 */
export type PrayerTimesCallback = (times: PrayerTimes | null, error?: string) => void;

/**
 * Callback for city search
 */
export type CitySearchCallback = (results: CityResult[]) => void;
