'use client';

import * as React from 'react';
import {
  useAdminUsers,
  useInviteAdminUser,
  useResendInvite,
  useUpdateAdminUser,
} from '../../../modules/admin-dashboard/hooks/use-admin-users';
import {
  ADMIN_ROLE_DESCRIPTION,
  ADMIN_ROLE_LABEL,
  type AdminRole,
  type AdminUser,
} from '../../../modules/admin-dashboard/interfaces/admin-users';
import {
  AdminTopbar,
  Panel,
  Pill,
  adminUi as ui,
} from '../../../modules/admin-dashboard/components/admin-ui';
import { useSession } from '../../../modules/auth/hooks/use-auth';
import { Skeleton } from '../../../shared/components/skeleton';
import { cn, initials } from '../../../shared/lib/utils';
import styles from '../styles/admin-users.module.css';

const ROLES: AdminRole[] = ['SUPER_ADMIN', 'RESERVATIONS', 'CONTENT_EDITOR'];

const CAPABILITIES: Array<{ label: string; who: string }> = [
  { label: 'Confirm / reject bookings', who: 'Super · Res' },
  { label: 'Edit availability', who: 'Super · Res' },
  { label: 'Add / edit hotels', who: 'Super · Content' },
  { label: 'Publish a hotel', who: 'Super only' },
  { label: 'Manage staff', who: 'Super only' },
];

function relativeTime(value: string | null) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 2) return 'Now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (hours < 48) return 'Yesterday';
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} days ago`;
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function inviteDate(value: string | null) {
  if (!value) return 'Invited';
  return `Invited ${new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

function StatusPill({ user }: { user: AdminUser }) {
  if (user.status === 'DISABLED' || user.status === 'BANNED') return <Pill tone="neutral">Disabled</Pill>;
  if (!user.adminRole) return <Pill tone="neutral">Admin</Pill>;
  return (
    <Pill tone={user.adminRole === 'SUPER_ADMIN' ? 'success' : 'neutral'}>
      {ADMIN_ROLE_LABEL[user.adminRole]}
    </Pill>
  );
}

export default function AdminUsersPage() {
  const query = useAdminUsers();
  const invite = useInviteAdminUser();
  const update = useUpdateAdminUser();
  const resend = useResendInvite();
  const { user: currentUser } = useSession();

  const [panelOpen, setPanelOpen] = React.useState(true);
  // Set while editing an existing account; null means the panel is inviting.
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<AdminRole>('RESERVATIONS');
  const [error, setError] = React.useState<string | null>(null);

  const users = query.data ?? [];

  const resetPanel = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setRole('RESERVATIONS');
    setError(null);
  };

  const startEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.adminRole ?? 'RESERVATIONS');
    setError(null);
    setPanelOpen(true);
  };

  const submitPanel = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError('Enter the full name');
    setError(null);

    if (editingId) {
      update.mutate({ id: editingId, name: name.trim(), adminRole: role }, { onSuccess: resetPanel });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid work email');
    invite.mutate({ name: name.trim(), email: email.trim(), adminRole: role }, { onSuccess: resetPanel });
  };

  return (
    <>
      <AdminTopbar title="Admin users" meta={`${users.length} accounts`}>
        <button
          type="button"
          className={cn(ui.btn, ui.btnPrimary)}
          onClick={() => {
            resetPanel();
            setPanelOpen(true);
          }}
        >
          + Invite user
        </button>
      </AdminTopbar>

      <div className={ui.body}>
        <div className={styles.layout}>
          <Panel>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Last active</th>
                    <th className={ui.numeric}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading ? (
                    Array.from({ length: 4 }, (_, i) => (
                      <tr key={i}>
                        <td colSpan={5}>
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={ui.emptyRow}>
                        No staff accounts yet.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const disabled = user.status === 'DISABLED' || user.status === 'BANNED';
                      const invited = user.status === 'INVITED';
                      const isSelf = currentUser?.email === user.email;
                      return (
                        <tr key={user.id}>
                          <td>
                            <div className={styles.nameCell}>
                              <span
                                className={cn(
                                  styles.avatar,
                                  !disabled && !invited && styles.avatarActive,
                                  invited && styles.avatarInvited,
                                )}
                              >
                                {initials(user.name)}
                              </span>
                              <div>
                                <p className={cn(styles.name, disabled && styles.nameMuted)}>{user.name}</p>
                                {isSelf ? (
                                  <p className={styles.nameHint}>You</p>
                                ) : invited ? (
                                  <p className={cn(styles.nameHint, styles.nameHintInvite)}>Invite pending</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className={disabled || invited ? styles.emailMuted : undefined}>{user.email}</td>
                          <td>
                            <StatusPill user={user} />
                          </td>
                          <td className={disabled ? styles.emailMuted : undefined}>
                            {invited ? inviteDate(user.invitedAt) : relativeTime(user.lastActiveAt)}
                          </td>
                          <td>
                            <div className={ui.actionsCell}>
                              {invited ? (
                                <button
                                  type="button"
                                  className={ui.actionLink}
                                  disabled={resend.isPending}
                                  onClick={() => resend.mutate(user.id)}
                                >
                                  Resend
                                </button>
                              ) : disabled ? (
                                <button
                                  type="button"
                                  className={ui.actionLink}
                                  disabled={update.isPending}
                                  onClick={() => update.mutate({ id: user.id, status: 'ACTIVE' })}
                                >
                                  Restore
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className={ui.actionLink}
                                    onClick={() => startEdit(user)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className={cn(ui.actionLink, isSelf && ui.actionLinkDisabled)}
                                    disabled={update.isPending || isSelf}
                                    title={isSelf ? 'You cannot disable your own account' : undefined}
                                    onClick={() => {
                                      if (window.confirm(`Disable ${user.name}'s access?`)) {
                                        update.mutate({ id: user.id, status: 'DISABLED' });
                                      }
                                    }}
                                  >
                                    Disable
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className={styles.rail}>
            {panelOpen ? (
              <form className={styles.invitePanel} onSubmit={submitPanel}>
                <div className={styles.inviteHead}>{editingId ? 'Edit user' : 'Invite a user'}</div>
                <div className={styles.inviteBody}>
                  <div>
                    <label htmlFor="invite-name" className={ui.fieldLabel}>
                      Full name
                    </label>
                    <input
                      id="invite-name"
                      className={ui.input}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Dina Aziz"
                    />
                  </div>

                  <div>
                    <label htmlFor="invite-email" className={ui.fieldLabel}>
                      Work email
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      className={ui.input}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="dina@atrips.com"
                      readOnly={Boolean(editingId)}
                      title={editingId ? 'Email cannot be changed after the invite' : undefined}
                    />
                  </div>

                  <div>
                    <span className={ui.fieldLabel}>Role</span>
                    <div className={styles.roleOptions}>
                      {ROLES.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setRole(option)}
                          className={cn(styles.roleOption, option === role && styles.roleOptionActive)}
                          aria-pressed={option === role}
                        >
                          <span className={cn(styles.radio, option === role && styles.radioOn)} aria-hidden />
                          <span>
                            <span className={styles.roleName}>{ADMIN_ROLE_LABEL[option]}</span>
                            <span className={styles.roleDescription}>{ADMIN_ROLE_DESCRIPTION[option]}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {error ? <p className={ui.fieldError}>{error}</p> : null}

                  <button
                    type="submit"
                    className={cn(ui.btn, ui.btnPrimary, ui.btnBlock, ui.btnLg)}
                    disabled={invite.isPending || update.isPending}
                  >
                    {editingId
                      ? update.isPending
                        ? 'Saving…'
                        : 'Save changes'
                      : invite.isPending
                        ? 'Sending…'
                        : 'Send invite'}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      className={cn(ui.btn, ui.btnGhost, ui.btnBlock, ui.btnLg)}
                      onClick={resetPanel}
                    >
                      Cancel
                    </button>
                  ) : (
                    <p className={styles.inviteFootnote}>The invite link expires in 7 days.</p>
                  )}
                </div>
              </form>
            ) : null}

            <Panel>
              <div className={styles.matrixBody}>
                <h2 className={styles.matrixTitle}>What each role can do</h2>
                <div className={styles.matrixList}>
                  {CAPABILITIES.map((capability) => (
                    <div key={capability.label} className={styles.matrixRow}>
                      <span>{capability.label}</span>
                      <span className={styles.matrixWho}>{capability.who}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
