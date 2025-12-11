/**
 * Utilitaires de gestion du temps
 * Fonctions pour parser et formater les horaires
 */

import type { PrayerTimes, NextPrayer } from '../types/index.js';
import { PRAYERS } from './constants.js';

/**
 * Retourne la date du jour au format YYYY-MM-DD
 * Utilisé pour le cache des horaires
 */
export function getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parse une chaîne horaire "HH:MM" en objet Date
 * @param timeStr - Horaire au format "HH:MM" ou "HH:MM (timezone)"
 * @returns Date du jour avec l'heure spécifiée, ou null si format invalide
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
 * Formate un horaire pour l'affichage
 * @param timeStr - Horaire au format "HH:MM"
 * @param use24h - true pour format 24h, false pour AM/PM
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
 * Détermine la prochaine prière à effectuer
 * @param prayerTimes - Horaires de toutes les prières du jour
 * @returns La prochaine prière et son horaire
 */
export function getNextPrayer(prayerTimes: PrayerTimes): NextPrayer {
    const now = new Date();

    // Parcourt les prières dans l'ordre pour trouver la prochaine
    for (const prayer of PRAYERS) {
        const prayerTime = parseTime(prayerTimes[prayer.id]);
        if (prayerTime && now < prayerTime) {
            return { prayer, time: prayerTimes[prayer.id] };
        }
    }

    // Si toutes les prières sont passées, la prochaine est Fajr (demain)
    return { prayer: PRAYERS[0], time: prayerTimes.Fajr };
}

export type UrgencyStatus = 'green' | 'orange' | 'red';

/**
 * Calcule le niveau d'urgence selon le temps restant avant la prochaine prière
 * - Vert : plus de 30 minutes
 * - Orange : entre 10 et 30 minutes
 * - Rouge : moins de 10 minutes
 */
export function getUrgencyStatus(timeStr: string): UrgencyStatus {
    const prayerTime = parseTime(timeStr);
    if (!prayerTime) return 'green';

    const now = new Date();
    const diffMs = prayerTime.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes <= 0) {
        // Prière passée (probablement Fajr demain)
        return 'green';
    }

    if (diffMinutes <= 10) {
        return 'red';
    }

    if (diffMinutes <= 30) {
        return 'orange';
    }

    return 'green';
}
