// src/lib/app/confirm.svelte.js
// "Are you sure?" dialog. `await confirm({...})` resolves true when the user confirms.
// The dialog itself is rendered once by AppShell, see `ui/ConfirmDialog.svelte`.

/** @typedef {{title: string, message: string, confirmLabel?: string}} ConfirmRequest */

class ConfirmState {
  /** @type {(ConfirmRequest & {resolve: (confirmed: boolean) => void}) | null} */
  request = $state(null);

  /** @param {ConfirmRequest} request @returns {Promise<boolean>} */
  ask(request) {
    this.request?.resolve(false);
    return new Promise((resolve) => (this.request = { ...request, resolve }));
  }

  /** @param {boolean} confirmed */
  answer(confirmed) {
    this.request?.resolve(confirmed);
    this.request = null;
  }
}

export const confirmState = new ConfirmState();

/** @param {ConfirmRequest} request */
export const confirm = (request) => confirmState.ask(request);

/** Marks dialogs, so "click outside" handlers of other elements ignore clicks on them. */
export const DIALOG_ATTRIBUTE = 'data-dialog';

/** True if the event happened inside the dialog. @param {Event} event */
export function isInDialog(event) {
  return event.composedPath().some((node) => node instanceof Element && node.hasAttribute(DIALOG_ATTRIBUTE));
}
