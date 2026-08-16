import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import DashboardLayout from './layouts/DashboardLayout';

// Shared Pages
import DepartmentCalendar from './pages/shared/Calendar';
import ReportsAndAnalytics from './pages/shared/Reports';
import Settings from './pages/shared/Settings';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminDepartments from './pages/admin/Departments';
import AdminFaculty from './pages/admin/Faculty';
import AdminApprovals from './pages/admin/Approvals';
import AdminCreditConfig from './pages/admin/CreditConfig';

// HOD
import HodDashboard from './pages/hod/Dashboard';
import HodFaculty from './pages/hod/Faculty';
import HodApprovals from './pages/hod/Approvals';

// Faculty
import FacultyDashboard from './pages/faculty/Dashboard';
import FacultyUpload from './pages/faculty/Upload';
import FacultyMyActivities from './pages/faculty/MyActivities';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<DashboardLayout role="ADMIN" />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="departments" element={<AdminDepartments />} />
          <Route path="faculty" element={<AdminFaculty />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="credit-config" element={<AdminCreditConfig />} />
          <Route path="reports" element={<ReportsAndAnalytics />} />
          <Route path="calendar" element={<DepartmentCalendar />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* HOD Routes */}
        <Route path="/hod" element={<DashboardLayout role="HOD" />}>
          <Route path="dashboard" element={<HodDashboard />} />
          <Route path="faculty" element={<HodFaculty />} />
          <Route path="approvals" element={<HodApprovals />} />
          <Route path="upload" element={<FacultyUpload />} />
          <Route path="my-activities" element={<FacultyMyActivities />} />
          <Route path="reports" element={<ReportsAndAnalytics />} />
          <Route path="calendar" element={<DepartmentCalendar />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Faculty Routes */}
        <Route path="/faculty" element={<DashboardLayout role="FACULTY" />}>
          <Route path="dashboard" element={<FacultyDashboard />} />
          <Route path="upload" element={<FacultyUpload />} />
          <Route path="my-activities" element={<FacultyMyActivities />} />
          <Route path="reports" element={<ReportsAndAnalytics />} />
          <Route path="calendar" element={<DepartmentCalendar />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
