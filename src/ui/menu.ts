/**
 * Création et gestion du menu popup de l'extension
 * Affiche les 5 prières avec leurs horaires et un bouton Settings
 */

import St from 'gi://St';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import type { PrayerTimes } from '../types/index.js';
import { PRAYERS, formatTime, createIcon } from '../helpers/index.js';

/**
 * Extension du PopupBaseMenuItem pour stocker le label de l'heure
 */
interface PrayerMenuItem extends PopupMenu.PopupBaseMenuItem {
    _timeLabel: St.Label;
    _prayerId: string;
}

/**
 * Crée les éléments de menu pour chaque prière
 * @param menu - Menu popup de l'extension
 * @param extensionPath - Chemin de l'extension (pour les icônes)
 * @returns Map des items indexés par ID de prière
 */
export function createPrayerMenuItems(
    menu: PopupMenu.PopupMenu,
    extensionPath: string
): Map<string, PrayerMenuItem> {
    const items = new Map<string, PrayerMenuItem>();

    for (const prayer of PRAYERS) {
        const item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        }) as PrayerMenuItem;

        // Container principal avec icône et labels
        const box = new St.BoxLayout({ style_class: 'prayer-menu-item-box' });

        // Icône de la prière
        const icon = new St.Icon({
            gicon: createIcon(extensionPath, prayer.icon),
            style_class: 'prayer-menu-icon',
        });
        box.add_child(icon);

        // Container pour nom et heure
        const labelBox = new St.BoxLayout({
            style_class: 'prayer-menu-label-box',
            x_expand: true,
        });

        // Nom de la prière
        const nameLabel = new St.Label({
            text: prayer.label,
            style_class: 'prayer-menu-name',
            x_expand: true,
        });
        labelBox.add_child(nameLabel);

        // Heure de la prière
        const timeLabel = new St.Label({
            text: '--:--',
            style_class: 'prayer-menu-time',
        });
        labelBox.add_child(timeLabel);

        box.add_child(labelBox);

        item.add_child(box);

        // Stocke les références pour mise à jour ultérieure
        item._timeLabel = timeLabel;
        item._prayerId = prayer.id;

        items.set(prayer.id, item);
        menu.addMenuItem(item);
    }

    return items;
}

/**
 * Crée le bouton Settings en bas du menu
 * @param menu - Menu popup de l'extension
 * @param onActivate - Callback appelé au clic
 */
export function createSettingsMenuItem(
    menu: PopupMenu.PopupMenu,
    onActivate: () => void
): void {
    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const settingsItem = new PopupMenu.PopupMenuItem('');

    const settingsBox = new St.BoxLayout({ style_class: 'prayer-menu-item-box' });

    const settingsIcon = new St.Icon({
        icon_name: 'emblem-system-symbolic',
        style_class: 'prayer-menu-icon',
    });
    settingsBox.add_child(settingsIcon);

    const settingsLabel = new St.Label({
        text: 'Settings',
        style_class: 'prayer-menu-name',
    });
    settingsBox.add_child(settingsLabel);

    settingsItem.remove_child(settingsItem.label);
    settingsItem.add_child(settingsBox);

    settingsItem.connect('activate', () => {
        menu.close();
        onActivate();
    });
    menu.addMenuItem(settingsItem);
}

/**
 * Met à jour les horaires affichés dans le menu
 * @param items - Map des items de menu
 * @param prayerTimes - Horaires à afficher
 * @param use24h - Format 24h ou AM/PM
 */
export function updateMenuItems(
    items: Map<string, PrayerMenuItem>,
    prayerTimes: PrayerTimes,
    use24h: boolean
): void {
    for (const prayer of PRAYERS) {
        const item = items.get(prayer.id);
        if (!item) continue;

        const time = prayerTimes[prayer.id];
        item._timeLabel.text = formatTime(time, use24h);
    }
}
