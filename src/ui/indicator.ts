/**
 * GNOME Shell panel indicator
 * Displays the next prayer in the top bar
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
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
    calculatePrayerTimes,
    getTimezoneOffset,
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
        private _settings!: Gio.Settings;
        private _extensionPath!: string;
        private _prayerTimes: PrayerTimes | null = null;
        private _updateTimeout: number | null = null;
        private _settingsPollingTimeout: number | null = null;
        private _isEnabled: boolean = true;
        private _box!: St.BoxLayout;
        private _label!: St.Label;
        private _statusDot!: St.Bin;
        private _currentStatus!: UrgencyStatus;
        private _currentTheme!: string;
        private _currentBackground!: string;
        private _prayerMenuItems!: Map<string, unknown>;
        // Cached settings values for polling (GNOME 49 signals broken)
        // Using a shared object to ensure callbacks see updated values
        // Also includes prayerTimes since GJS loses `this` context in callbacks
        private _cache!: {
            latitude: number;
            longitude: number;
            method: number;
            use24h: boolean;
            colorTheme: string;
            menuBackground: string;
            orangeMinutes: number;
            redMinutes: number;
            prayerTimes: PrayerTimes | null;
        };
        // Shared UI references for callbacks (GJS property access broken in callbacks)
        private _ui!: {
            label: St.Label;
            statusDot: St.Bin;
            box: St.BoxLayout;
            menuItems: Map<string, unknown> | null;
        };

        _init(extension: Extension): void {
            super._init(0.0, 'Prayer Times Indicator');

            this._extension = extension;
            this._extensionPath = extension.path;
            this._isEnabled = true;

            // IMPORTANT: Initialize all properties explicitly here
            // GObject.registerClass bypasses TypeScript class property initializers
            this._currentStatus = 'green';
            this._currentTheme = 'blue';
            this._currentBackground = 'auto';

            // Shared cache object - captured by reference in callbacks
            this._cache = {
                latitude: 0,
                longitude: 0,
                method: 0,
                use24h: true,
                colorTheme: 'blue',
                menuBackground: 'auto',
                orangeMinutes: 30,
                redMinutes: 10,
                prayerTimes: null,
            };

            // Use the standard method from Extension class with explicit schema ID
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this._settings = (extension as any).getSettings('org.gnome.shell.extensions.prayer-times');

            this._createPanelButton();

            // Initialize cached settings BEFORE creating menu (for theme application)
            this._initCachedSettings();

            this._createMenu();

            // Start polling for settings changes (GNOME 49 signals broken)
            this._startSettingsPolling();

            // Calculate prayer times locally (no network needed!)
            this._calculatePrayerTimes();
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

            // Store UI references in shared object for callbacks
            this._ui = {
                label: this._label,
                statusDot: this._statusDot,
                box: this._box,
                menuItems: null, // Will be set in _createMenu()
            };
        }

        /**
         * Creates the dropdown menu
         */
        private _createMenu(): void {
            const extension = this._extension;
            this._prayerMenuItems = createPrayerMenuItems(this.menu, this._extensionPath);
            // Store in shared UI object for GLib callbacks (where this._prayerMenuItems is lost)
            this._ui.menuItems = this._prayerMenuItems;
            createSettingsMenuItem(this.menu, () => {
                extension.openPreferences();
            });
            this._applyTheme();
        }

        /**
         * Initialize cached settings values from dconf directly
         * (bypasses GSettings cache issues in GNOME 49)
         */
        private _initCachedSettings(): void {
            console.log('[PrayerTimes] _initCachedSettings() START');

            // Read directly from dconf to bypass GSettings cache
            const latStr = this._readDconfKey('latitude');
            const lonStr = this._readDconfKey('longitude');
            const methodStr = this._readDconfKey('calculation-method');
            const use24hStr = this._readDconfKey('use-24h-format');
            const colorThemeStr = this._readDconfKey('color-theme');
            const menuBgStr = this._readDconfKey('menu-background');
            const orangeStr = this._readDconfKey('urgency-orange-minutes');
            const redStr = this._readDconfKey('urgency-red-minutes');

            console.log(`[PrayerTimes] Raw dconf values: lat="${latStr}" lon="${lonStr}" method="${methodStr}"`);
            console.log(`[PrayerTimes] Raw dconf values: use24h="${use24hStr}" theme="${colorThemeStr}" bg="${menuBgStr}"`);
            console.log(`[PrayerTimes] Raw dconf values: orange="${orangeStr}" red="${redStr}"`);

            // Update the shared cache object (captured by reference in callbacks)
            this._cache.latitude = latStr ? parseFloat(latStr) : 48.8566;
            this._cache.longitude = lonStr ? parseFloat(lonStr) : 2.3522;
            this._cache.method = methodStr ? parseInt(methodStr) : 3;
            this._cache.use24h = use24hStr === 'true';
            this._cache.colorTheme = colorThemeStr ? colorThemeStr.replace(/'/g, '') : 'blue';
            this._cache.menuBackground = menuBgStr ? menuBgStr.replace(/'/g, '') : 'auto';
            this._cache.orangeMinutes = orangeStr ? parseInt(orangeStr) : 30;
            this._cache.redMinutes = redStr ? parseInt(redStr) : 10;

            console.log(`[PrayerTimes] Parsed values: lat=${this._cache.latitude} lon=${this._cache.longitude} method=${this._cache.method}`);
            console.log(`[PrayerTimes] Parsed values: use24h=${this._cache.use24h} theme=${this._cache.colorTheme} bg=${this._cache.menuBackground}`);
            console.log(`[PrayerTimes] _initCachedSettings() END`);
        }

        /**
         * Reads a dconf key directly via spawn (bypasses GSettings cache completely)
         */
        private _readDconfKey(key: string): string {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const GLibAny = GLib as any;
                const [ok, stdout] = GLibAny.spawn_command_line_sync(
                    `dconf read /org/gnome/shell/extensions/prayer-times/${key}`
                );
                if (ok && stdout) {
                    const result = new TextDecoder().decode(stdout).trim();
                    return result;
                }
            } catch (e) {
                console.error(`[PrayerTimes] dconf read error: ${e}`);
            }
            return '';
        }

        /**
         * Poll settings for changes (workaround for GNOME 49 GSettings cache issue)
         * Uses direct dconf reads to bypass the cache completely
         */
        private _startSettingsPolling(): void {
            const self = this;
            const settings = this._settings;
            const cache = this._cache; // Capture cache object by reference
            const ui = this._ui; // Capture UI object by reference
            const POLLING_INTERVAL_SECONDS = 2;

            console.log(`[PrayerTimes] _startSettingsPolling: self=${!!self}, settings=${!!settings}, cache=${!!cache}, ui=${!!ui}`);

            this._settingsPollingTimeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                POLLING_INTERVAL_SECONDS,
                () => {
                    console.log(`[PrayerTimes] POLL TICK: self._isEnabled=${self._isEnabled}, ui.label=${!!ui?.label}`);

                    if (!self._isEnabled) {
                        console.log('[PrayerTimes] Polling stopped: disabled');
                        return GLib.SOURCE_REMOVE;
                    }
                    if (!settings || !cache) {
                        console.log('[PrayerTimes] Polling stopped: settings or cache undefined');
                        return GLib.SOURCE_REMOVE;
                    }

                    let hasLocationChange = false;
                    let hasDisplayChange = false;

                    // Read location settings directly from dconf
                    const latStr = self._readDconfKey('latitude');
                    const lonStr = self._readDconfKey('longitude');
                    const methodStr = self._readDconfKey('calculation-method');

                    const newLatitude = latStr ? parseFloat(latStr) : cache.latitude;
                    const newLongitude = lonStr ? parseFloat(lonStr) : cache.longitude;
                    const newMethod = methodStr ? parseInt(methodStr) : cache.method;

                    console.log(`[PrayerTimes] POLL location: new=(${newLatitude},${newLongitude},${newMethod}) cached=(${cache.latitude},${cache.longitude},${cache.method})`);

                    if (newLatitude !== cache.latitude ||
                        newLongitude !== cache.longitude ||
                        newMethod !== cache.method) {
                        console.log('[PrayerTimes] Location settings changed (dconf poll)');
                        cache.latitude = newLatitude;
                        cache.longitude = newLongitude;
                        cache.method = newMethod;
                        hasLocationChange = true;
                    }

                    // Read display settings directly from dconf
                    const use24hStr = self._readDconfKey('use-24h-format');
                    const colorThemeStr = self._readDconfKey('color-theme');
                    const menuBgStr = self._readDconfKey('menu-background');
                    const orangeStr = self._readDconfKey('urgency-orange-minutes');
                    const redStr = self._readDconfKey('urgency-red-minutes');

                    const newUse24h = use24hStr === 'true';
                    const newColorTheme = colorThemeStr ? colorThemeStr.replace(/'/g, '') : 'blue';
                    const newMenuBackground = menuBgStr ? menuBgStr.replace(/'/g, '') : 'auto';
                    const newOrangeMinutes = orangeStr ? parseInt(orangeStr) : 30;
                    const newRedMinutes = redStr ? parseInt(redStr) : 10;

                    console.log(`[PrayerTimes] POLL display: newUse24h=${newUse24h} (raw="${use24hStr}") cachedUse24h=${cache.use24h}`);
                    console.log(`[PrayerTimes] POLL display: newTheme=${newColorTheme} cachedTheme=${cache.colorTheme}`);

                    if (newUse24h !== cache.use24h ||
                        newColorTheme !== cache.colorTheme ||
                        newMenuBackground !== cache.menuBackground ||
                        newOrangeMinutes !== cache.orangeMinutes ||
                        newRedMinutes !== cache.redMinutes) {
                        console.log(`[PrayerTimes] Display settings changed (dconf): use24h=${newUse24h} theme=${newColorTheme}`);
                        cache.use24h = newUse24h;
                        cache.colorTheme = newColorTheme;
                        cache.menuBackground = newMenuBackground;
                        cache.orangeMinutes = newOrangeMinutes;
                        cache.redMinutes = newRedMinutes;
                        hasDisplayChange = true;
                    }

                    console.log(`[PrayerTimes] POLL changes: hasLocationChange=${hasLocationChange} hasDisplayChange=${hasDisplayChange}`);

                    // Apply changes (both can happen independently)
                    // Pass captured references to methods (GJS loses this context in callbacks)
                    try {
                        if (hasLocationChange) {
                            console.log('[PrayerTimes] POLL: calling _calculatePrayerTimes(true, settings, cache, ui)');
                            self._calculatePrayerTimes(true, settings, cache, ui);
                            console.log('[PrayerTimes] POLL: _calculatePrayerTimes returned');
                        }
                        if (hasDisplayChange) {
                            console.log('[PrayerTimes] POLL: calling _applyTheme(cache)');
                            self._applyTheme(cache);
                            console.log('[PrayerTimes] POLL: _applyTheme returned');
                            // Only call updateDisplay if location didn't change (it already updates display)
                            if (!hasLocationChange) {
                                console.log('[PrayerTimes] POLL: calling _updateDisplay(ui, cache)');
                                self._updateDisplay(ui, cache);
                                console.log('[PrayerTimes] POLL: _updateDisplay returned');
                            }
                        }
                    } catch (e) {
                        console.error(`[PrayerTimes] Polling error: ${e}`);
                    }

                    console.log('[PrayerTimes] POLL TICK END');
                    return GLib.SOURCE_CONTINUE;
                }
            );

            console.log('[PrayerTimes] Settings polling started (dconf direct, every 2s)');
        }

        /**
         * Applies color theme and background to menu
         * Uses cached values to avoid GSettings access in callbacks
         * @param cacheRef - optional cache reference (for GLib callbacks where this._cache is lost)
         */
        private _applyTheme(cacheRef?: typeof this._cache): void {
            // Use provided cache or fall back to this._cache (which works in direct calls)
            const cache = cacheRef || this._cache;

            console.log(`[PrayerTimes] _applyTheme() START: menu=${!!this.menu}, box=${!!this.menu?.box}, cache=${!!cache}`);

            if (!this.menu?.box || !cache) {
                console.log('[PrayerTimes] _applyTheme() EARLY RETURN: no menu.box or cache');
                return;
            }

            // Use local cache reference (not this._cache)
            const newTheme = cache.colorTheme;
            const newBackground = cache.menuBackground;

            console.log(`[PrayerTimes] _applyTheme: newTheme=${newTheme} currentTheme=${this._currentTheme}`);
            console.log(`[PrayerTimes] _applyTheme: newBg=${newBackground} currentBg=${this._currentBackground}`);

            if (newTheme !== this._currentTheme) {
                console.log(`[PrayerTimes] _applyTheme: changing theme from ${this._currentTheme} to ${newTheme}`);
                this.menu.box.remove_style_class_name(`prayer-theme-${this._currentTheme}`);
                this.menu.box.add_style_class_name(`prayer-theme-${newTheme}`);
                this._currentTheme = newTheme;
            }

            if (newBackground !== this._currentBackground) {
                console.log(`[PrayerTimes] _applyTheme: changing bg from ${this._currentBackground} to ${newBackground}`);
                if (this._currentBackground !== 'auto') {
                    this.menu.box.remove_style_class_name(`prayer-bg-${this._currentBackground}`);
                }
                if (newBackground !== 'auto') {
                    this.menu.box.add_style_class_name(`prayer-bg-${newBackground}`);
                }
                this._currentBackground = newBackground;
            }

            console.log('[PrayerTimes] _applyTheme() END');
        }

        /**
         * Starts periodic update loop
         */
        private _startUpdateLoop(): void {
            const self = this;
            const settings = this._settings; // Capture references for GLib callback
            const cache = this._cache;
            const ui = this._ui;
            this._updateTimeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                UPDATE_INTERVAL_SECONDS,
                () => {
                    // Guard: extension may have been disabled or destroyed
                    if (!self._isEnabled || !settings) return GLib.SOURCE_REMOVE;

                    // Check if we need to recalculate (new day)
                    const today = getTodayString();
                    const cachedDate = settings.get_string('cached-date');
                    if (cachedDate !== today) {
                        console.log('[PrayerTimes] New day, recalculating...');
                        self._calculatePrayerTimes(false, settings, cache, ui);
                    } else {
                        self._updateDisplay(ui, cache);
                    }
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        /**
         * Calculates prayer times locally (no network needed)
         * @param forceRecalculate - bypass cache (used when location changes, since GSettings cache is broken in GNOME 49)
         * @param settingsRef - optional settings reference (for GLib callbacks where this._settings is lost)
         * @param cacheRef - optional cache reference (for GLib callbacks where this._cache is lost)
         * @param uiRef - optional UI reference (for GLib callbacks where this._ui is lost)
         */
        private _calculatePrayerTimes(
            forceRecalculate: boolean = false,
            settingsRef?: Gio.Settings,
            cacheRef?: typeof this._cache,
            uiRef?: typeof this._ui
        ): void {
            // Use provided references or fall back to this._ (which works in direct calls)
            const settings = settingsRef || this._settings;
            const cache = cacheRef || this._cache;
            const ui = uiRef || this._ui;

            console.log(`[PrayerTimes] _calculatePrayerTimes called, forceRecalculate=${forceRecalculate}, settings=${!!settings}, cache=${!!cache}`);
            if (!settings || !cache) {
                console.log('[PrayerTimes] _calculatePrayerTimes: settings or cache is null/undefined, returning');
                return;
            }

            const today = getTodayString();

            // Skip cache check if forceRecalculate (GSettings cache is broken in GNOME 49)
            if (!forceRecalculate) {
                const cachedDate = settings.get_string('cached-date');
                const cachedTimes = settings.get_string('cached-times');

                // Use cache if available and valid for today
                if (cachedDate === today && cachedTimes) {
                    try {
                        const times = JSON.parse(cachedTimes);
                        this._prayerTimes = times;
                        cache.prayerTimes = times; // Store in shared cache for GLib callbacks
                        console.log('[PrayerTimes] Using cached times for', today);
                        this._updateDisplay(ui, cache);
                        return;
                    } catch (e) {
                        console.error('[PrayerTimes] Cache parse error:', e);
                    }
                }
            }

            // Use local cache reference (not this._cache)
            const latitude = cache.latitude;
            const longitude = cache.longitude;
            const method = cache.method;
            const timezone = getTimezoneOffset();

            console.log(`[PrayerTimes] Calculating for lat=${latitude}, lon=${longitude}, method=${method}, tz=${timezone}`);

            // Calculate prayer times locally
            const times = calculatePrayerTimes(new Date(), latitude, longitude, timezone, method);

            this._prayerTimes = times;
            cache.prayerTimes = times; // Store in shared cache for GLib callbacks
            settings.set_string('cached-times', JSON.stringify(times));
            settings.set_string('cached-date', today);

            console.log('[PrayerTimes] Calculated times:', JSON.stringify(times));
            this._updateDisplay(ui, cache);
        }

        /**
         * Updates panel and menu display
         * Uses cached values from polling to avoid GSettings cache issues
         * @param uiRef - optional UI reference (for GLib callbacks where this._ui is lost)
         * @param cacheRef - optional cache reference (for GLib callbacks where this._cache is lost)
         */
        private _updateDisplay(uiRef?: typeof this._ui, cacheRef?: typeof this._cache): void {
            // Use provided references or fall back to this._ (which works in direct calls)
            const ui = uiRef || this._ui;
            const cache = cacheRef || this._cache;
            // Use prayerTimes from cache (shared with GLib callbacks) with fallback to this._prayerTimes
            const prayerTimes = cache?.prayerTimes || this._prayerTimes;

            console.log(`[PrayerTimes] _updateDisplay() START: ui=${!!ui}, ui.label=${!!ui?.label}, prayerTimes=${!!prayerTimes}`);

            if (!ui?.label || !prayerTimes) {
                console.log(`[PrayerTimes] _updateDisplay() EARLY RETURN: ui.label=${!!ui?.label}, prayerTimes=${!!prayerTimes}`);
                return;
            }

            const nextPrayer = getNextPrayer(prayerTimes);
            // Use cached value from polling (not GSettings which has cache issues)
            const use24h = cache.use24h;
            console.log(`[PrayerTimes] _updateDisplay: use24h=${use24h}, nextPrayer=${nextPrayer.prayer.label} at ${nextPrayer.time}`);

            // Update panel with next prayer
            ui.label.text = `${nextPrayer.prayer.label} ${formatTime(nextPrayer.time, use24h)}`;

            // Get configurable thresholds from cached values
            const thresholds: UrgencyThresholds = {
                orangeMinutes: cache.orangeMinutes,
                redMinutes: cache.redMinutes,
            };

            // Update colored status indicator
            const newStatus = getUrgencyStatus(nextPrayer.time, thresholds);
            if (newStatus !== this._currentStatus) {
                ui.statusDot.remove_style_class_name(`prayer-status-${this._currentStatus}`);
                ui.statusDot.add_style_class_name(`prayer-status-${newStatus}`);
                this._currentStatus = newStatus;
            }

            // Update menu with all prayers (use shared ui.menuItems for GLib callbacks)
            const menuItems = ui.menuItems || this._prayerMenuItems;
            if (menuItems) {
                updateMenuItems(menuItems as Map<string, never>, prayerTimes, use24h);
            }

            console.log(`[PrayerTimes] _updateDisplay() END: label.text="${ui.label.text}"`);
        }

        /**
         * Cleans up resources on destruction
         */
        destroy(): void {
            this._isEnabled = false;

            if (this._updateTimeout) {
                GLib.source_remove(this._updateTimeout);
                this._updateTimeout = null;
            }

            if (this._settingsPollingTimeout) {
                GLib.source_remove(this._settingsPollingTimeout);
                this._settingsPollingTimeout = null;
            }

            super.destroy();
        }
    }
);
