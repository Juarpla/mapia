CREATE TABLE `administrative_areas` (
  `ubigeo` text PRIMARY KEY NOT NULL, `name` text NOT NULL, `level` text NOT NULL,
  `parent_ubigeo` text, `geometry_geojson` text, `source` text NOT NULL,
  `source_version` text, `imported_at` text NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `roads` (
  `id` text PRIMARY KEY NOT NULL, `external_id` text, `name` text NOT NULL,
  `road_class` text NOT NULL, `responsible_authority` text NOT NULL, `source` text NOT NULL,
  `license` text, `source_version` text, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE `road_segments` (
  `id` text PRIMARY KEY NOT NULL, `road_id` text NOT NULL, `ubigeo` text NOT NULL,
  `code` text NOT NULL, `kind` text NOT NULL, `surface` text NOT NULL, `length_m` real NOT NULL,
  `start_reference` text, `end_reference` text, `geometry_geojson` text NOT NULL,
  `responsible_authority` text NOT NULL, `status` text DEFAULT 'borrador' NOT NULL,
  `published_at` text, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`road_id`) REFERENCES `roads`(`id`), FOREIGN KEY (`ubigeo`) REFERENCES `administrative_areas`(`ubigeo`)
);
CREATE UNIQUE INDEX `road_segments_code_idx` ON `road_segments` (`code`);
CREATE TABLE `observations` (
  `id` text PRIMARY KEY NOT NULL, `segment_id` text, `author_user_id` text, `observed_at` text NOT NULL,
  `latitude` real, `longitude` real, `condition_score` integer, `comment` text, `source` text NOT NULL,
  `source_record_id` text, `source_version` text, `status` text DEFAULT 'borrador' NOT NULL,
  `imported_at` text NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (`segment_id`) REFERENCES `road_segments`(`id`)
);
CREATE UNIQUE INDEX `observations_source_record_idx` ON `observations` (`source`,`source_record_id`);
CREATE TABLE `evidence` (`id` text PRIMARY KEY NOT NULL, `observation_id` text NOT NULL, `object_key` text NOT NULL, `media_type` text NOT NULL, `sha256` text NOT NULL, `captured_at` text, `is_public` integer DEFAULT false NOT NULL, `approved_object_key` text, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (`observation_id`) REFERENCES `observations`(`id`));
CREATE TABLE `hazard_events` (`id` text PRIMARY KEY NOT NULL, `hazard_type` text NOT NULL, `occurred_at` text NOT NULL, `geometry_geojson` text NOT NULL, `severity` integer NOT NULL, `source` text NOT NULL, `license` text, `source_version` text, `imported_at` text NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE `satellite_candidates` (`id` text PRIMARY KEY NOT NULL, `segment_id` text, `hazard_type` text NOT NULL, `sensor` text NOT NULL, `acquired_at` text NOT NULL, `baseline_at` text NOT NULL, `before_object_key` text, `after_object_key` text, `geometry_geojson` text NOT NULL, `confidence` integer NOT NULL, `status` text DEFAULT 'borrador' NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (`segment_id`) REFERENCES `road_segments`(`id`));
CREATE TABLE `priority_snapshots` (`id` text PRIMARY KEY NOT NULL, `segment_id` text NOT NULL, `model_version` text NOT NULL, `condition_score` integer NOT NULL, `connectivity_score` integer NOT NULL, `hazard_score` integer NOT NULL, `priority_score` integer NOT NULL, `confidence_score` integer NOT NULL, `intervention` text NOT NULL, `rationale_json` text NOT NULL, `calculated_at` text NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (`segment_id`) REFERENCES `road_segments`(`id`));
CREATE TABLE `imports` (`id` text PRIMARY KEY NOT NULL, `source` text NOT NULL, `source_version` text NOT NULL, `sha256` text NOT NULL, `imported_by` text, `status` text NOT NULL, `total_rows` integer DEFAULT 0 NOT NULL, `linked_rows` integer DEFAULT 0 NOT NULL, `unmatched_rows` integer DEFAULT 0 NOT NULL, `errors_json` text, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL, `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE UNIQUE INDEX `imports_source_hash_idx` ON `imports` (`source`,`sha256`);
CREATE TABLE `reviews` (`id` text PRIMARY KEY NOT NULL, `entity_type` text NOT NULL, `entity_id` text NOT NULL, `reviewer_user_id` text NOT NULL, `action` text NOT NULL, `from_status` text NOT NULL, `to_status` text NOT NULL, `comment` text, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE `user_roles` (`user_id` text PRIMARY KEY NOT NULL, `role` text NOT NULL, `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL);
