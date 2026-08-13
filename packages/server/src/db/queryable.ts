/** The subset of `pg.Pool`'s query API repositories need — kept narrow for testability. */
export interface Queryable {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
