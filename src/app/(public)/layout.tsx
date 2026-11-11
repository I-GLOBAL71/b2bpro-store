import { getSiteSettings } from "@/lib/settings";
import { isAdminSession } from "@/lib/admin-auth";
import { getAuthProvidersStatus } from "@/lib/auth";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { AnnouncementBanner } from "@/components/site/announcement-banner";
import { MaintenanceScreen } from "@/components/site/maintenance-screen";
import { AdminMaintenanceNotice } from "@/components/site/maintenance-screen";

/**
 * Layout du groupe public — chrome commun du site marchand :
 *  1. mode maintenance : écran dédié pour les visiteurs (les administrateurs
 *     connectés passent au travers et voient le site + un bandeau de rappel) ;
 *  2. bandeau d'annonce optionnel (configurable) ;
 *  3. header + main + footer (footer collé en bas : min-h-screen flex).
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, isAdmin, authStatus] = await Promise.all([
    getSiteSettings(),
    isAdminSession(),
    getAuthProvidersStatus(),
  ]);

  if (settings.maintenance.enabled && !isAdmin) {
    return <MaintenanceScreen message={settings.maintenance.message} />;
  }

  return (
    <>
      {settings.announcement.enabled && (
        <AnnouncementBanner
          message={settings.announcement.message}
          linkUrl={settings.announcement.linkUrl}
          linkLabel={settings.announcement.linkLabel}
        />
      )}
      {settings.maintenance.enabled && isAdmin && <AdminMaintenanceNotice />}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Aller au contenu
      </a>
      <SiteHeader googleAuthEnabled={authStatus.google} emailAuthEnabled={authStatus.email} />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
