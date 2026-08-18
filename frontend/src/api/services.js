// ─────────────────────────────────────────────────────────
// Comprehensive API service layer — connected to backend
// ─────────────────────────────────────────────────────────
import api from './axiosClient';

/* ── AUTH ── */
export const authApi = {
  checkUser:          (data)     => api.post('/auth/check-user', data),
  login:              (data)     => api.post('/auth/login', data),
  verifyOtp:          (data)     => api.post('/auth/verify-otp', data),
  registerFaculty:    (formData) => api.post('/auth/faculty/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  registerHod:        (formData) => api.post('/auth/hod/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMe:              ()         => api.get('/auth/me'),
  getFacultyProfile:  (id)       => api.get(`/auth/faculty/${id}`),
  updateProfile:      (data)     => api.put('/auth/update-profile', data),
  updateProfileImage: (formData) => api.put('/auth/update-profile-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  removeProfileImage: ()         => api.delete('/auth/profile-image'),
  createAdmin:        ()         => api.post('/auth/create-admin'),
  forgotPassword:     (data)     => api.post('/auth/forgot-password', data),
  verifyResetOtp:     (data)     => api.post('/auth/verify-reset-otp', data),
  resetPassword:      (data)     => api.post('/auth/reset-password', data),
  completeOnboarding: (data)     => api.post('/auth/complete-onboarding', data),
  changePassword:     (data)     => api.post('/auth/change-password', data),
  // Destroys server session + clears cookie; client should also clear localStorage
  logout:             ()         => api.post('/auth/logout'),
};

/* ── FACULTY ── */
export const facultyApi = {
  getProfile:         ()              => api.get('/faculty/profile'),
  updateProfile:      (data)          => api.put('/faculty/update-profile', data),
  getFacultyById:     (id)            => api.get(`/faculty/${id}`),
  getMyUploads:       (params)        => api.get('/uploads/mine', { params }),
  createUpload:       (category, form)=> api.post(`/uploads/create/${category}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateUpload:       (id, cat, form) => api.put(`/uploads/update/${id}/${cat}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMyRank:          ()              => api.get('/rank'),
};

/* ── HOD ── */
export const hodApi = {
  getProfile:         ()          => api.get('/hod/profile'),
  updateProfile:      (data)      => api.put('/hod/update-profile', data),
  createFaculty:      (data)      => api.post('/hod/faculty', data),
  getPendingFaculty:  ()          => api.get('/hod/pending-faculty'),
  getFacultyList:     ()          => api.get('/hod/faculty-list'),
  approveFaculty:     (id)        => api.put(`/hod/approve-faculty/${id}`),
  discussionFaculty:  (id, data)  => api.put(`/hod/discussion-faculty/${id}`, data),
  getPendingUploads:  ()          => api.get('/uploads/hod/pending'),
  getApprovedUploads: ()          => api.get('/uploads/hod/approved'),
  getRejectedUploads: ()          => api.get('/uploads/hod/rejected'),
  approveUpload:      (id)        => api.put(`/uploads/hod/approve/${id}`),
  rejectUpload:       (id, data)  => api.put(`/uploads/hod/reject/${id}`, data),
  reopenUpload:       (id, data)  => api.put(`/uploads/reopen/${id}`, data),
  discussUpload:      (id, data)  => api.put(`/uploads/discussion/${id}`, data),
  getFacultyUploads:  (facultyId) => api.get(`/hod/faculty-uploads/${facultyId}`),
  getDepartmentUploads: ()        => api.get('/hod/department-uploads'),
};

/* ── ADMIN ── */
export const adminApi = {
  getAllUsers:           (params)    => api.get('/admin/all-users', { params }),
  getAllFaculty:         (params)    => api.get('/admin/faculty', { params }),
  createFaculty:         (data)      => api.post('/admin/faculty', data),
  updateFaculty:         (id, data)  => api.put(`/admin/faculty/${id}`, data),
  deleteFaculty:         (id)        => api.delete(`/admin/faculty/${id}`),
  bulkDeleteFaculty:     (ids)       => api.post('/admin/faculty/bulk-delete', { ids }),
  getPendingFaculty:     ()          => api.get('/admin/pending-faculty'),
  approveFaculty:        (id)        => api.put(`/admin/approve/faculty/${id}`),
  getAllHods:            ()          => api.get('/admin/hods'),
  getPendingHods:        ()          => api.get('/admin/pending-hods'),
  approveHod:            (id)        => api.put(`/admin/approve-hod/${id}`),
  hodDiscussion:         (id, data)  => api.post(`/admin/hod-discussion/${id}`, data),
  getDepartments:        ()          => api.get('/admin/departments'),
  createDepartment:      (data)      => api.post('/admin/departments', data),
  updateDepartment:      (id, data)  => api.put(`/admin/departments/${id}`, data),
  deleteDepartment:      (id)        => api.delete(`/admin/departments/${id}`),
  bulkDeleteDepartments: (ids)       => api.post('/admin/departments/bulk-delete', { ids }),
  removeApprovedHod:     (id)        => api.delete(`/admin/remove-hod/${id}`),
  getTopDepartments:     ()          => api.get('/admin/top-departments'),
  getActivityStats:      ()          => api.get('/admin/activity-stats'),
  getPendingUploads:     ()          => api.get('/uploads/admin/pending'),
  getApprovedUploads:    ()          => api.get('/uploads/admin/approved'),
  getRejectedUploads:    ()          => api.get('/uploads/admin/rejected'),
  approveUpload:         (id)        => api.put(`/uploads/admin/approve/${id}`),
  rejectUpload:          (id, data)  => api.put(`/uploads/admin/reject/${id}`, data),
  reopenUpload:          (id, data)  => api.put(`/uploads/reopen/${id}`, data),
  discussUpload:         (id, data)  => api.put(`/uploads/discussion/${id}`, data),
};

/* ── CATEGORIES ── */
export const categoriesApi = {
  getAll:             ()          => api.get('/categories'),
  create:             (data)      => api.post('/categories', data),
  update:             (id, data)  => api.put(`/categories/${id}`, data),
  delete:             (id)        => api.delete(`/categories/${id}`),
  bulkDelete:         (ids)       => api.post('/categories/bulk-delete', { ids }),
  // Subcategory management
  addSubcategory:     (catId, data)         => api.post(`/categories/${catId}/subcategories`, data),
  updateSubcategory:  (catId, subId, data)  => api.put(`/categories/${catId}/subcategories/${subId}`, data),
  deleteSubcategory:  (catId, subId)        => api.delete(`/categories/${catId}/subcategories/${subId}`),
  setSubcategories:   (catId, subcategories)=> api.put(`/categories/${catId}/subcategories`, { subcategories }),
};

/* ── CREDIT CONFIG ── */
export const creditConfigApi = {
  getRules:           ()          => api.get('/credit-config/rules'),
  createRule:         (data)      => api.post('/credit-config/rules', data),
  updateRule:         (id, data)  => api.put(`/credit-config/rules/${id}`, data),
  deleteRule:         (id)        => api.delete(`/credit-config/rules/${id}`),
  bulkDeleteRules:    (ids)       => api.post('/credit-config/rules/bulk-delete', { ids }),
  resetDefaults:      ()          => api.post('/credit-config/rules/reset-defaults'),
  getAll:             ()          => api.get('/credit-config/all'),
  getByType:          (type)      => api.get(`/credit-config/${type}`),
  setByType:          (type, data)=> api.post(`/credit-config/${type}`, data),
};

/* ── RANKINGS ── */
export const rankingApi = {
  getRankings:        (params)    => api.get('/ranking', { params }),
  getMyRank:          ()          => api.get('/rank'),
};

/* ── NOTIFICATIONS ── */
export const notificationApi = {
  getAll:             ()          => api.get('/notifications'),
  markAsRead:         (id)        => api.put(`/notifications/${id}/read`),
  markAllAsRead:      ()          => api.put('/notifications/read-all'),
  delete:             (id)        => api.delete(`/notifications/${id}`),
  clearRead:          ()          => api.delete('/notifications/clear-read'),
};

/* ── REPORTS & ANALYTICS ── */
export const reportApi = {
  getAnalytics:        ()          => api.get('/reports/analytics'),
  getFacultyPortfolio: (id)        => api.get(`/reports/portfolio/${id}`),
  getReports:          (params)    => api.get('/reports', { params }),
};

/* ── DEPARTMENT ACTIVITIES & CALENDAR ── */
export const activityApi = {
  getActivities:      (params)    => api.get('/activities', { params }),
  createActivity:     (data)      => api.post('/activities', data),
  updateActivity:     (id, data)  => api.put(`/activities/${id}`, data),
  deleteActivity:     (id)        => api.delete(`/activities/${id}`),
};

/* ── PBAS APPRAISAL ── */
export const pbasApi = {
  getRules:           (role)      => api.get(`/pbas/rules/${role}`),
  calculate:          (data)      => api.post('/pbas/calculate', data),
  syncActivities:     (data)      => api.post('/pbas/sync-activities', data),
  saveAppraisal:      (data)      => api.post('/pbas', data),
  getMyAppraisal:     (year)      => api.get(`/pbas/my/${year}`),
  submitAppraisal:    (id)        => api.put(`/pbas/${id}/submit`),
  getFacultyScore:    (fId, year) => api.get(`/pbas/faculty-score/${fId}`, { params: { academicYear: year } }),
  getForReview:       (fId, year) => api.get(`/pbas/review/${fId}/${year}`),
  getDeptAppraisals:  (year)      => api.get(`/pbas/department/${year}`),
  getAllAppraisals:    (year)      => api.get(`/pbas/all/${year}`),
  recallAppraisal:    (id)        => api.put(`/pbas/${id}/recall`),
  updateHodScores:    (id, data)  => api.put(`/pbas/${id}/hod-scores`, data),
  updateIfacScores:   (id, data)  => api.put(`/pbas/${id}/ifac-scores`, data),
  requestRevision:    (id, data)  => api.put(`/pbas/${id}/revision`, data),
};

/* ── ACADEMIC YEARS & ARCHIVAL ── */
export const academicYearApi = {
  getAll:             ()          => api.get('/academic-years'),
  getCurrent:         ()          => api.get('/academic-years/current'),
  create:             (data)      => api.post('/academic-years', data),
  setCurrent:         (id)        => api.put(`/academic-years/${id}/set-current`),
  update:             (id, data)  => api.put(`/academic-years/${id}`, data),
  delete:             (id)        => api.delete(`/academic-years/${id}`),
};

