import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";

import MainLayout from "./components/MainLayout";
import InvitationAcceptDialog from "./components/InvitationAcceptDialog";
import AgreementConsentDialog from "./components/AgreementConsentDialog";
import TaskTimerNotification from "./components/TaskTimerNotification";
import { initializeSocket } from "@/lib/socket";

// Lazy load pages for better performance
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Home = lazy(() => import("./pages/Home"));
const Profile = lazy(() => import("./pages/Profile"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CalendarView = lazy(() => import("./pages/CalendarView"));
const Team = lazy(() => import("./pages/Team"));
const Goals = lazy(() => import("./pages/Goals"));
const Help = lazy(() => import("./pages/Help"));
const TaskDetail = lazy(() => import("./pages/TaskDetail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const OrganizationDetail = lazy(() => import("./pages/OrganizationDetail"));
const OrganizationStats = lazy(() => import("./pages/OrganizationStats"));
const MemberDetail = lazy(() => import("./pages/MemberDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ImageEditor = lazy(() => import("./pages/ImageEditor"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const TaskStatusDetails = lazy(() => import("./pages/TaskStatusDetails"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    try {
      initializeSocket();
    } catch (e) {
      // Token yo‘q bo‘lsa yoki boshqa xato bo‘lsa, jim o‘tkazib yuborish mumkin
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <InvitationAcceptDialog />
          <AgreementConsentDialog />
          <TaskTimerNotification />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />

            <Route
              path="/"
              element={
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              }
            />
            <Route
              path="/home"
              element={
                <MainLayout>
                  <Home />
                </MainLayout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              }
            />
            <Route
              path="/notifications"
              element={
                <MainLayout>
                  <Notifications />
                </MainLayout>
              }
            />
            <Route
              path="/calendar"
              element={
                <MainLayout>
                  <CalendarView />
                </MainLayout>
              }
            />
            <Route
              path="/team"
              element={
                <MainLayout>
                  <Team />
                </MainLayout>
              }
            />
            <Route
              path="/goals"
              element={
                <MainLayout>
                  <Goals />
                </MainLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <MainLayout>
                  <Profile />
                </MainLayout>
              }
            />
            <Route
              path="/help"
              element={
                <MainLayout>
                  <Help />
                </MainLayout>
              }
            />
            <Route
              path="/tasks"
              element={
                <MainLayout>
                  <Tasks />
                </MainLayout>
              }
            />
            <Route
              path="/organization/:id"
              element={
                <MainLayout>
                  <OrganizationDetail />
                </MainLayout>
              }
            />
            <Route
              path="/organization/:organizationId/stats"
              element={
                <MainLayout>
                  <OrganizationStats />
                </MainLayout>
              }
            />
            <Route
              path="/organization/:organizationId/member/:memberId"
              element={
                <MainLayout>
                  <MemberDetail />
                </MainLayout>
              }
            />
            <Route
              path="/member/:memberId"
              element={
                <MainLayout>
                  <MemberDetail />
                </MainLayout>
              }
            />
            <Route
              path="/task/:id"
              element={
                <MainLayout>
                  <TaskDetail />
                </MainLayout>
              }
            />
            <Route
              path="/task-status/:organizationId/:status"
              element={
                <MainLayout>
                  <TaskStatusDetails />
                </MainLayout>
              }
            />

              <Route path="/image-editor" element={<ImageEditor />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

