import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={<SearchX className="h-6 w-6" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or you don't have access to it."
        action={
          <Link to="/" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Go to home
          </Link>
        }
      />
    </div>
  )
}
