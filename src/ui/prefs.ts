/**
 * Extension preferences page
 * Allows configuring location and display format
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { CALCULATION_METHODS, COLOR_THEMES, MENU_BACKGROUNDS, searchCities } from '../helpers/index.js';

/**
 * Main preferences class
 * Creates Location and Display pages
 */
export default class PrayerTimesPreferences extends ExtensionPreferences {
    private _httpSession: Soup.Session | null = null;
    private _searchTimeout: number | null = null;

    fillPreferencesWindow(window: Adw.PreferencesWindow): void {
        const self = this;
        this._httpSession = new Soup.Session();
        const settings = this.getSettings();

        this._createLocationPage(window, settings);
        this._createDisplayPage(window, settings);

        // Clean up resources on close
        window.connect('close-request', () => {
            if (self._searchTimeout) {
                GLib.source_remove(self._searchTimeout);
                self._searchTimeout = null;
            }
            self._httpSession = null;
            return false;
        });
    }

    /**
     * Location page: city and calculation method
     */
    private _createLocationPage(window: Adw.PreferencesWindow, settings: Gio.Settings): void {
        const page = new Adw.PreferencesPage({
            title: 'Location',
            icon_name: 'find-location-symbolic',
        });
        window.add(page);

        // City search group
        const locationGroup = new Adw.PreferencesGroup({
            title: 'Location',
            description: 'Search for your city',
        });
        page.add(locationGroup);

        const cityRow = this._createCityAutocompleteRow(settings);
        locationGroup.add(cityRow);

        // Calculation method group
        const methodGroup = new Adw.PreferencesGroup({
            title: 'Calculation Method',
        });
        page.add(methodGroup);

        const methodRow = this._createMethodRow(settings);
        methodGroup.add(methodRow);
    }

    /**
     * Display page: time format and theme
     */
    private _createDisplayPage(window: Adw.PreferencesWindow, settings: Gio.Settings): void {
        const page = new Adw.PreferencesPage({
            title: 'Display',
            icon_name: 'preferences-desktop-display-symbolic',
        });
        window.add(page);

        const formatGroup = new Adw.PreferencesGroup({
            title: 'Time Format',
        });
        page.add(formatGroup);

        const formatRow = new Adw.SwitchRow({
            title: '24-hour format',
            subtitle: 'Use 24-hour time format instead of AM/PM',
        });
        formatRow.active = settings.get_boolean('use-24h-format');

        formatRow.connect('notify::active', () => {
            settings.set_boolean('use-24h-format', formatRow.active);
        });

        formatGroup.add(formatRow);

        // Appearance group
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance',
        });
        page.add(appearanceGroup);

        const themeRow = this._createThemeRow(settings);
        appearanceGroup.add(themeRow);

        const backgroundRow = this._createBackgroundRow(settings);
        appearanceGroup.add(backgroundRow);

        // Urgency thresholds group
        const urgencyGroup = new Adw.PreferencesGroup({
            title: 'Urgency Indicator',
            description: 'Configure when the status dot changes color',
        });
        page.add(urgencyGroup);

        const orangeOptions = [15, 20, 30, 45, 60, 90, 120];
        const redOptions = [5, 10, 15, 20, 30, 45, 60];

        const orangeRow = this._createThresholdRow(
            settings,
            'urgency-orange-minutes',
            'Orange threshold',
            'Minutes before prayer to show orange',
            orangeOptions
        );
        urgencyGroup.add(orangeRow);

        const redRow = this._createThresholdRow(
            settings,
            'urgency-red-minutes',
            'Red threshold',
            'Minutes before prayer to show red',
            redOptions
        );
        urgencyGroup.add(redRow);

        // Cross-validation: red must be < orange
        orangeRow.connect('notify::selected', () => {
            const orangeValue = orangeOptions[orangeRow.selected];
            const redValue = settings.get_int('urgency-red-minutes');
            if (redValue >= orangeValue) {
                const newRedValue = redOptions.filter((v) => v < orangeValue).pop() || redOptions[0];
                settings.set_int('urgency-red-minutes', newRedValue);
                const newIndex = redOptions.indexOf(newRedValue);
                if (newIndex >= 0) redRow.selected = newIndex;
            }
        });

        redRow.connect('notify::selected', () => {
            const redValue = redOptions[redRow.selected];
            const orangeValue = settings.get_int('urgency-orange-minutes');
            if (redValue >= orangeValue) {
                const newOrangeValue = orangeOptions.filter((v) => v > redValue)[0] || orangeOptions[orangeOptions.length - 1];
                settings.set_int('urgency-orange-minutes', newOrangeValue);
                const newIndex = orangeOptions.indexOf(newOrangeValue);
                if (newIndex >= 0) orangeRow.selected = newIndex;
            }
        });
    }

    /**
     * Creates a threshold selector in minutes
     */
    private _createThresholdRow(
        settings: Gio.Settings,
        key: string,
        title: string,
        subtitle: string,
        options: number[]
    ): Adw.ComboRow {
        const model = new Gtk.StringList();
        for (const minutes of options) {
            model.append(`${minutes} min`);
        }

        const row = new Adw.ComboRow({
            title: title,
            subtitle: subtitle,
            model: model,
        });

        const currentValue = settings.get_int(key);
        const currentIndex = options.indexOf(currentValue);
        if (currentIndex >= 0) {
            row.selected = currentIndex;
        }

        row.connect('notify::selected', () => {
            const selectedValue = options[row.selected];
            if (selectedValue !== undefined) {
                settings.set_int(key, selectedValue);
            }
        });

        return row;
    }

    /**
     * Creates the color theme selector
     */
    private _createThemeRow(settings: Gio.Settings): Adw.ComboRow {
        const themeModel = new Gtk.StringList();
        for (const theme of COLOR_THEMES) {
            themeModel.append(theme.name);
        }

        const row = new Adw.ComboRow({
            title: 'Accent Color',
            subtitle: 'Color for the prayer times',
            model: themeModel,
        });

        const currentTheme = settings.get_string('color-theme');
        const themeIndex = COLOR_THEMES.findIndex((t) => t.id === currentTheme);
        if (themeIndex >= 0) {
            row.selected = themeIndex;
        }

        row.connect('notify::selected', () => {
            const selectedTheme = COLOR_THEMES[row.selected];
            if (selectedTheme) {
                settings.set_string('color-theme', selectedTheme.id);
            }
        });

        return row;
    }

    /**
     * Creates the menu background selector
     */
    private _createBackgroundRow(settings: Gio.Settings): Adw.ComboRow {
        const bgModel = new Gtk.StringList();
        for (const bg of MENU_BACKGROUNDS) {
            bgModel.append(bg.name);
        }

        const row = new Adw.ComboRow({
            title: 'Menu Background',
            subtitle: 'Background color of the dropdown menu',
            model: bgModel,
        });

        const currentBg = settings.get_string('menu-background');
        const bgIndex = MENU_BACKGROUNDS.findIndex((b) => b.id === currentBg);
        if (bgIndex >= 0) {
            row.selected = bgIndex;
        }

        row.connect('notify::selected', () => {
            const selectedBg = MENU_BACKGROUNDS[row.selected];
            if (selectedBg) {
                settings.set_string('menu-background', selectedBg.id);
            }
        });

        return row;
    }

    /**
     * Creates the calculation method selector
     */
    private _createMethodRow(settings: Gio.Settings): Adw.ComboRow {
        const methodModel = new Gtk.StringList();
        for (const method of CALCULATION_METHODS) {
            methodModel.append(method.name);
        }

        const row = new Adw.ComboRow({
            title: 'Method',
            model: methodModel,
        });

        const currentMethod = settings.get_int('calculation-method');
        const methodIndex = CALCULATION_METHODS.findIndex((m) => m.id === currentMethod);
        if (methodIndex >= 0) {
            row.selected = methodIndex;
        }

        row.connect('notify::selected', () => {
            const selectedMethod = CALCULATION_METHODS[row.selected];
            if (selectedMethod) {
                settings.set_int('calculation-method', selectedMethod.id);
            }
        });

        return row;
    }

    /**
     * Creates the city autocomplete field
     */
    private _createCityAutocompleteRow(settings: Gio.Settings): Adw.PreferencesRow {
        const row = new Adw.PreferencesRow();

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        // Header with title and current city
        const headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
        });

        const titleLabel = new Gtk.Label({
            label: 'City',
            halign: Gtk.Align.START,
            hexpand: true,
        });
        headerBox.append(titleLabel);

        const currentCity = settings.get_string('city');
        const currentLabel = new Gtk.Label({
            label: currentCity || 'Not set',
            css_classes: ['dim-label'],
        });
        headerBox.append(currentLabel);

        box.append(headerBox);

        // Search field
        const searchEntry = new Gtk.SearchEntry({
            placeholder_text: 'Search for a city...',
            hexpand: true,
        });
        box.append(searchEntry);

        // Results list
        const resultsListBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.SINGLE,
            css_classes: ['boxed-list'],
            visible: false,
        });
        box.append(resultsListBox);

        searchEntry.connect('search-changed', () => {
            this._handleSearchChanged(searchEntry, resultsListBox, settings, currentLabel);
        });

        row.set_child(box);
        return row;
    }

    /**
     * Handles search field changes
     */
    private _handleSearchChanged(
        searchEntry: Gtk.SearchEntry,
        listBox: Gtk.ListBox,
        settings: Gio.Settings,
        currentLabel: Gtk.Label
    ): void {
        const self = this;
        const query = searchEntry.text;

        // Cancel previous search if in progress
        if (this._searchTimeout) {
            GLib.source_remove(this._searchTimeout);
            this._searchTimeout = null;
        }

        if (query.length < 2) {
            listBox.visible = false;
            return;
        }

        // Debounce: wait 500ms before searching
        this._searchTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            self._performSearch(query, listBox, settings, currentLabel, searchEntry);
            self._searchTimeout = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Performs city search
     */
    private _performSearch(
        query: string,
        listBox: Gtk.ListBox,
        settings: Gio.Settings,
        currentLabel: Gtk.Label,
        searchEntry: Gtk.SearchEntry
    ): void {
        const self = this;
        if (!this._httpSession) return;

        searchCities(this._httpSession, query, (results) => {
            // Guard: window may have been closed during async request
            if (!self._httpSession) return;

            try {
                // Clear the list
                while (listBox.get_first_child()) {
                    listBox.remove(listBox.get_first_child()!);
                }

                if (results.length > 0) {
                    for (const city of results) {
                        const subtitle = [city.admin2, city.country]
                            .filter(Boolean)
                            .join(', ');

                        const cityRow = new Adw.ActionRow({
                            title: city.name,
                            subtitle: subtitle,
                            activatable: true,
                        });

                        cityRow.connect('activated', () => {
                            // Save selected city with coordinates
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const s = settings as any;
                            s.set_string('city', city.name);
                            s.set_string('country', city.country);
                            s.set_double('latitude', city.latitude);
                            s.set_double('longitude', city.longitude);
                            // Invalidate cache
                            s.set_string('cached-date', '');
                            s.set_string('cached-times', '');

                            currentLabel.label = city.name;
                            searchEntry.text = '';
                            listBox.visible = false;
                        });

                        listBox.append(cityRow);
                    }
                    listBox.visible = true;
                } else {
                    listBox.visible = false;
                }
            } catch (e) {
                // Widget may have been destroyed during async request
                console.log('[PrayerTimes Prefs] Search callback ignored: widget destroyed');
            }
        });
    }
}
