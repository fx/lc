import { customType, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Custom type for BYTEA (binary data) column
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
  toDriver(value: Buffer): Buffer {
    return value
  },
  fromDriver(value: Buffer): Buffer {
    return value
  },
})

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

export const images = pgTable(
  'images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentHash: text('content_hash').notNull().unique(),
    originalUrl: text('original_url'),
    mimeType: text('mime_type').notNull(),
    data: bytea('data').notNull(),
    thumbnail: bytea('thumbnail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('images_created_at_idx').on(table.createdAt)],
)

export type Image = typeof images.$inferSelect
export type NewImage = typeof images.$inferInsert
