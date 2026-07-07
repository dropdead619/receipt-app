// id текущего пользователя, устойчивый к форме useSupabaseUser():
// на клиенте модуль отдаёт JWT-claims (id в `sub`), на сервере — объект User (`id`).
// Сессия же содержит user.id единообразно — берём из неё как основной источник.
export function currentUserId(): string | null {
  const user = useSupabaseUser().value as { sub?: string; id?: string } | null
  // useSupabaseSession типизирован как Omit<Session, 'user'>, но в рантайме
  // объект user в сессии присутствует — читаем через локальный тип.
  const session = useSupabaseSession().value as { user?: { id?: string } } | null
  return user?.sub ?? user?.id ?? session?.user?.id ?? null
}
