/**
 * Constantes de l'extension
 * Centralise toutes les valeurs constantes utilisées dans l'extension
 */

import type { PrayerInfo } from '../types/index.js';

/**
 * Liste des 5 prières avec leurs informations d'affichage
 */
export const PRAYERS: PrayerInfo[] = [
    { id: 'Fajr', label: 'Fajr', icon: 'fajr' },
    { id: 'Dhuhr', label: 'Dhuhr', icon: 'dhuhr' },
    { id: 'Asr', label: 'Asr', icon: 'asr' },
    { id: 'Maghrib', label: 'Maghrib', icon: 'maghrib' },
    { id: 'Isha', label: 'Isha', icon: 'isha' },
];

/**
 * Méthodes de calcul des horaires de prière (API Aladhan)
 */
export const CALCULATION_METHODS = [
    { id: 0, name: 'Shia Ithna-Ashari' },
    { id: 1, name: 'University of Islamic Sciences, Karachi' },
    { id: 2, name: 'Islamic Society of North America (ISNA)' },
    { id: 3, name: 'Muslim World League' },
    { id: 4, name: 'Umm Al-Qura University, Makkah' },
    { id: 5, name: 'Egyptian General Authority of Survey' },
    { id: 7, name: 'Institute of Geophysics, University of Tehran' },
    { id: 8, name: 'Gulf Region' },
    { id: 9, name: 'Kuwait' },
    { id: 10, name: 'Qatar' },
    { id: 11, name: 'Majlis Ugama Islam Singapura' },
    { id: 12, name: 'UOIF (France)' },
    { id: 13, name: 'Diyanet (Turkey)' },
    { id: 14, name: 'Spiritual Administration of Muslims of Russia' },
    { id: 15, name: 'Moonsighting Committee Worldwide' },
];

/**
 * Thèmes de couleur disponibles
 */
export const COLOR_THEMES = [
    { id: 'blue', name: 'Blue' },
    { id: 'teal', name: 'Teal' },
    { id: 'purple', name: 'Purple' },
    { id: 'orange', name: 'Orange' },
];

/**
 * Options de fond du menu
 */
export const MENU_BACKGROUNDS = [
    { id: 'auto', name: 'Auto (System)' },
    { id: 'light', name: 'Light' },
    { id: 'dark', name: 'Dark' },
];

/**
 * Intervalle de mise à jour de l'affichage (en secondes)
 */
export const UPDATE_INTERVAL_SECONDS = 30;

/**
 * URL de base de l'API Aladhan pour les horaires de prière
 */
export const API_BASE_URL = 'https://api.aladhan.com/v1/timingsByCity';

/**
 * URL de l'API Open-Meteo pour la géolocalisation des villes
 */
export const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
