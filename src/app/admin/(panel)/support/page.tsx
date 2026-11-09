"use client";

import { MessageCircle } from "lucide-react";
import { useSettingsGroup } from "@/components/admin/use-settings";
import { AdminPageHeader, SaveBar, SwitchField, TextAreaField } from "@/components/admin/fields";

export default function AdminSupportPage() {
  const { value, loading, error, dirty, saving, patch, save, reset } = useSettingsGroup("support");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (error || !value) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{error}</div>;
  }

  return (
    <div>
      <AdminPageHeader
        title="Support IA"
        description="Conseiller conversationnel de /support : disponibilité et message d'accueil présenté aux visiteurs."
        icon={<MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <SwitchField
          label="Support IA actif"
          description="Désactivé : la page /support affiche un message d'indisponabilité et invite à explorer le catalogue."
          checked={value.enabled}
          onChange={(b) => patch("enabled", b)}
        />

        <TextAreaField
          label="Message d'accueil"
          description="Première réponse de l'assistant après l'activation (email du visiteur collecté avant, conformément au modèle lead)."
          value={value.welcome}
          onChange={(s) => patch("welcome", s)}
          rows={7}
          maxLength={1200}
          id="support-welcome"
        />

        <SaveBar dirty={dirty} saving={saving} onSave={() => void save()} onReset={reset} />
      </form>
    </div>
  );
}
