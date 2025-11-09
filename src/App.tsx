import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import MemberDetail from "./pages/MemberDetail";
import NotFound from "./pages/NotFound";
import ImageEditor from "./pages/ImageEditor";
import AcceptInvitation from "./pages/AcceptInvitation";
import TaskStatusDetails from "./pages/TaskStatusDetails";
import "./i18n/config";

import InvitationAcceptDialog from "./components/InvitationAcceptDialog";
import AgreementConsentDialog from "./components/AgreementConsentDialog";
import TaskTimerNotification from "./components/TaskTimerNotification";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <InvitationAcceptDialog />
        <AgreementConsentDialog />
        <TaskTimerNotification />
        <Routes>
          {/* Auth routes without layout */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          
          {/* Routes with sidebar layout */}
          <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
          <Route path="/home" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
          <Route path="/notifications" element={<MainLayout><Notifications /></MainLayout>} />
          <Route path="/calendar" element={<MainLayout><CalendarView /></MainLayout>} />
          <Route path="/team" element={<MainLayout><Team /></MainLayout>} />
          <Route path="/goals" element={<MainLayout><Goals /></MainLayout>} />
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          <Route path="/help" element={<MainLayout><Help /></MainLayout>} />
          <Route path="/tasks" element={<MainLayout><Tasks /></MainLayout>} />
          <Route path="/organization/:id" element={<MainLayout><OrganizationDetail /></MainLayout>} />
          <Route path="/organization/:organizationId/member/:memberId" element={<MainLayout><MemberDetail /></MainLayout>} />
          <Route path="/member/:memberId" element={<MainLayout><MemberDetail /></MainLayout>} />
          <Route path="/task/:id" element={<MainLayout><TaskDetail /></MainLayout>} />
          <Route path="/task-status/:organizationId/:status" element={<MainLayout><TaskStatusDetails /></MainLayout>} />
          <Route path="/image-editor" element={<ImageEditor />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;