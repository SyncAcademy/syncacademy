import '@angular/compiler';
import { DialogFocusDirective } from '../src/app/shared/directives/dialog-focus.directive';
import { SaEditorComponent } from '../src/app/features/super-admin/components/sa-editor.component';

const results: string[] = [];
const check = (ok: boolean, message: string) => { if (!ok) throw new Error(message); results.push(message); };
async function run() {
  const dialog = document.querySelector('dialog')!;
  const panel = document.querySelector<HTMLElement>('.modal-card')!;
  const opener = document.querySelector<HTMLButtonElement>('#opener')!;
  opener.focus();
  // Use the production directive, inside a clipped and transformed ancestor.
  const editorMode = new URLSearchParams(location.search).has('editor');
  const directive = new DialogFocusDirective({ nativeElement: editorMode ? dialog : panel });
  const editor = new SaEditorComponent(); editor.dialog = { nativeElement: dialog };
  editor.cancelled.subscribe(() => directive.ngOnDestroy());
  dialog.addEventListener('click', event => editorMode ? editor.onDialogClick(event) : directive.ngOnDestroy());
  panel.addEventListener('click', event => event.stopPropagation());
  directive.ngAfterViewInit();
  await new Promise(resolve => setTimeout(resolve, 50));
  check(dialog.matches(':modal'), 'Dialog occupies the native top layer');
  check(document.elementFromPoint(8, 8) === dialog, 'Modal covers the high-z-index header');
  const box = panel.getBoundingClientRect();
  check(box.top >= 0 && box.bottom <= innerHeight, 'Form fits within viewport');
  check(box.left >= 0 && box.right <= innerWidth, 'Form fits the viewport width');
  check(getComputedStyle(dialog, '::backdrop').backdropFilter.includes('blur'), 'Backdrop blurs the page');
  check(getComputedStyle(panel).scrollbarWidth === 'none', 'Scrollbars are hidden');
  check(panel.scrollHeight > panel.clientHeight, 'Long form remains scrollable');
  panel.scrollTop = panel.scrollHeight;
  check(panel.scrollTop > 0, 'Form scroll position can reach lower fields');
  panel.click(); check(dialog.open, 'Clicking inside keeps the form open');
  if (editorMode) {
    editor.busy = true; dialog.click(); check(dialog.open, 'Editor cannot dismiss while saving');
    const escape = new Event('cancel', { cancelable: true }); editor.onCancel(escape);
    check(escape.defaultPrevented && dialog.open, 'Escape respects the save-in-progress guard');
    editor.busy = false;
  }
  dialog.click(); check(!dialog.open, 'Clicking outside closes the form');
  check(document.activeElement === opener, 'Closing restores focus to the opener');
  // Leave it open at the top for screenshot inspection.
  panel.scrollTop = 0; directive.ngAfterViewInit();
}
run().then(() => document.body.dataset['testResult'] = JSON.stringify({ passed: results }))
  .catch(error => document.body.dataset['testResult'] = JSON.stringify({ failed: String(error), passed: results }));
