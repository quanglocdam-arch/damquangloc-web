
export const ADMIN_EMAIL = 'damquangloc.offical@gmail.com'

export const CLIENT_MAPPING: Record<string, number[]> = {

  'dhphuongquynh111@gmail.com':          [128704785], // Copy1_Quynh

  'tinidam@gmail.com':                   [128746604], // Copy2_Tinidam

  'damquangloc1301@gmail.com':           [128746596], // Copy3_Loc1301

  'locloc130100.290303@gmail.com':       [263448822], // Copy5_Locloc

}

export function getAllowedLogins(email: string): number[] | 'all' {

  if (email === ADMIN_EMAIL) return 'all'

  return CLIENT_MAPPING[email] || []

}

export function isAdmin(email: string): boolean {

  return email === ADMIN_EMAIL

}

