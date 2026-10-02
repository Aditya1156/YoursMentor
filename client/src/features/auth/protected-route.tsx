import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'

export function ProtectedRoute({
  roles,
}: {
  roles?: Array<'student' | 'mentor' | 'admin'>
}) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="container-page py-20">
        <div className="skeleton mx-auto h-8 w-2/3 max-w-md" />
      </div>
    )
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}`
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }

  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}
