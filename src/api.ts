import { TFile, TFolder } from 'obsidian';
import type FolderNotesPlugin from './main';
import { getFolderNote, turnIntoFolderNote } from './functions/folderNoteFunctions';

export interface ConvertNoteToFolderNoteOptions {
	skipConfirmation?: boolean;
}

export interface FolderNotesApi {
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

export class FolderNotesPublicApi implements FolderNotesApi {
	constructor(private readonly plugin: FolderNotesPlugin) {}

	async convertNoteToFolderNote(
		notePath: string,
		options: ConvertNoteToFolderNoteOptions = {},
	): Promise<void> {
		const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
		if (!(file instanceof TFile)) {
			throw new FolderNotesApiPathError(`No note exists at path: ${notePath}`, notePath);
		}

		const folder = file.parent;
		if (!(folder instanceof TFolder) || folder.path === '' || folder.path === '/') {
			throw new FolderNotesApiPathError(`Note must be inside a folder: ${notePath}`, notePath);
		}

		const folderNote = getFolderNote(this.plugin, folder.path);
		if (folderNote === file) return;

		await turnIntoFolderNote(
			this.plugin,
			file,
			folder,
			folderNote,
			options.skipConfirmation ?? true,
		);
	}
}
