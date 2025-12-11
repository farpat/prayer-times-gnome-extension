/**
 * Types pour l'extension Prayer Times
 * Ce fichier centralise toutes les définitions de types utilisées dans l'extension
 */

import type Gio from 'gi://Gio';

/**
 * Horaires de prière retournés par l'API Aladhan
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
 * Information sur une prière (pour l'affichage)
 */
export interface PrayerInfo {
    /** Identifiant de la prière (correspond à la clé dans PrayerTimes) */
    id: keyof PrayerTimes;
    /** Nom affiché */
    label: string;
    /** Nom du fichier icône (sans extension) */
    icon: string;
}

/**
 * Prochaine prière à afficher
 */
export interface NextPrayer {
    prayer: PrayerInfo;
    time: string;
}

/**
 * Résultat de recherche de ville (API Open-Meteo)
 */
export interface CityResult {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
}

/**
 * Contexte partagé de l'extension
 */
export interface ExtensionContext {
    settings: Gio.Settings;
    extensionPath: string;
}

/**
 * Callback pour la récupération des horaires
 */
export type PrayerTimesCallback = (times: PrayerTimes | null, error?: string) => void;

/**
 * Callback pour la recherche de villes
 */
export type CitySearchCallback = (results: CityResult[]) => void;
