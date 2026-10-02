import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './root-layout'
import PlaceholderPage from '@/pages/placeholder/placeholder-page'
import NotFoundPage from '@/pages/not-found-page'

const LandingPage = lazy(() => import('@/pages/landing/landing-page'))

function Loading() {
  return (
    <div className="container-page py-20">
      <div className="skeleton mx-auto h-8 w-2/3 max-w-md rounded-[var(--radius-sm)]" />
    </div>
  )
}

const stub = (title: string, specId: string, week: string) => ({
  element: <PlaceholderPage title={title} specId={specId} week={week} />,
})

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: (
          <Suspense fallback={<Loading />}>
            <LandingPage />
          </Suspense>
        ),
      },
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
      { path: '/login', ...stub('Log in', 'A2', 'Week 1') },
      { path: '/signup', ...stub('Sign up', 'A1', 'Week 1') },
      { path: '/dashboard', ...stub('Student dashboard', 'S2', 'Week 3') },
      { path: '/settings', ...stub('Profile & settings', 'S8', 'Week 4') },
      { path: '/notifications', ...stub('Notifications', 'Shared', 'Week 4') },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
