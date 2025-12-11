/**
 * Extension popup menu creation and management
 * Displays 5 prayers with times and a Settings button
 */

import St from 'gi://St';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import type { PrayerTimes } from '../types/index.js';
import { PRAYERS, formatTime, createIcon } from '../helpers/index.js';

/**
 * Extended PopupBaseMenuItem to store time label
 */
interface PrayerMenuItem extends PopupMenu.PopupBaseMenuItem {
    _timeLabel: St.Label;
    _prayerId: string;
}

/**
 * Creates menu items for each prayer
 * @param menu - Extension popup menu
 * @param extensionPath - Extension path (for icons)
 * @returns Map of items indexed by prayer ID
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

        // Main container with icon and labels
        const box = new St.BoxLayout({ style_class: 'prayer-menu-item-box' });

        // Prayer icon
        const icon = new St.Icon({
            gicon: createIcon(extensionPath, prayer.icon),
            style_class: 'prayer-menu-icon',
        });
        box.add_child(icon);

        // Container for name and time
        const labelBox = new St.BoxLayout({
            style_class: 'prayer-menu-label-box',
            x_expand: true,
        });

        // Prayer name
        const nameLabel = new St.Label({
            text: prayer.label,
            style_class: 'prayer-menu-name',
            x_expand: true,
        });
        labelBox.add_child(nameLabel);

        // Prayer time
        const timeLabel = new St.Label({
            text: '--:--',
            style_class: 'prayer-menu-time',
        });
        labelBox.add_child(timeLabel);

        box.add_child(labelBox);

        item.add_child(box);

        // Store references for later updates
        item._timeLabel = timeLabel;
        item._prayerId = prayer.id;

        items.set(prayer.id, item);
        menu.addMenuItem(item);
    }

    return items;
}

/**
 * Creates the Settings button at menu bottom
 * @param menu - Extension popup menu
 * @param onActivate - Callback called on click
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
 * Updates displayed times in menu
 * @param items - Map of menu items
 * @param prayerTimes - Times to display
 * @param use24h - 24h or AM/PM format
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
