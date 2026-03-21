import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { Building2, X, ExternalLink } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useNavigate } from 'react-router-dom';
import { PlatformButton } from './ui/PlatformButton';

export function PlatformContextBanner() {
  const { selectedOrganization, isImpersonating, clearSelection } = useOrganizationContext();
  const navigate = useNavigate();

  if (!isImpersonating || !selectedOrganization) {
    return null;
  }

  const handleViewDetails = () => {
    navigate(`/dashboard/platform/accounts/${selectedOrganization.id}`);
  };

  return (
    <div className="bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-violet-600/20 border border-violet-500/30 px-4 py-2 backdrop-blur-sm mx-3 mt-3 rounded-2xl shadow-sm overflow-hidden">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-violet-500/20">
            <Building2 className="h-4 w-4 text-violet-400" />
          </div>
          <span className="text-sm font-medium text-slate-300">
            Viewing as: <span className="text-violet-300 font-medium">{selectedOrganization.name}</span>
          </span>
          <span className="text-xs text-slate-500">
            ({selectedOrganization.slug})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PlatformButton
            variant="ghost"
            size={tokens.button.inline}
            onClick={handleViewDetails}
            className="h-7 text-xs gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Account Details
          </PlatformButton>
          <PlatformButton
            variant="ghost"
            size={tokens.button.inline}
            onClick={() => {
              clearSelection();
              navigate('/dashboard/platform/overview');
            }}
            className="h-7 text-xs gap-1 hover:bg-red-500/20 hover:text-red-400"
          >
            <X className="h-3 w-3" />
            Exit View
          </PlatformButton>
        </div>
      </div>
    </div>
  );
}
