/**
 * Discriminated result type for Server Actions.
 *
 * Use a `switch (result.success)` in callers to narrow the union and access
 * either `data` (on success) or `error` (on failure) without any.
 */
export type AuthSuccess<T = void> = { success: true; data: T };
export type AuthError = { success: false; error: string };
export type AuthResult<T = void> = AuthSuccess<T> | AuthError;

/**
 * Session-bearing payload returned by the login Server Action.
 *
 * Mirrors the relevant parts of Better Auth's signInEmail response —
 * the session token plus the user record (which carries the `role`
 * additional field configured in `auth-instance.ts`).
 */
export type LoginSession = {
  token: string;
  user: AuthUser;
};

/**
 * User record returned by the auth Server Actions.
 *
 * `role` is the additional field added by the Better Auth `user` config
 * — it is always present on the response because we declared it as
 * `required: true` in `auth-instance.ts`.
 */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};
