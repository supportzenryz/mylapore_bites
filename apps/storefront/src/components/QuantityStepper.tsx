"use client";

export function QuantityStepper({
  value, min = 1, max = 99, onChange, disabled = false, label = "Quantity",
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="qty" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label={value <= min ? "Remove item" : "Decrease quantity"}
      >
        &minus;
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        /* The limit is the kitchen's daily capacity, not an arbitrary cap. */
        aria-label={value >= max ? `Maximum ${max} per order` : "Increase quantity"}
      >
        +
      </button>
    </div>
  );
}
