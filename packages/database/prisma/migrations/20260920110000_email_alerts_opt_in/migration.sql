-- Email alerts become opt-in: a workspace with no EMAIL channel now receives
-- nothing, where before it silently fell back to emailing the owner.
--
-- That flip must not apply retroactively. Every workspace that exists RIGHT
-- NOW is already receiving owner-addressed alerts and is entitled to keep
-- them; going quiet on a paying customer's critical regressions without them
-- asking is not a default change, it is an outage they cannot see.
--
-- So this writes down what each existing workspace is already getting, as an
-- explicit, visible, switch-off-able row. After this migration the absence of
-- a row means "new workspace, never opted in" - which is exactly what the new
-- default needs it to mean.
INSERT INTO "notification_channel" ("id", "workspaceId", "type", "enabled", "configuration", "createdAt", "updatedAt")
SELECT
    -- cuid-shaped enough for a column that only ever needs to be unique.
    'c' || substr(md5(random()::text || clock_timestamp()::text || w."id"), 1, 24),
    w."id",
    'EMAIL'::"NotificationChannelType",
    true,
    jsonb_build_object(
        'recipients', jsonb_build_array(u."email"),
        'minSeverity', 'HIGH',
        'failureAlerts', true,
        'weeklyReports', true
    ),
    NOW(),
    NOW()
FROM "workspace" w
JOIN "user" u ON u."id" = w."ownerId"
WHERE u."email" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM "notification_channel" nc
      WHERE nc."workspaceId" = w."id" AND nc."type" = 'EMAIL'
  );
