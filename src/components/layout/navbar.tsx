import { getSessionUser } from '@/lib/session'
import { NavbarClient } from './navbar-client'

/** Server component: reads the session, hands it to the interactive shell. */
export async function Navbar() {
  const user = await getSessionUser()
  return <NavbarClient user={user} />
}
