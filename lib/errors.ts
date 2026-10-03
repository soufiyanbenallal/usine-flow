type PgError = { code?: string; message: string }

/** Maps Postgres / PostgREST errors to messages users can act on. */
export function toUserError(error: PgError): Error {
  switch (error.code) {
    case '42501':
      return new Error('Vous n’avez pas les droits pour effectuer cette action.')
    case '23505':
      return new Error('Cet élément existe déjà (valeur en double).')
    case '23503':
      return new Error('Cet élément est lié à d’autres données et ne peut pas être supprimé ou modifié.')
    case '23514':
      return new Error('Une valeur est hors des limites autorisées.')
    case '23502':
      return new Error('Un champ obligatoire est manquant.')
    default:
      return new Error(error.message)
  }
}
