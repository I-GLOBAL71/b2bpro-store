"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/** Libellé + description + contrôle — disposition homogène du panneau. */
export function Field({
  label,
  description,
  htmlFor,
  children,
  className,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13.5px] font-semibold text-foreground">
        {label}
      </label>
      {description && <p className="text-[12.5px] leading-5 text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}

export function TextField({
  label,
  description,
  value,
  onChange,
  placeholder,
  maxLength,
  id,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  id?: string;
}) {
  return (
    <Field label={label} description={description} htmlFor={id}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  description,
  value,
  onChange,
  rows = 3,
  maxLength,
  id,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
  id?: string;
}) {
  return (
    <Field label={label} description={description} htmlFor={id}>
      <Textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  id,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  id?: string;
}) {
  return (
    <Field label={label} description={description} htmlFor={id}>
      <div className="flex items-center gap-3">
        <Input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(n);
          }}
          className="w-28"
        />
        {suffix && <span className="text-[12.5px] text-muted-foreground">{suffix}</span>}
      </div>
    </Field>
  );
}

export function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold">{label}</p>
        {description && <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

/** Champ numérique avec curseur — pour les bornes sensibles (fenêtre…). */
export function SliderField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue,
  id,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (v: number) => string;
  id?: string;
}) {
  return (
    <Field label={label} description={description} htmlFor={id}>
      <div className="flex items-center gap-4 pt-1.5">
        <Slider
          id={id}
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(vals) => onChange(vals[0] ?? value)}
          className="flex-1"
        />
        <span className="w-24 shrink-0 rounded-lg bg-muted px-2 py-1 text-center text-[13px] font-bold tabular-nums">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
    </Field>
  );
}

/** Barre d'action collante : enregistrer / réinitialiser / état modifié. */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onReset,
  extra,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 px-5 py-3.5 shadow-lg backdrop-blur">
      <p className="text-[12.5px] font-medium text-muted-foreground" role="status">
        {saving ? "Enregistrement…" : dirty ? "Modifications non enregistrées" : "Tout est enregistré ✓"}
      </p>
      <div className="flex items-center gap-2.5">
        {extra}
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty || saving}
          className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-muted disabled:opacity-40"
        >
          Réinitialiser
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="rounded-full bg-primary px-5 py-2 text-[13px] font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

/** Titre de page du panneau. */
export function AdminPageHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight">
        {icon}
        {title}
      </h1>
      {description && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-6 text-muted-foreground">{description}</p>}
    </header>
  );
}
