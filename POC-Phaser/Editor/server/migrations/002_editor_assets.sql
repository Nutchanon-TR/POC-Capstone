CREATE TABLE editor_assets (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fingerprint text NOT NULL UNIQUE,
  name text NOT NULL,
  family text NOT NULL CHECK (family IN ('Prop', 'Layout', 'Floor')),
  image bytea NOT NULL,
  width integer NOT NULL CHECK (width BETWEEN 1 AND 2048),
  height integer NOT NULL CHECK (height BETWEEN 1 AND 2048),
  display_width double precision NOT NULL CHECK (display_width > 0),
  depth_y double precision NOT NULL,
  collision jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
