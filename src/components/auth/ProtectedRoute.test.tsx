import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/ViewAsContext', () => ({
  useViewAs: vi.fn(),
}));

vi.mock('@/hooks/useEmployeeProfile', () => ({
  useEmployeeProfile: vi.fn(),
}));

vi.mock('@/hooks/useEffectivePermissions', () => ({
  useEffectivePermissions: vi.fn(),
}));

vi.mock('./AccessDeniedView', () => ({
  AccessDeniedView: () => <div>Access Denied View</div>,
}));

type AuthMock = ReturnType<typeof useAuth>;
type ViewAsMock = ReturnType<typeof useViewAs>;

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseViewAs = vi.mocked(useViewAs);
const mockedUseEmployeeProfile = vi.mocked(useEmployeeProfile);
const mockedUseEffectivePermissions = vi.mocked(useEffectivePermissions);

function makeAuthMock(overrides: Partial<AuthMock> = {}): AuthMock {
  return {
    user: { id: 'user-1' } as AuthMock['user'],
    session: null,
    loading: false,
    roles: ['stylist'],
    permissions: ['view_command_center'],
    platformRoles: [],
    isPlatformUser: false,
    isCoach: false,
    hasPermission: (permissionName: string) => permissionName === 'view_command_center',
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    hasPlatformRole: () => false,
    hasPlatformRoleOrHigher: () => false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    refreshRoles: async () => {},
    refreshPermissions: async () => {},
    resetPassword: async () => ({ error: null }),
    ...overrides,
  };
}

function makeViewAsMock(overrides: Partial<ViewAsMock> = {}): ViewAsMock {
  return {
    isViewingAs: false,
    viewAsRole: null,
    viewAsUser: null,
    isViewingAsUser: false,
    setViewAsRole: () => {},
    setViewAsUser: () => {},
    clearViewAs: () => {},
    sessionId: null,
    ...overrides,
    ...overrides,
  };
}

function renderProtectedRoute({
  initialPath = '/protected',
  routePath = '/protected',
  requiredPermission = 'view_command_center',
}: {
  initialPath?: string;
  routePath?: string;
  requiredPermission?: string;
} = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path={routePath}
          element={
            <ProtectedRoute requiredPermission={requiredPermission}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue(makeAuthMock());
    mockedUseViewAs.mockReturnValue(makeViewAsMock());
    mockedUseEmployeeProfile.mockReturnValue({
      data: null,
      isLoading: false,
    } as ReturnType<typeof useEmployeeProfile>);
    mockedUseEffectivePermissions.mockReturnValue({
      permissions: ['view_command_center'],
      isLoading: false,
    });
  });

  it('redirects unauthenticated users to staff login for non-platform routes', () => {
    mockedUseAuth.mockReturnValue(
      makeAuthMock({
        user: null,
        hasPermission: () => false,
      })
    );

    renderProtectedRoute();

    expect(screen.getByText('Staff Login Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to platform login for platform routes', () => {
    mockedUseAuth.mockReturnValue(
      makeAuthMock({
        user: null,
        hasPermission: () => false,
      })
    );

    renderProtectedRoute({
      initialPath: '/dashboard/platform/settings',
      routePath: '/dashboard/platform/settings',
      requiredPermission: undefined,
    });

    expect(screen.getByText('Platform Login Page')).toBeInTheDocument();
  });

  it('shows spinner while effective permissions are loading for required permission routes', () => {
    mockedUseEffectivePermissions.mockReturnValue({
      permissions: [],
      isLoading: true,
    });

    renderProtectedRoute();

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('denies by default when required permission is known but effective permissions are empty', () => {
    mockedUseAuth.mockReturnValue(
      makeAuthMock({
        roles: [],
        permissions: [],
        hasPermission: () => false,
      })
    );
    mockedUseEffectivePermissions.mockReturnValue({
      permissions: [],
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('shows access denied view in view-as mode when required permission is missing', () => {
    mockedUseViewAs.mockReturnValue(
      makeViewAsMock({
        isViewingAs: true,
        viewAsRole: 'stylist',
      })
    );
    mockedUseEffectivePermissions.mockReturnValue({
      permissions: [],
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText('Access Denied View')).toBeInTheDocument();
  });

  it('allows access when user has required permission', () => {
    mockedUseAuth.mockReturnValue(
      makeAuthMock({
        roles: ['stylist'],
        permissions: ['view_command_center'],
        hasPermission: () => true,
      })
    );
    mockedUseEffectivePermissions.mockReturnValue({
      permissions: ['view_command_center'],
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
