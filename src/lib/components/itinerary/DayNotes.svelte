<script lang="ts">
	import type { DayNote } from '$lib/types/travel';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { generateItemId } from '$lib/utils/ids';

	interface Props {
		notes: DayNote[];
		isEditing?: boolean;
		onAdd?: (note: DayNote) => void;
		onUpdate?: (noteId: string, content: string) => void;
		onDelete?: (noteId: string) => void;
	}

	let { 
		notes = [], 
		isEditing = false, 
		onAdd, 
		onUpdate, 
		onDelete 
	}: Props = $props();

	let addingNote = $state(false);
	let newNoteContent = $state('');
	let editingNoteId = $state<string | null>(null);
	let editingContent = $state('');

	function startAddNote() {
		newNoteContent = '';
		addingNote = true;
	}

	function cancelAddNote() {
		addingNote = false;
		newNoteContent = '';
	}

	function saveNewNote() {
		if (!newNoteContent.trim() || !onAdd) return;
		
		const note: DayNote = {
			id: generateItemId(),
			content: newNoteContent.trim(),
			createdAt: new Date().toISOString()
		};
		
		onAdd(note);
		cancelAddNote();
	}

	function startEditNote(note: DayNote) {
		editingNoteId = note.id;
		editingContent = note.content;
	}

	function cancelEditNote() {
		editingNoteId = null;
		editingContent = '';
	}

	function saveEditNote() {
		if (!editingNoteId || !editingContent.trim() || !onUpdate) return;
		onUpdate(editingNoteId, editingContent.trim());
		cancelEditNote();
	}

	function handleDeleteNote(noteId: string) {
		if (onDelete) {
			onDelete(noteId);
		}
	}

	function handleKeydown(e: KeyboardEvent, action: 'add' | 'edit') {
		if (e.key === 'Escape') {
			if (action === 'add') cancelAddNote();
			else cancelEditNote();
		}
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			if (action === 'add') saveNewNote();
			else saveEditNote();
		}
	}
</script>

<div class="day-notes">
	{#if notes.length > 0 || isEditing}
		<div class="notes-header">
			<Icon name="notes" size={14} />
			<span>Day Notes</span>
		</div>
	{/if}

	{#if notes.length > 0}
		<div class="notes-list">
			{#each notes as note (note.id)}
				{#if editingNoteId === note.id}
					<!-- Editing existing note -->
					<div class="note-editor">
						<textarea
							bind:value={editingContent}
							onkeydown={(e) => handleKeydown(e, 'edit')}
							placeholder="Write your note..."
							rows="2"
							class="note-input"
						></textarea>
						<div class="editor-actions">
							<button type="button" class="btn-save" onclick={saveEditNote}>
								Save
							</button>
							<button type="button" class="btn-cancel" onclick={cancelEditNote}>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<!-- Display note -->
					<div class="note-item">
						<div class="note-content">{note.content}</div>
						{#if isEditing}
							<div class="note-actions">
								<button 
									type="button" 
									class="action-btn" 
									onclick={() => startEditNote(note)}
									title="Edit note"
								>
									<Icon name="edit" size={12} />
								</button>
								<button 
									type="button" 
									class="action-btn delete" 
									onclick={() => handleDeleteNote(note.id)}
									title="Delete note"
								>
									<Icon name="delete" size={12} />
								</button>
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	{#if addingNote}
		<!-- Adding new note -->
		<div class="note-editor">
			<textarea
				bind:value={newNoteContent}
				onkeydown={(e) => handleKeydown(e, 'add')}
				placeholder="Write a note for this day... (reminders, tips, things to remember)"
				rows="2"
				class="note-input"
			></textarea>
			<div class="editor-actions">
				<button type="button" class="btn-save" onclick={saveNewNote}>
					Add Note
				</button>
				<button type="button" class="btn-cancel" onclick={cancelAddNote}>
					Cancel
				</button>
			</div>
		</div>
	{:else if isEditing && onAdd}
		<button type="button" class="add-note-btn" onclick={startAddNote}>
			<Icon name="add" size={14} />
			Add a note for this day
		</button>
	{/if}
</div>

<style>
	.day-notes {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.notes-header {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.notes-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.note-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--surface-secondary);
		border-radius: var(--radius-md);
		border-left: 3px solid var(--color-info);
	}

	.note-content {
		flex: 1;
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.5;
		white-space: pre-wrap;
	}

	.note-actions {
		display: flex;
		gap: var(--space-1);
		opacity: 0.5;
		transition: opacity var(--transition-fast);
	}

	.note-item:hover .note-actions {
		opacity: 1;
	}

	.action-btn {
		background: none;
		border: none;
		padding: 4px;
		color: var(--text-tertiary);
		cursor: pointer;
		border-radius: var(--radius-sm);

		&:hover {
			background: var(--surface-tertiary);
			color: var(--text-primary);
		}

		&.delete:hover {
			color: var(--color-error);
		}
	}

	.note-editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.note-input {
		width: 100%;
		padding: var(--space-2);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-family: inherit;
		resize: vertical;
		min-height: 60px;
		background: var(--surface-primary);
		color: var(--text-primary);

		&:focus {
			outline: none;
			border-color: var(--color-primary);
		}
	}

	.editor-actions {
		display: flex;
		gap: var(--space-2);
		justify-content: flex-end;
	}

	.btn-save,
	.btn-cancel {
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		cursor: pointer;
		border: none;
	}

	.btn-save {
		background: var(--color-primary);
		color: white;

		&:hover {
			background: var(--color-primary-dark);
		}
	}

	.btn-cancel {
		background: var(--surface-secondary);
		color: var(--text-secondary);

		&:hover {
			background: var(--surface-tertiary);
		}
	}

	.add-note-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		background: none;
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		color: var(--text-tertiary);
		cursor: pointer;
		width: 100%;
		justify-content: center;

		&:hover {
			border-color: var(--color-primary);
			color: var(--color-primary);
			background: color-mix(in oklch, var(--color-primary), transparent 95%);
		}
	}
</style>
