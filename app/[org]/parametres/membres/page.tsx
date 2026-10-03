import { redirect } from 'next/navigation'

// Legacy URL of the members page (now "Utilisateurs"): keep old bookmarks and invitation e-mails working.
export default async function LegacyMembers({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params
  redirect(`/${org}/parametres/utilisateurs`)
}
