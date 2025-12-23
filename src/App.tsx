import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import MainLayout from "./components/MainLayout";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Tasks from "./pages/Tasks";
import Dashboard from "./pages/Dashboard";
import Notifications from "./pages/Notifications";
import CalendarView from "./pages/CalendarView";
import Team from "./pages/Team";
import Goals from "./pages/Goals";
import Help from "./pages/Help";
import TaskDetail from "./pages/TaskDetail";
import ForgotPassword from "./pages/ForgotPassword";
import OrganizationDetail from "./pages/OrganizationDetail";
import OrganizationStats from "./pages/OrganizationStats";
import MemberDetail from "./pages/MemberDetail";
import NotFound from "./pages/NotFound";
import ImageEditor from "./pages/ImageEditor";
import AcceptInvitation from "./pages/AcceptInvitation";
import TaskStatusDetails from "./pages/TaskStatusDetails";

import InvitationAcceptDialog from "./components/InvitationAcceptDialog";
import AgreementConsentDialog from "./components/AgreementConsentDialog";
import TaskTimerNotification from "./components/TaskTimerNotification";
import { initializeSocket } from "@/lib/socket";

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
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

