import { getAssignments } from "@/lib/actions/assignments"
import { DashboardClient } from "@/components/dashboard-client"

export default async function Page() {
  const assignments = await getAssignments()

  return <DashboardClient initialAssignments={assignments} />
}
