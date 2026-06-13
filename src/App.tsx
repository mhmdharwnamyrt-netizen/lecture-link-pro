import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AccountStatusGuard from "@/components/AccountStatusGuard";
import OfflineBanner from "@/components/OfflineBanner";

import CinematicLoader from "@/components/CinematicLoader";

// Lazy loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const LoginPage = lazy(() => import("./pages/Login"));
const RegisterPage = lazy(() => import("./pages/Register"));
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const DoctorLectures = lazy(() => import("./pages/doctor/DoctorLectures"));
const LectureDetail = lazy(() => import("./pages/doctor/LectureDetail"));
const StudentDetail = lazy(() => import("./pages/doctor/StudentDetail"));
const DoctorAnalytics = lazy(() => import("./pages/doctor/DoctorAnalytics"));
const ScheduleParser = lazy(() => import("./pages/doctor/ScheduleParser"));
const EarlyWarning = lazy(() => import("./pages/doctor/EarlyWarning"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentLectures = lazy(() => import("./pages/student/StudentLectures"));
const StudentCalendar = lazy(() => import("./pages/student/StudentCalendar"));
const StudentScheduleParser = lazy(() => import("./pages/student/StudentScheduleParser"));
const FaceRegistration = lazy(() => import("./pages/student/FaceRegistration"));
const OfflineQueue = lazy(() => import("./pages/student/OfflineQueue"));
const NotificationsPage = lazy(() => import("./pages/shared/Notifications"));
const ProfilePage = lazy(() => import("./pages/shared/Profile"));
const MessagesPage = lazy(() => import("./pages/shared/Messages"));
const OfficeHoursPage = lazy(() => import("./pages/shared/OfficeHours"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));

const queryClient = new QueryClient();

function PageLoader() {
  return <CinematicLoader fullscreen={false} />;
}

const Guarded = ({ children }: { children: React.ReactNode }) => (
  <AccountStatusGuard>{children}</AccountStatusGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineBanner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/leaderboard" element={<Guarded><Leaderboard /></Guarded>} />

                  {/* Doctor Routes */}
                  <Route path="/doctor" element={<Guarded><DoctorDashboard /></Guarded>} />
                  <Route path="/doctor/lectures" element={<Guarded><DoctorLectures /></Guarded>} />
                  <Route path="/doctor/lectures/:id" element={<Guarded><LectureDetail /></Guarded>} />
                  <Route path="/doctor/student/:studentId" element={<Guarded><StudentDetail /></Guarded>} />
                  <Route path="/doctor/analytics" element={<Guarded><DoctorAnalytics /></Guarded>} />
                  <Route path="/doctor/schedule-parser" element={<Guarded><ScheduleParser /></Guarded>} />
                  <Route path="/doctor/early-warning" element={<Guarded><EarlyWarning /></Guarded>} />
                  <Route path="/doctor/notifications" element={<Guarded><NotificationsPage role="doctor" /></Guarded>} />
                  <Route path="/doctor/profile" element={<Guarded><ProfilePage role="doctor" /></Guarded>} />
                  <Route path="/doctor/messages" element={<Guarded><MessagesPage role="doctor" /></Guarded>} />
                  <Route path="/doctor/office-hours" element={<Guarded><OfficeHoursPage role="doctor" /></Guarded>} />

                  {/* Student Routes */}
                  <Route path="/student" element={<Guarded><StudentDashboard /></Guarded>} />
                  <Route path="/student/lectures" element={<Guarded><StudentLectures /></Guarded>} />
                  <Route path="/student/calendar" element={<Guarded><StudentCalendar /></Guarded>} />
                  <Route path="/student/schedule-ai" element={<Guarded><StudentScheduleParser /></Guarded>} />
                  <Route path="/student/face-registration" element={<Guarded><FaceRegistration /></Guarded>} />
                  <Route path="/student/offline-queue" element={<Guarded><OfflineQueue /></Guarded>} />
                  <Route path="/student/notifications" element={<Guarded><NotificationsPage role="student" /></Guarded>} />
                  <Route path="/student/profile" element={<Guarded><ProfilePage role="student" /></Guarded>} />
                  <Route path="/student/messages" element={<Guarded><MessagesPage role="student" /></Guarded>} />
                  <Route path="/student/office-hours" element={<Guarded><OfficeHoursPage role="student" /></Guarded>} />

                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/logs" element={<AdminLogs />} />
                  <Route path="/admin/reports" element={<AdminReports />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
