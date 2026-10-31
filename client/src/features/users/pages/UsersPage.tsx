import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Badge, Button, Card, DataTable, PageHeader, Pagination, SearchInput, Switch, Tabs, useToast, type BadgeTone, type Column } from '@/components/ui'
import { useAuth, type Role } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useUpdateUser, useUsers, type UserRow } from '../api'
import { NewStaffModal } from '../components/NewStaffModal'

const LIMIT = 20

const ROLE_BADGE: Record<Role, { label: string; tone: BadgeTone }> = {
  ADMIN: { label: 'Admin', tone: 'primary' },
  INTERNAL: { label: 'Staff', tone: 'info' },
  PORTAL: { label: 'Customer', tone: 'gray' },
}

const TABS = [
  { key: '', label: 'All' },
  { key: 'ADMIN', label: 'Admins' },
  { key: 'INTERNAL', label: 'Staff' },
  { key: 'PORTAL', label: 'Customers' },
]

export function UsersPage() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const role = (params.get('role') ?? '') as Role | ''
  const { data, isLoading, isError, error } = useUsers({ page, limit: LIMIT, q: q || undefined, role: role || undefined })
  const update = useUpdateUser()

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    setParams(p, { replace: true })
  }

  async function toggleActive(u: UserRow) {
    try {
      await update.mutateAsync({ id: u.id, isActive: !u.isActive })
      toast.success(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update user'))
    }
  }

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => (
        <div>
          <div className="font-medium text-gray-900">
            {u.name} {u.id === me?.id && <span className="text-xs font-normal text-gray-500">(you)</span>}
          </div>
          <div className="text-xs text-gray-500">{u.email}</div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (u) => <Badge tone={ROLE_BADGE[u.role].tone}>{ROLE_BADGE[u.role].label}</Badge> },
    { key: 'createdBy', header: 'Added by', render: (u) => u.createdBy?.name ?? (u.role === 'PORTAL' ? 'Self sign-up' : '—') },
    { key: 'createdAt', header: 'Since', render: (u) => formatDate(u.createdAt) },
    {
      key: 'isActive',
      header: 'Active',
      render: (u) => (
        <Switch
          checked={u.isActive}
          disabled={u.id === me?.id || update.isPending}
          onChange={() => toggleActive(u)}
          label={<span className="sr-only">Active</span>}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Only admins can add staff. Customers create their own accounts."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4" /> New staff member
          </Button>
        }
      />
      <Card className="p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs tabs={TABS} value={role} onChange={(key) => setParam('role', key)} />
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search name or email" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load users')}</p>
        ) : (
          <>
            <DataTable columns={columns} rows={data?.data ?? []} rowKey={(u) => u.id} loading={isLoading} emptyTitle="No users found" />
            {data && data.meta.total > 0 && (
              <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={(p) => setParam('page', String(p))} />
            )}
          </>
        )}
      </Card>
      <NewStaffModal open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
