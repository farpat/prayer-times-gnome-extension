/**
 * GNOME Shell panel indicator
 * Displays the next prayer in the top bar
 */

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Soup from 'gi://Soup?version=3.0';
import Clutter from 'gi://Clutter';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import type { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import type { PrayerTimes } from '../types/index.js';
import type { UrgencyStatus, UrgencyThresholds } from '../helpers/time.js';
import {
    UPDATE_INTERVAL_SECONDS,
    getTodayString,
    formatTime,
    getNextPrayer,
    getUrgencyStatus,
    fetchPrayerTimes,
} from '../helpers/index.js';
import { createPrayerMenuItems, createSettingsMenuItem, updateMenuItems } from './menu.js';

/**
 * Indicator displayed in GNOME Shell panel
 * - Shows next prayer in top bar
 * - Dropdown menu with all daily prayers
 */
export const PrayerTimesIndicator = GObject.registerClass(
    class PrayerTimesIndicator extends PanelMenu.Button {
        private _extension!: Extension;
        private _settings!: ReturnType<Extension['getSettings']>;
        private _extensionPath!: string;
        private _prayerTimes: PrayerTimes | null = null;
        private _updateTimeout: number | null = null;
        private _httpSession: Soup.Session | null = null;
        private _settingsChangedId: number | null = null;
        private _box!: St.BoxLayout;
        private _label!: St.Label;
        private _statusDot!: St.Bin;
        private _currentStatus: UrgencyStatus = 'green';
        private _currentTheme: string = 'blue';
        private _currentBackground: string = 'auto';
        private _prayerMenuItems!: Map<string, unknown>;

        _init(extension: Extension): void {
            super._init(0.0, 'Prayer Times Indicator');

            this._extension = extension;
            this._settings = extension.getSettings();
            this._extensionPath = extension.path;

            this._createPanelButton();
            this._createMenu();

            this._httpSession = new Soup.Session();

            // Capture this for GJS callbacks
            const self = this;

            // Listen for settings changes to refresh
            this._settingsChangedId = this._settings.connect(
                'changed',
                ((_settings: unknown, key: string) => {
                    console.log(`[PrayerTimes] Settings changed: ${key}`);
                    // Ignore cache changes to avoid loops
                    if (key === 'cached-date' || key === 'cached-times') {
                        return;
                    }
                    // Invalidate cache if location settings change
                    if (key === 'city' || key === 'country' || key === 'calculation-method') {
                        console.log(`[PrayerTimes] Invalidating cache due to ${key} change`);
                        self._settings.set_string('cached-date', '');
                        self._settings.set_string('cached-times', '');
                    }
                    self._fetchPrayerTimes();
                    self._applyTheme();
                }) as () => void
            );
            console.log(`[PrayerTimes] Settings listener connected with ID: ${this._settingsChangedId}`);

            this._fetchPrayerTimes();
            this._startUpdateLoop();
        }

        /**
         * Creates the button displayed in panel
         */
        private _createPanelButton(): void {
            this._box = new St.BoxLayout({
                style_class: 'panel-status-menu-box prayer-times-box',
            });

            this._label = new St.Label({
                text: 'Loading...',
                style_class: 'prayer-label',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._box.add_child(this._label);

            this._statusDot = new St.Bin({
                style_class: 'prayer-status-dot prayer-status-green',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._box.add_child(this._statusDot);

            this.add_child(this._box);
        }

        /**
         * Creates the dropdown menu
         */
        private _createMenu(): void {
            const extension = this._extension;
            this._prayerMenuItems = createPrayerMenuItems(this.menu, this._extensionPath);
            createSettingsMenuItem(this.menu, () => {
                extension.openPreferences();
            });
            this._applyTheme();
        }

        /**
         * Applies color theme and background to menu
         */
        private _applyTheme(): void {
            const newTheme = this._settings.get_string('color-theme') || 'blue';
            const newBackground = this._settings.get_string('menu-background') || 'auto';

            if (newTheme !== this._currentTheme) {
                this.menu.box.remove_style_class_name(`prayer-theme-${this._currentTheme}`);
                this.menu.box.add_style_class_name(`prayer-theme-${newTheme}`);
                this._currentTheme = newTheme;
            }

            if (newBackground !== this._currentBackground) {
                if (this._currentBackground !== 'auto') {
                    this.menu.box.remove_style_class_name(`prayer-bg-${this._currentBackground}`);
                }
                if (newBackground !== 'auto') {
                    this.menu.box.add_style_class_name(`prayer-bg-${newBackground}`);
                }
                this._currentBackground = newBackground;
            }
        }

        /**
         * Starts periodic update loop
         */
        private _startUpdateLoop(): void {
            const self = this;
            this._updateTimeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                UPDATE_INTERVAL_SECONDS,
                () => {
                    self._updateDisplay();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        /**
         * Fetches prayer times (cache or API)
         */
        private _fetchPrayerTimes(): void {
            const self = this;
            const city = this._settings.get_string('city') || '';
            const country = this._settings.get_string('country') || '';
            const method = this._settings.get_int('calculation-method');
            const today = getTodayString();
            const cachedDate = this._settings.get_string('cached-date');
            const cachedTimes = this._settings.get_string('cached-times');

            // Use cache if available and valid
            if (cachedDate === today && cachedTimes) {
                try {
                    this._prayerTimes = JSON.parse(cachedTimes);
                    this._updateDisplay();
                    return;
                } catch (e) {
                    console.error('[PrayerTimes] Cache parse error:', e);
                }
            }

            if (!this._httpSession) {
                console.error('[PrayerTimes] No HTTP session available');
                return;
            }

            fetchPrayerTimes(this._httpSession, city, country, method, (times, error) => {
                if (times) {
                    self._prayerTimes = times;
                    self._settings.set_string('cached-times', JSON.stringify(times));
                    self._settings.set_string('cached-date', today);
                    self._updateDisplay();
                } else {
                    console.error('[PrayerTimes] Fetch error:', error);
                    self._showError(error || 'Error');
                }
            });
        }

        /**
         * Updates panel and menu display
         */
        private _updateDisplay(): void {
            if (!this._label) {
                return;
            }

            if (!this._prayerTimes) {
                this._label.text = 'Loading...';
                return;
            }

            const nextPrayer = getNextPrayer(this._prayerTimes);
            const use24h = this._settings.get_boolean('use-24h-format');

            // Update panel with next prayer
            this._label.text = `${nextPrayer.prayer.label} ${formatTime(nextPrayer.time, use24h)}`;

            // Get configurable thresholds
            const thresholds: UrgencyThresholds = {
                orangeMinutes: this._settings.get_int('urgency-orange-minutes'),
                redMinutes: this._settings.get_int('urgency-red-minutes'),
            };

            // Update colored status indicator
            const newStatus = getUrgencyStatus(nextPrayer.time, thresholds);
            if (newStatus !== this._currentStatus) {
                this._statusDot.remove_style_class_name(`prayer-status-${this._currentStatus}`);
                this._statusDot.add_style_class_name(`prayer-status-${newStatus}`);
                this._currentStatus = newStatus;
            }

            // Update menu with all prayers
            updateMenuItems(
                this._prayerMenuItems as Map<string, never>,
                this._prayerTimes,
                use24h
            );
        }

        /**
         * Shows error message in panel
         */
        private _showError(message: string): void {
            this._label.text = message;
        }

        /**
         * Cleans up resources on destruction
         */
        destroy(): void {
            if (this._updateTimeout) {
                GLib.source_remove(this._updateTimeout);
                this._updateTimeout = null;
            }

            if (this._settingsChangedId && this._settings) {
                this._settings.disconnect(this._settingsChangedId);
                this._settingsChangedId = null;
            }

            this._httpSession = null;

            super.destroy();
        }
    }
);
