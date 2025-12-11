/**
 * Indicateur du panel GNOME Shell
 * Affiche la prochaine prière dans la barre supérieure
 */

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Soup from 'gi://Soup?version=3.0';
import Clutter from 'gi://Clutter';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import type { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import type { PrayerTimes } from '../types/index.js';
import type { UrgencyStatus } from '../helpers/time.js';
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
 * Indicateur affiché dans le panel GNOME Shell
 * - Affiche la prochaine prière dans la barre supérieure
 * - Menu déroulant avec toutes les prières du jour
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

            // Écoute les changements de settings pour rafraîchir
            this._settingsChangedId = this._settings.connect('changed', () => {
                this._fetchPrayerTimes();
                this._applyTheme();
            });

            this._fetchPrayerTimes();
            this._startUpdateLoop();
        }

        /**
         * Crée le bouton affiché dans le panel
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
         * Crée le menu déroulant
         */
        private _createMenu(): void {
            this._prayerMenuItems = createPrayerMenuItems(this.menu, this._extensionPath);
            createSettingsMenuItem(this.menu, () => {
                this._extension.openPreferences();
            });
            this._applyTheme();
        }

        /**
         * Applique le thème de couleur et le fond sur le menu
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
         * Démarre la boucle de mise à jour périodique
         */
        private _startUpdateLoop(): void {
            this._updateTimeout = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                UPDATE_INTERVAL_SECONDS,
                () => {
                    this._updateDisplay();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        /**
         * Récupère les horaires de prière (cache ou API)
         */
        private _fetchPrayerTimes(): void {
            const city = this._settings.get_string('city') || '';
            const country = this._settings.get_string('country') || '';
            const method = this._settings.get_int('calculation-method');
            const today = getTodayString();
            const cachedDate = this._settings.get_string('cached-date');
            const cachedTimes = this._settings.get_string('cached-times');

            // Utilise le cache si disponible et valide
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
                    this._prayerTimes = times;
                    this._settings.set_string('cached-times', JSON.stringify(times));
                    this._settings.set_string('cached-date', today);
                    this._updateDisplay();
                } else {
                    console.error('[PrayerTimes] Fetch error:', error);
                    this._showError(error || 'Error');
                }
            });
        }

        /**
         * Met à jour l'affichage du panel et du menu
         */
        private _updateDisplay(): void {
            if (!this._prayerTimes) {
                this._label.text = 'Loading...';
                return;
            }

            const nextPrayer = getNextPrayer(this._prayerTimes);
            const use24h = this._settings.get_boolean('use-24h-format');

            // Met à jour le panel avec la prochaine prière
            this._label.text = `${nextPrayer.prayer.label} ${formatTime(nextPrayer.time, use24h)}`;

            // Met à jour l'indicateur de statut coloré
            const newStatus = getUrgencyStatus(nextPrayer.time);
            if (newStatus !== this._currentStatus) {
                this._statusDot.remove_style_class_name(`prayer-status-${this._currentStatus}`);
                this._statusDot.add_style_class_name(`prayer-status-${newStatus}`);
                this._currentStatus = newStatus;
            }

            // Met à jour le menu avec toutes les prières
            updateMenuItems(
                this._prayerMenuItems as Map<string, never>,
                this._prayerTimes,
                use24h
            );
        }

        /**
         * Affiche un message d'erreur dans le panel
         */
        private _showError(message: string): void {
            this._label.text = message;
        }

        /**
         * Nettoie les ressources à la destruction
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
