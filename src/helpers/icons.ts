/**
 * Icon management utilities
 */

import Gio from 'gi://Gio';

/**
 * Creates a GIcon from an extension icon name
 * @param extensionPath - Extension path
 * @param iconName - Icon name (without .svg extension)
 */
export function createIcon(extensionPath: string, iconName: string): Gio.Icon {
    return Gio.icon_new_for_string(`${extensionPath}/icons/${iconName}.svg`);
}
