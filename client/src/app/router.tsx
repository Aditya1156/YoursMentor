import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './root-layout'
import { ProtectedRoute } from '@/features/auth/protected-route'
import PlaceholderPage from '@/pages/placeholder/placeholder-page'
import NotFoundPage from '@/pages/not-found-page'

const LandingPage = lazy(() => import('@/pages/landing/landing-page'))
const SignupPage = lazy(() => import('@/pages/auth/signup-page'))
const LoginPage = lazy(() => import('@/pages/auth/login-page'))
const VerifyEmailPage = lazy(() => import('@/pages/auth/verify-email-page'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password-page'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/reset-password-page'))
const GoogleCallbackPage = lazy(() => import('@/pages/auth/google-callback-page'))
const CompleteSignupPage = lazy(() => import('@/pages/auth/complete-signup-page'))

function Loading() {
  return (
    <div className="container-page py-20">
      <div className="skeleton mx-auto h-8 w-2/3 max-w-md rounded-[var(--radius-sm)]" />
    </div>
  )
}

const page = (element: ReactNode) => ({
  element: <Suspense fallback={<Loading />}>{element}</Suspense>,
})

const stub = (title: string, specId: string, week: string) => ({
  element: <PlaceholderPage title={title} specId={specId} week={week} />,
})

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // ---- public ----
      { path: '/', ...page(<LandingPage />) },
      { path: '/mentors', ...stub('Mentor directory', 'P2', 'Week 2') },
      { path: '/mentors/:id', ...stub('Mentor profile', 'P3', 'Week 2') },
      { path: '/sessions', ...stub('Group sessions', 'P4', 'Week 3') },
      { path: '/sessions/:id', ...stub('Session detail', 'P5', 'Week 3') },
      { path: '/become-a-mentor', ...stub('Become a mentor', 'P6', 'Week 4') },
      { path: '/about', ...stub('About OneStep', 'P7', 'Week 4') },
      { path: '/terms', ...stub('Terms of use', 'P8', 'Week 4') },
      { path: '/privacy', ...stub('Privacy policy', 'P8', 'Week 4') },
      { path: '/refund-policy', ...stub('Refund policy', 'P8', 'Week 4') },
      { path: '/code-of-conduct', ...stub('Code of conduct', 'P8', 'Week 4') },
      { path: '/contact', ...stub('Contact & grievance', 'P8', 'Week 4') },

      // ---- auth (A1–A4) ----
      { path: '/signup', ...page(<SignupPage />) },
      { path: '/login', ...page(<LoginPage />) },
      { path: '/verify-email', ...page(<VerifyEmailPage />) },
      { path: '/forgot-password', ...page(<ForgotPasswordPage />) },
      { path: '/reset-password', ...page(<ResetPasswordPage />) },
      { path: '/auth/callback', ...page(<GoogleCallbackPage />) },
      { path: '/complete-signup', ...page(<CompleteSignupPage />) },

      // ---- signed in ----
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/onboarding', ...stub('Matching quiz', 'S1', 'Week 2') },
          { path: '/dashboard', ...stub('Student dashboard', 'S2', 'Week 3') },
          { path: '/my-sessions', ...stub('My sessions', 'S5', 'Week 3') },
          { path: '/settings', ...stub('Profile & settings', 'S8', 'Week 4') },
          { path: '/notifications', ...stub('Notifications', 'Shared', 'Week 4') },
        ],
      },
      {
        element: <ProtectedRoute roles={['mentor']} />,
        children: [
          { path: '/mentor/apply', ...stub('Mentor application', 'M1', 'Week 1') },
          { path: '/mentor', ...stub('Mentor dashboard', 'M2', 'Week 4') },
        ],
      },
      {
        element: <ProtectedRoute roles={['admin']} />,
        children: [{ path: '/admin', ...stub('Admin dashboard', 'AD1', 'Week 2') }],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
