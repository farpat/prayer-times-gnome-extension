/**
 * External API services
 * - Aladhan: prayer times
 * - Open-Meteo: city geolocation
 */

import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import type { PrayerTimes, CityResult, PrayerTimesCallback, CitySearchCallback } from '../types/index.js';
import { API_BASE_URL, GEOCODING_API_URL } from './constants.js';

/**
 * Fetches prayer times from Aladhan API
 * @param session - Soup HTTP session
 * @param city - City name
 * @param country - Country name
 * @param method - Calculation method ID
 * @param callback - Function called with results
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
            let bytes;
            try {
                bytes = sess.send_and_read_finish(result);
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.error('[PrayerTimes API] Network error:', errorMessage);
                callback(null, 'Network error');
                return;
            }

            try {
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
 * Searches cities by name via Open-Meteo API
 * @param session - Soup HTTP session
 * @param query - Search text (min 2 characters)
 * @param callback - Function called with results
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
                            admin1: (r.admin1 as string) || '',
                            admin2: (r.admin2 as string) || '',
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
