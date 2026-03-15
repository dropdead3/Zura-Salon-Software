import { FileText, CreditCard, MessageSquare, DollarSign, Calculator, ShoppingCart, LucideIcon } from 'lucide-react';

export interface PlatformIntegration {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: 'connected' | 'not_configured' | 'coming_soon';
  category: 'documents' | 'payments' | 'communication' | 'analytics' | 'payroll';
  features: string[];
  configPath: string;
}

export const PLATFORM_INTEGRATIONS: PlatformIntegration[] = [
  {
    id: 'pandadoc',
    name: 'PandaDoc',
    description: 'Contract signing and billing automation',
    icon: FileText,
    status: 'connected', // Dynamic based on stats in component
    category: 'documents',
    features: ['Contract Signing', 'Field Extraction', 'Billing Auto-populate'],
    configPath: '/dashboard/platform/settings/integrations/pandadoc',
  },
  {
    id: 'gusto',
    name: 'Gusto',
    description: 'Full-service payroll with tax compliance and HR',
    icon: DollarSign,
    status: 'not_configured',
    category: 'payroll',
    features: ['Automated Taxes', 'Direct Deposit', 'W-2s', 'Benefits'],
    configPath: '/dashboard/admin/payroll',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Payroll',
    description: 'Payroll integrated with QuickBooks accounting',
    icon: Calculator,
    status: 'not_configured',
    category: 'payroll',
    features: ['QuickBooks Sync', 'Direct Deposit', 'Tax Filing', 'Reports'],
    configPath: '/dashboard/admin/payroll',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing and subscription billing',
    icon: CreditCard,
    status: 'coming_soon',
    category: 'payments',
    features: ['Payment Processing', 'Subscriptions', 'Invoicing'],
    configPath: '/dashboard/platform/settings/integrations/stripe',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS notifications and communication',
    icon: MessageSquare,
    status: 'coming_soon',
    category: 'communication',
    features: ['SMS Alerts', 'Two-Factor Auth', 'Appointment Reminders'],
    configPath: '/dashboard/platform/settings/integrations/twilio',
  },
];
