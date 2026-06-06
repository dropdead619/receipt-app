// id текущего пользователя, устойчивый к форме useSupabaseUser():
// на клиенте модуль отдаёт JWT-claims (id в `sub`), на сервере — объект User (`id`).
// Сессия же содержит user.id единообразно — берём из неё как основной источник.
export function currentUserId(): string | null {
  const user = useSupabaseUser().value as { sub?: string; id?: string } | null
  const session = useSupabaseSession().value
  return user?.sub ?? user?.id ?? session?.user?.id ?? null
}
