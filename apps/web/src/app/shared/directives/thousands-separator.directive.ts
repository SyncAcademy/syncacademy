import { Directive, ElementRef, forwardRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export function formatThousands(value: string | number | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function amountValue(value: string | number | null | undefined): number {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

@Directive({
  selector: '[appThousandsSeparator]',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ThousandsSeparatorDirective),
    multi: true,
  }],
})
export class ThousandsSeparatorDirective implements ControlValueAccessor {
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly element: ElementRef<HTMLInputElement>) {}

  @HostListener('input')
  formatInput(): void {
    const input = this.element.nativeElement;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/g, '').length;
    const digits = input.value.replace(/\D/g, '');
    const formatted = formatThousands(digits);
    input.value = formatted;

    let nextCursor = 0;
    let seenDigits = 0;
    while (nextCursor < formatted.length && seenDigits < digitsBeforeCursor) {
      if (/\d/.test(formatted[nextCursor])) seenDigits++;
      nextCursor++;
    }
    input.setSelectionRange(nextCursor, nextCursor);
    this.onChange(digits);
  }

  @HostListener('blur')
  markTouched(): void {
    this.onTouched();
  }

  writeValue(value: string | number | null): void {
    this.element.nativeElement.value = formatThousands(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.element.nativeElement.disabled = disabled;
  }
}
