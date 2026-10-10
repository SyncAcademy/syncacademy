import { requestId } from '../../core/services/request-id';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistrarStore } from './registrar.store';
import { IMPORT_FIELDS, suggestMapping, parseCsv, importDate, downloadCsv } from './import-utils';

@Component({ selector: 'app-student-import', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './student-import.page.html', styleUrls: ['./registrar.page.scss', './student-import.page.scss'] })
export class StudentImportPage {
  readonly store = inject(RegistrarStore); readonly api = this.store.api;
  readonly fields = IMPORT_FIELDS;
  readonly history = signal<any[]>([]);
  readonly historyPage = signal(1);readonly historyTotal=signal(0);readonly historySearch=signal('');
  readonly historyPages=computed(()=>Math.max(1,Math.ceil(this.historyTotal()/25)));
  private historyTimer?:ReturnType<typeof setTimeout>;
  private historyRequest = 0;
  filterHistory(value:string){this.historySearch.set(value);this.historyPage.set(1);clearTimeout(this.historyTimer);this.historyTimer=setTimeout(()=>void this.loadHistory(),250);}
  changeHistoryPage(change:number){this.historyPage.update(page=>Math.max(1,page+change));void this.loadHistory();}
  readonly historyError = signal('');
  readonly historyLoading = signal(false);
  readonly dragging = signal(false);
  readonly busy = signal(false); readonly error = signal(''); readonly preview = signal<any>(null); readonly progress = signal<any>(null);
  readonly rows = signal<string[][]>([]); readonly headers = signal<string[]>([]); readonly mappings = signal<string[]>([]);
  readonly page = signal(1); readonly reviewRows = computed(() => (this.preview()?.rows || []).slice((this.page() - 1) * 25, this.page() * 25));
  readonly ignored = computed(() => this.mappings().filter(m => !m).length);
  filename = ''; delimiter = ','; dateFormat = 'ISO'; defaultClass = ''; classMappings: Record<string, string> = {};
  sheets: string[] = []; sheet = ''; private workbook: any; private file: File | null = null; private generation = 0;
  readonly classValues = computed(() => { const index = this.mappings().indexOf('classroom'); return index < 0 ? [] : [...new Set(this.rows().map(r => r[index]?.trim()).filter(Boolean))]; });
  private readonly context = computed(() => `${this.api.schoolId()}|${this.store.year()?.id || ''}`);
  private readonly historyEffect = effect(() => { this.context(); untracked(() => { void this.loadHistory(); }); });
  async loadHistory() {
    const context = this.context(); const schoolId = this.api.schoolId(); const yearId = this.store.year()?.id;
    const request = ++this.historyRequest;
    this.history.set([]); this.historyError.set('');
    if (!schoolId || !yearId) return;
    this.historyLoading.set(true);
    try { const params=new URLSearchParams({yearId,page:String(this.historyPage()),q:this.historySearch()});const result = await this.api.auth.request<any>('GET', `schools/${schoolId}/registry/imports?${params}`); if (request === this.historyRequest && context === this.context()) {this.history.set(result.items);this.historyTotal.set(result.total);} }
    catch (e) { if (request === this.historyRequest && context === this.context()) this.historyError.set(this.api.auth.error(e)); }
    finally { if (request === this.historyRequest && context === this.context()) this.historyLoading.set(false); }
  }
  async removeHistory(job: any) {
    if (this.busy() || !window.confirm(`Remove the import record for ${job.filename}? Imported students will remain in the school.`)) return;
    this.busy.set(true); this.historyError.set('');
    try {
      await this.api.auth.request('DELETE', `schools/${this.api.schoolId()}/registry/imports/${job.id}`, {});
      if (this.preview()?.id === job.id) { this.preview.set(null); this.progress.set(null); }
      await this.loadHistory();
    } catch (e) { this.historyError.set(this.api.auth.error(e)); }
    finally { this.busy.set(false); }
  }
  constructor() { effect(() => { this.context(); untracked(() => { this.generation++; this.rows.set([]); this.headers.set([]); this.preview.set(null); this.progress.set(null); this.error.set(''); this.defaultClass = ''; this.classMappings = {}; this.sheets = []; this.file = null; this.filename = ''; this.workbook = null; this.dragging.set(false); this.historyPage.set(1); this.historySearch.set(''); }); }); }
  template() { downloadCsv('student-import-template.csv', [this.fields.map(f => f.label)]); }
  resetPreview() { this.preview.set(null); this.progress.set(null); this.error.set(''); this.page.set(1); }
  mapping(index: number, key: string) { this.mappings.update(m => m.map((v, i) => i === index ? key : v)); this.resetPreview(); }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    input.value = '';
    if (file) await this.selectFile(file);
  }
  dragOver(event: DragEvent) { event.preventDefault(); if (!this.busy() && !this.store.readOnly()) this.dragging.set(true); }
  dragLeave(event: DragEvent) { event.preventDefault(); this.dragging.set(false); }
  async dropFile(event: DragEvent) {
    event.preventDefault(); this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) await this.selectFile(file);
  }
  private async selectFile(file: File) { if (this.busy() || this.store.readOnly()) return; this.file = file; await this.readFile(); }
  async readFile() {
    if (!this.file || this.busy()) return;
    const generation = this.generation; this.busy.set(true); this.resetPreview(); this.rows.set([]); this.headers.set([]); this.sheets = [];
    try {
      const file = this.file; this.filename = file.name;
      if (file.size > 5 * 1024 * 1024) throw new Error('Maximum file size is 5 MB. Split larger files before uploading.');
      const buffer = await file.arrayBuffer();
      const signature = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8));
      const isXlsx = signature[0] === 0x50 && signature[1] === 0x4b && signature[2] === 0x03 && signature[3] === 0x04;
      const isLegacyExcel = signature[0] === 0xd0 && signature[1] === 0xcf && signature[2] === 0x11 && signature[3] === 0xe0;
      if (isLegacyExcel || /\.xls$/i.test(file.name)) throw new Error('This is an older Excel .xls file. Save it as Excel Workbook (.xlsx) or CSV UTF-8, then upload it again.');
      if (isXlsx || /\.xlsx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const module = await import('exceljs'); const ExcelJS = module.default || module; const wb = new ExcelJS.Workbook();
        try {
          await wb.xlsx.load(buffer);
          if (generation !== this.generation) return;
          const worksheets = wb.worksheets;
          if (!worksheets?.length) throw new Error('This workbook does not contain any worksheets.');
          this.workbook = wb; this.sheets = worksheets.map(w => w.name); this.sheet = this.sheets[0]; this.readSheet();
        } catch (e) {
          if (e instanceof Error && e.message === 'This workbook does not contain any worksheets.') throw e;
          const detail = e instanceof Error ? ` (${e.message})` : '';
          throw new Error(`Could not read this Excel workbook. Save it as a valid .xlsx file or export it as CSV UTF-8.${detail}`);
        }
      } else if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
        const text = new TextDecoder().decode(buffer);
        if (generation === this.generation) this.setTable(parseCsv(text, this.delimiter));
      }
      else throw new Error('Choose a CSV UTF-8 or .xlsx file. Save older .xls files as .xlsx first.');
    } catch (e) { if (generation === this.generation) this.error.set(e instanceof Error ? e.message : 'Could not read this file.'); }
    finally { this.busy.set(false); }
  }
  readSheet() {
    this.resetPreview(); this.headers.set([]); this.rows.set([]);
    try {
      const ws = this.workbook?.getWorksheet(this.sheet); if (!ws) throw new Error('Select a worksheet.');
      if (ws.rowCount > 5001 || ws.columnCount > 256) throw new Error('Maximum 5,000 rows and 256 columns per worksheet.');
      const rows: string[][] = [];
      for (let r = 1; r <= ws.rowCount; r++) { const row: string[] = []; for (let c = 1; c <= ws.columnCount; c++) { const cell = ws.getCell(r, c); if (cell.type === 6) throw new Error(`Formula found at ${cell.address}. Paste formulas as values before importing.`); row.push(cell.value instanceof Date ? cell.value.toISOString().slice(0, 10) : cell.text); } rows.push(row); }
      this.setTable(rows);
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'Could not read worksheet.'); }
  }
  private setTable(table: string[][]) {
    if (table.length < 2 || !table[0].some(Boolean)) throw new Error('The first row must contain column headings, followed by student rows.');
    if (table.some(r => r.length > table[0].length)) throw new Error('Some rows have more cells than the header. Check the delimiter and CSV formatting.');
    this.headers.set(table[0]); this.rows.set(table.slice(1)); this.mappings.set(suggestMapping(table[0])); this.classMappings = {};
  }
  async validate() {
    if (this.busy() || this.store.readOnly()) return;
    const mapping = this.mappings(); const keys = mapping.filter(Boolean);
    this.error.set('');
    if (new Set(keys).size !== keys.length) { this.error.set('Map each system field to only one column.'); return; }
    if (!keys.includes('name') || !keys.includes('admissionNumber') || !keys.includes('classroom') && !this.defaultClass) { this.error.set('Map student name and admission number, then map class or choose one class for all rows.'); return; }
    const school = this.api.schoolId(); const generation = this.generation; this.busy.set(true);
    try {
      const rows = this.rows().map((r, index) => ({ row: index + 2, values: Object.fromEntries(mapping.flatMap((key, i) => key ? [[key, (r[i] || '').trim()]] : [])) })).filter(r => this.rows()[r.row - 2].some(c => c.trim()));
      for (const r of rows) {
        if (this.defaultClass) r.values['classroomId'] = this.defaultClass;
        else if (this.classMappings[r.values['classroom']]) r.values['classroomId'] = this.classMappings[r.values['classroom']];
        for (const date of ['dateOfBirth', 'admissionDate']) if (r.values[date]) r.values[date] = importDate(r.values[date], this.dateFormat);
      }
      const result = await this.api.auth.request<any>('POST', `schools/${school}/registry/imports/preview`, { yearId: this.store.year()?.id, filename: this.filename, rows }, requestId());
      if (generation === this.generation) { this.preview.set(result); this.progress.set(null); this.page.set(1); }
    } catch (e) { if (generation === this.generation) this.error.set(this.api.auth.error(e)); } finally { this.busy.set(false); }
  }
  async commit() {
    const preview = this.preview(); if (!preview?.valid || this.busy() || this.store.readOnly()) return;
    const generation = this.generation; const school = this.api.schoolId(); this.busy.set(true); this.error.set('');
    try {
      let status: any = await this.api.auth.request('GET', `schools/${school}/registry/imports/${preview.id}`);
      while (status.cursor < status.total && generation === this.generation) {
        status = await this.api.auth.request('POST', `schools/${school}/registry/imports/${preview.id}/commit`, { cursor: status.cursor }, requestId());
        if (generation === this.generation) this.progress.set(status);
      }
      if (generation === this.generation) { this.progress.set({ ...status, done: status.cursor === status.total }); await this.api.refresh(); await this.loadHistory(); }
    } catch (e) { if (generation === this.generation) this.error.set(this.api.auth.error(e) + ' Use Resume import to continue safely.'); } finally { this.busy.set(false); }
  }
  imported() { return this.progress()?.results?.filter((r: any) => r.status === 'imported').length || 0; }
  failed() { return this.progress()?.results?.filter((r: any) => r.status === 'failed').length || 0; }
  errorsCsv() {
    const failures = new Map<number, string>((this.progress()?.results || []).filter((r: any) => r.status === 'failed').map((r: any) => [r.row, r.errors.join('; ')]));
    downloadCsv('student-import-errors.csv', [['Source row', ...this.headers(), 'Errors'], ...(this.preview()?.rows || []).filter((r: any) => r.errors.length || failures.has(r.row)).map((r: any) => [r.row, ...this.headers().map((_, i) => this.rows()[r.row - 2]?.[i] || ''), [...r.errors, failures.get(r.row)].filter(Boolean).join('; ')])]);
  }
}
