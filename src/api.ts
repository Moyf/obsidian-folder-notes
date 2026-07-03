import { TFile, TFolder } from 'obsidian';
import type FolderNotesPlugin from './main';
import { getFolderNote, turnIntoFolderNote } from './functions/folderNoteFunctions';
import { getDetachedFolder, getExcludedFolder } from './ExcludeFolders/functions/folderFunctions';

const API_VERSION = '1.0.0';

export interface ConvertNoteToFolderNoteOptions {
	skipConfirmation?: boolean;
}

/**
 * Public API exposed by the folder-notes plugin on its instance as `plugin.api`.
 *
 * External plugins can access it via:
 *   app.plugins.plugins['folder-notes']?.api
 *
 * The API is available after folder-notes has finished onload (settings loaded).
 */
export interface FolderNotesApi {
	/** Semver-ish version string for feature detection. */
	version: string;

	/**
	 * Returns the folder note TFile for the given folder path only if the
	 * folder's note is enabled — i.e., the folder is not detached and not
	 * excluded with `disableFolderNote`. Matches the plugin's own UI
	 * gating (the rules that decide whether `.has-folder-note` gets
	 * applied in the file explorer).
	 *
	 * Returns null if:
	 *   - the folder does not exist or has no folder note
	 *   - the folder is detached
	 *   - the folder is excluded with disableFolderNote
	 */
	getEnabledFolderNote(folderPath: string): TFile | null;

	/**
	 * Converts an existing note into the folder note for its parent folder.
	 * Throws FolderNotesApiPathError if the path does not point to a note
	 * inside a non-root folder.
	 */
	convertNoteToFolderNote(notePath: string, options?: ConvertNoteToFolderNoteOptions): Promise<void>;
}

export class FolderNotesApiPathError extends Error {
	constructor(
		message: string,
		readonly notePath: string,
	) {
		super(message);
		this.name = 'FolderNotesApiPathError';
	}
}

export function getApi(plugin: FolderNotesPlugin): FolderNotesApi {
	return {
		version: API_VERSION,
		getEnabledFolderNote: (folderPath) => getEnabledFolderNote(plugin, folderPath),
		convertNoteToFolderNote: (notePath, options) => convertNoteToFolderNote(plugin, notePath, options),
	};
}

function getEnabledFolderNote(plugin: FolderNotesPlugin, folderPath: string): TFile | null {
	const note = getFolderNote(plugin, folderPath);
	if (!note) return null;
	if (getDetachedFolder(plugin, folderPath)) return null;
	const excluded = getExcludedFolder(plugin, folderPath, true);
	if (excluded?.disableFolderNote) return null;
	return note;
}

async function convertNoteToFolderNote(
	plugin: FolderNotesPlugin,
	notePath: string,
	options: ConvertNoteToFolderNoteOptions = {},
): Promise<void> {
	const file = plugin.app.vault.getAbstractFileByPath(notePath);
	if (!(file instanceof TFile)) {
		throw new FolderNotesApiPathError(`No note exists at path: ${notePath}`, notePath);
	}

	const folder = file.parent;
	if (!(folder instanceof TFolder) || folder.path === '' || folder.path === '/') {
		throw new FolderNotesApiPathError(`Note must be inside a folder: ${notePath}`, notePath);
	}

	const folderNote = getFolderNote(plugin, folder.path);
	if (folderNote === file) return;

	await turnIntoFolderNote(
		plugin,
		file,
		folder,
		folderNote,
		options.skipConfirmation ?? true,
	);
}
