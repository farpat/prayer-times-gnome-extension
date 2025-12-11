/**
 * Services d'appel aux APIs externes
 * - Aladhan : horaires de prière
 * - Open-Meteo : géolocalisation des villes
 */

import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import type { PrayerTimes, CityResult, PrayerTimesCallback, CitySearchCallback } from '../types/index.js';
import { API_BASE_URL, GEOCODING_API_URL } from './constants.js';

/**
 * Récupère les horaires de prière depuis l'API Aladhan
 * @param session - Session HTTP Soup
 * @param city - Nom de la ville
 * @param country - Nom du pays
 * @param method - ID de la méthode de calcul
 * @param callback - Fonction appelée avec les résultats
 */
export function fetchPrayerTimes(
    session: Soup.Session,
    city: string,
    country: string,
    method: number,
    callback: PrayerTimesCallback
): void {
    const url = `${API_BASE_URL}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
    console.log(`[PrayerTimes API] Requesting: ${url}`);

    const message = Soup.Message.new('GET', url);
    if (!message) {
        console.error('[PrayerTimes API] Failed to create HTTP message');
        callback(null, 'Failed to create request');
        return;
    }

    session.send_and_read_async(
        message,
        GLib.PRIORITY_DEFAULT,
        null,
        (sess, result) => {
            try {
                const bytes = sess.send_and_read_finish(result);
                const decoder = new TextDecoder('utf-8');
                const responseText = decoder.decode(bytes.get_data());
                const data = JSON.parse(responseText);

                if (data.code === 200 && data.data?.timings) {
                    const times: PrayerTimes = {
                        Fajr: data.data.timings.Fajr,
                        Sunrise: data.data.timings.Sunrise,
                        Dhuhr: data.data.timings.Dhuhr,
                        Asr: data.data.timings.Asr,
                        Maghrib: data.data.timings.Maghrib,
                        Isha: data.data.timings.Isha,
                    };
                    console.log('[PrayerTimes API] Successfully fetched times');
                    callback(times);
                } else {
                    console.error(`[PrayerTimes API] API error - code: ${data.code}, status: ${data.status}`);
                    callback(null, data.status || 'API error');
                }
            } catch (e) {
                console.error('[PrayerTimes API] Parse error:', e);
                callback(null, 'Parse error');
            }
        }
    );
}

/**
 * Recherche des villes par nom via l'API Open-Meteo
 * @param session - Session HTTP Soup
 * @param query - Texte de recherche (min 2 caractères)
 * @param callback - Fonction appelée avec les résultats
 */
export function searchCities(
    session: Soup.Session,
    query: string,
    callback: CitySearchCallback
): void {
    const url = `${GEOCODING_API_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;

    const message = Soup.Message.new('GET', url);
    if (!message) {
        callback([]);
        return;
    }

    session.send_and_read_async(
        message,
        GLib.PRIORITY_DEFAULT,
        null,
        (sess, result) => {
            try {
                const bytes = sess.send_and_read_finish(result);
                const decoder = new TextDecoder('utf-8');
                const responseText = decoder.decode(bytes.get_data());
                const data = JSON.parse(responseText);

                if (data.results && data.results.length > 0) {
                    const cities: CityResult[] = data.results.map(
                        (r: Record<string, unknown>) => ({
                            name: r.name as string,
                            country: (r.country as string) || '',
                            latitude: r.latitude as number,
                            longitude: r.longitude as number,
                        })
                    );
                    callback(cities);
                } else {
                    callback([]);
                }
            } catch (e) {
                console.error('Prayer Times: City search error', e);
                callback([]);
            }
        }
    );
}
