/**
 * Page de préférences de l'extension
 * Permet de configurer la localisation et le format d'affichage
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { CALCULATION_METHODS, COLOR_THEMES, MENU_BACKGROUNDS, searchCities } from '../helpers/index.js';

/**
 * Classe principale des préférences
 * Crée les pages Location et Display
 */
export default class PrayerTimesPreferences extends ExtensionPreferences {
    private _httpSession: Soup.Session | null = null;
    private _searchTimeout: number | null = null;

    fillPreferencesWindow(window: Adw.PreferencesWindow): void {
        this._httpSession = new Soup.Session();
        const settings = this.getSettings();

        this._createLocationPage(window, settings);
        this._createDisplayPage(window, settings);

        // Nettoie les ressources à la fermeture
        window.connect('close-request', () => {
            if (this._searchTimeout) {
                GLib.source_remove(this._searchTimeout);
                this._searchTimeout = null;
            }
            this._httpSession = null;
            return false;
        });
    }

    /**
     * Page Location : ville et méthode de calcul
     */
    private _createLocationPage(window: Adw.PreferencesWindow, settings: Gio.Settings): void {
        const page = new Adw.PreferencesPage({
            title: 'Location',
            icon_name: 'find-location-symbolic',
        });
        window.add(page);

        // Groupe pour la recherche de ville
        const locationGroup = new Adw.PreferencesGroup({
            title: 'Location',
            description: 'Search for your city',
        });
        page.add(locationGroup);

        const cityRow = this._createCityAutocompleteRow(settings);
        locationGroup.add(cityRow);

        // Groupe pour la méthode de calcul
        const methodGroup = new Adw.PreferencesGroup({
            title: 'Calculation Method',
        });
        page.add(methodGroup);

        const methodRow = this._createMethodRow(settings);
        methodGroup.add(methodRow);
    }

    /**
     * Page Display : format de l'heure et thème
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

        // Groupe pour l'apparence
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance',
        });
        page.add(appearanceGroup);

        const themeRow = this._createThemeRow(settings);
        appearanceGroup.add(themeRow);

        const backgroundRow = this._createBackgroundRow(settings);
        appearanceGroup.add(backgroundRow);
    }

    /**
     * Crée le sélecteur de thème de couleur
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
     * Crée le sélecteur de fond du menu
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
     * Crée le sélecteur de méthode de calcul
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
     * Crée le champ d'auto-complétion de ville
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

        // Header avec titre et ville actuelle
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

        // Champ de recherche
        const searchEntry = new Gtk.SearchEntry({
            placeholder_text: 'Search for a city...',
            hexpand: true,
        });
        box.append(searchEntry);

        // Liste des résultats
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
     * Gère les changements dans le champ de recherche
     */
    private _handleSearchChanged(
        searchEntry: Gtk.SearchEntry,
        listBox: Gtk.ListBox,
        settings: Gio.Settings,
        currentLabel: Gtk.Label
    ): void {
        const query = searchEntry.text;

        // Annule la recherche précédente si en cours
        if (this._searchTimeout) {
            GLib.source_remove(this._searchTimeout);
            this._searchTimeout = null;
        }

        if (query.length < 2) {
            listBox.visible = false;
            return;
        }

        // Debounce : attend 500ms avant de lancer la recherche
        this._searchTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._performSearch(query, listBox, settings, currentLabel, searchEntry);
            this._searchTimeout = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Exécute la recherche de ville
     */
    private _performSearch(
        query: string,
        listBox: Gtk.ListBox,
        settings: Gio.Settings,
        currentLabel: Gtk.Label,
        searchEntry: Gtk.SearchEntry
    ): void {
        if (!this._httpSession) return;

        searchCities(this._httpSession, query, (results) => {
            // Vide la liste
            while (listBox.get_first_child()) {
                listBox.remove(listBox.get_first_child()!);
            }

            if (results.length > 0) {
                for (const city of results) {
                    const cityRow = new Adw.ActionRow({
                        title: city.name,
                        activatable: true,
                    });

                    cityRow.connect('activated', () => {
                        // Sauvegarde la ville sélectionnée
                        settings.set_string('city', city.name);
                        settings.set_string('country', city.country);
                        // Invalide le cache
                        settings.set_string('cached-date', '');
                        settings.set_string('cached-times', '');

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
        });
    }
}
