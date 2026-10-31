import { Construction } from 'lucide-react'
import { Card, EmptyState, PageHeader } from '@/components/ui'

/** Placeholder page until the owner builds the feature. */
export function ComingSoon({ title, owner, task }: { title: string; owner: string; task: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={<Construction className="h-6 w-6" />}
          title="Coming soon"
          description={`Owner: ${owner} (${task}). See docs/tasks/ for the spec.`}
        />
      </Card>
    </>
  )
}
