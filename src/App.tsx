import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorLectures from "./pages/doctor/DoctorLectures";
import LectureDetail from "./pages/doctor/LectureDetail";
import StudentDetail from "./pages/doctor/StudentDetail";
import DoctorAnalytics from "./pages/doctor/DoctorAnalytics";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentLectures from "./pages/student/StudentLectures";
import FaceRegistration from "./pages/student/FaceRegistration";
import NotificationsPage from "./pages/shared/Notifications";
import ProfilePage from "./pages/shared/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              <Route path="/doctor/notifications" element={<NotificationsPage role="doctor" />} />
              <Route path="/doctor/profile" element={<ProfilePage role="doctor" />} />
              
              {/* Student Routes */}
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/lectures" element={<StudentLectures />} />
              <Route path="/student/face-registration" element={<FaceRegistration />} />
              <Route path="/student/notifications" element={<NotificationsPage role="student" />} />
              <Route path="/student/profile" element={<ProfilePage role="student" />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
