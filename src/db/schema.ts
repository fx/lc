import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const instances = pgTable(
  'instances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    endpointUrl: text('endpoint_url').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('instances_created_at_idx').on(table.createdAt)],
)

export type Instance = typeof instances.$inferSelect
export type NewInstance = typeof instances.$inferInsert
