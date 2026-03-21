import { createContext, useContext } from 'react';
import type { Organization } from '@/hooks/useOrganizations';

interface PublicOrgContextValue {
  organization: Organization;
  orgSlug: string;
  /** Build a path relative to the org, e.g. orgPath('/services') → '/org/my-salon/services' */
  orgPath: (path?: string) => string;
}

export const PublicOrgContext = createContext<PublicOrgContextValue | null>(null);

export function PublicOrgProvider({
  organization,
  orgSlug,
  children,
}: {
  organization: Organization;
  orgSlug: string;
  children: React.ReactNode;
}) {
  const orgPath = (path?: string) => {
    const base = `/org/${orgSlug}`;
    if (!path) return base;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  };

  return (
    <PublicOrgContext.Provider value={{ organization, orgSlug, orgPath }}>
      {children}
    </PublicOrgContext.Provider>
  );
}

export function usePublicOrg() {
  const ctx = useContext(PublicOrgContext);
  if (!ctx) {
    throw new Error('usePublicOrg must be used within a PublicOrgProvider (inside /org/:orgSlug routes)');
  }
  return ctx;
}
