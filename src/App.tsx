import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Lazy loaded pages
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
const NotificationsPage = lazy(() => import("./pages/shared/Notifications"));
const ProfilePage = lazy(() => import("./pages/shared/Profile"));
const MessagesPage = lazy(() => import("./pages/shared/Messages"));
const OfficeHoursPage = lazy(() => import("./pages/shared/OfficeHours"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
import OfflineBanner from "@/components/OfflineBanner";

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

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
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  
                  {/* Doctor Routes */}
                  <Route path="/doctor" element={<DoctorDashboard />} />
                  <Route path="/doctor/lectures" element={<DoctorLectures />} />
                  <Route path="/doctor/lectures/:id" element={<LectureDetail />} />
                  <Route path="/doctor/student/:studentId" element={<StudentDetail />} />
                  <Route path="/doctor/analytics" element={<DoctorAnalytics />} />
                  <Route path="/doctor/schedule-parser" element={<ScheduleParser />} />
                  <Route path="/doctor/early-warning" element={<EarlyWarning />} />
                  <Route path="/doctor/notifications" element={<NotificationsPage role="doctor" />} />
                  <Route path="/doctor/profile" element={<ProfilePage role="doctor" />} />
                  <Route path="/doctor/messages" element={<MessagesPage role="doctor" />} />
                  <Route path="/doctor/office-hours" element={<OfficeHoursPage role="doctor" />} />
                  
                  {/* Student Routes */}
                  <Route path="/student" element={<StudentDashboard />} />
                  <Route path="/student/lectures" element={<StudentLectures />} />
                  <Route path="/student/calendar" element={<StudentCalendar />} />
                  <Route path="/student/schedule-ai" element={<StudentScheduleParser />} />
                  <Route path="/student/face-registration" element={<FaceRegistration />} />
                  <Route path="/student/notifications" element={<NotificationsPage role="student" />} />
                  <Route path="/student/profile" element={<ProfilePage role="student" />} />
                  <Route path="/student/messages" element={<MessagesPage role="student" />} />
                  <Route path="/student/office-hours" element={<OfficeHoursPage role="student" />} />
                  
                  <Route path="/admin" element={<AdminDashboard />} />

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
