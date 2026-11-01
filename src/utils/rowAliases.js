/**
 * utils/rowAliases.js
 *
 * Shape helpers for database rows.
 *
 * The database uses snake_case columns, while parts of the interface were
 * written against a camelCase API. Adding camelCase aliases keeps every view
 * working without rewriting them.
 */

/**
 * Adds camelCase aliases to a database row.
 *
 * @param {Object} row - A row from the database
 * @returns {Object} The row with camelCase aliases
 */
export const withAliases = (row) => {
  if (!row || typeof row !== "object") return row;

  const result = { ...row };
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z0-9])/g, (_, character) =>
      character.toUpperCase(),
    );
    if (camel !== key && !(camel in result)) result[camel] = value;
  }
  return result;
};

/**
 * Applies {@link withAliases} to a list of rows.
 */
export const withAliasesAll = (rows) =>
  Array.isArray(rows) ? rows.map(withAliases) : rows;

export default withAliases;
