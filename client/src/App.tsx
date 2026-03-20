import { Route, Switch, Redirect, useLocation } from "wouter";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import AIStaffPage from "@/pages/ai-staff";
import AIStaffDetailPage from "@/pages/ai-staff-detail";
import WorkflowsPage from "@/pages/workflows";
import TasksPage from "@/pages/tasks";
import MessagesPage from "@/pages/messages";
import IntegrationsPage from "@/pages/integrations";
import SettingsPage from "@/pages/settings";
import OnboardingPage from "@/pages/onboarding";
import CreateStaffPage from "@/pages/create-staff";
import LandingPage from "@/pages/landing";
import DelegationsPage from "@/pages/delegations";
import AuditLogsPage from "@/pages/audit-logs";
import NotFoundPage from "@/pages/not-found";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function ProtectedRouteNoLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <LandingPage />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/">
        <RootRedirect />
      </Route>

      <Route path="/login">
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      </Route>

      <Route path="/register">
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      </Route>

      <Route path="/onboarding">
        <ProtectedRouteNoLayout>
          <OnboardingPage />
        </ProtectedRouteNoLayout>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>

      <Route path="/ai-staff">
        <ProtectedRoute>
          <AIStaffPage />
        </ProtectedRoute>
      </Route>

      <Route path="/ai-staff/create">
        <ProtectedRouteNoLayout>
          <CreateStaffPage />
        </ProtectedRouteNoLayout>
      </Route>

      <Route path="/ai-staff/:id">
        <ProtectedRoute>
          <AIStaffDetailPage />
        </ProtectedRoute>
      </Route>

      <Route path="/workflows">
        <ProtectedRoute>
          <WorkflowsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/delegations">
        <ProtectedRoute>
          <DelegationsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/tasks">
        <ProtectedRoute>
          <TasksPage />
        </ProtectedRoute>
      </Route>

      <Route path="/messages">
        <ProtectedRoute>
          <MessagesPage />
        </ProtectedRoute>
      </Route>

      <Route path="/integrations">
        <ProtectedRoute>
          <IntegrationsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/audit-logs">
        <ProtectedRoute>
          <AuditLogsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>

      <Route>
        <NotFoundPage />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <AppRoutes />
        <Toaster />
      </WorkspaceProvider>
    </AuthProvider>
  );
}
