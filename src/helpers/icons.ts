/**
 * Utilitaires pour la gestion des icônes
 */

import Gio from 'gi://Gio';

/**
 * Crée un GIcon à partir du nom d'une icône de l'extension
 * @param extensionPath - Chemin de l'extension
 * @param iconName - Nom de l'icône (sans extension .svg)
 */
export function createIcon(extensionPath: string, iconName: string): Gio.Icon {
    return Gio.icon_new_for_string(`${extensionPath}/icons/${iconName}.svg`);
}
