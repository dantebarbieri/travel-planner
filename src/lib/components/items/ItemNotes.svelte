<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		notes?: string;
		placeholder?: string;
		isEditing?: boolean;
		onSave?: (notes: string) => void;
	}

	let { notes = '', placeholder = 'Add notes...', isEditing = false, onSave }: Props = $props();

	let editMode = $state(false);
	let editValue = $state('');

	// Sync editValue when notes prop changes (reactive to notes)
	$effect(() => {
		if (!editMode) {
			editValue = notes;
		}
	});

	function startEdit() {
		editValue = notes;
		editMode = true;
	}

	function saveNotes() {
		if (onSave) {
			onSave(editValue.trim());
		}
		editMode = false;
	}

	function cancelEdit() {
		editValue = notes;
		editMode = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			cancelEdit();
		}
		// Cmd/Ctrl+Enter to save
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			saveNotes();
		}
	}
</script>

{#if editMode}
	<div class="notes-editor">
		<textarea
			bind:value={editValue}
			onkeydown={handleKeydown}
			{placeholder}
			rows="3"
			class="notes-input"
		></textarea>
		<div class="editor-actions">
			<button type="button" class="btn-save" onclick={saveNotes}>
				Save
			</button>
			<button type="button" class="btn-cancel" onclick={cancelEdit}>
				Cancel
			</button>
		</div>
	</div>
{:else if notes}
	<div class="notes-display">
		<div class="notes-content">
			<Icon name="notes" size={12} />
			<span>{notes}</span>
		</div>
		{#if isEditing && onSave}
			<button type="button" class="edit-btn" onclick={startEdit} title="Edit notes">
				<Icon name="edit" size={12} />
			</button>
		{/if}
	</div>
{:else if isEditing && onSave}
	<button type="button" class="add-notes-btn" onclick={startEdit}>
		<Icon name="add" size={12} />
		{placeholder}
	</button>
{/if}

<style>
	.notes-editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.notes-input {
		width: 100%;
		padding: var(--space-2);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
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

	.notes-display {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		margin-top: var(--space-2);
		padding: var(--space-2);
		background: var(--surface-secondary);
		border-radius: var(--radius-sm);
	}

	.notes-content {
		flex: 1;
		display: flex;
		gap: var(--space-1);
		font-size: 0.8125rem;
		color: var(--text-secondary);
		font-style: italic;
		line-height: 1.4;
	}

	.edit-btn {
		background: none;
		border: none;
		padding: 2px;
		color: var(--text-tertiary);
		cursor: pointer;
		opacity: 0.6;

		&:hover {
			opacity: 1;
			color: var(--color-primary);
		}
	}

	.add-notes-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		margin-top: var(--space-2);
		padding: var(--space-1) var(--space-2);
		background: none;
		border: 1px dashed var(--border-color);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		color: var(--text-tertiary);
		cursor: pointer;

		&:hover {
			border-color: var(--color-primary);
			color: var(--color-primary);
		}
	}
</style>
