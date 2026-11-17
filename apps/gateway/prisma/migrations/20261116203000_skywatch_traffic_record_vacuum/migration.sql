-- Storage settings for `airport_traffic_record`. Hand-written: Prisma's schema can't express table storage parameters.
--
-- The table is rewritten all day by the traffic task, and the queries behind the traffic charts read exactly the days
-- being rewritten. Autovacuum's default is to wait until a fifth of the table is dead (about 550,000 rows here), which
-- is a day or two of churn, and in the meantime those queries read 8 to 12 times the pages they need to.
--
-- Vacuum once ten thousand rows are dead instead (a few times a day), however big the table gets. The 344,000 dead rows
-- already there get cleaned by the first pass; no VACUUM FULL is needed. Pages are left a little room (fillfactor) so an
-- updated row can stay on its page, which is what lets Postgres skip adding new index entries for it. It applies to
-- pages written from now on; the existing ones are left as they are.

-- AlterTable
ALTER TABLE "airport_traffic_record" SET (
    autovacuum_vacuum_scale_factor = 0,
    autovacuum_vacuum_threshold = 10000,
    fillfactor = 85
);
