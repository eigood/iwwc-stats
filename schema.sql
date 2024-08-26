CREATE DATABASE "iwwc-stats";
CREATE USER "iwwc-stats";
ALTER USER "iwwc-stats" LOGIN;
GRANT ALL PRIVILEGES ON DATABASE "iwwc-stats" TO "iwwc-stats";
\c "iwwc-stats" -
GRANT ALL PRIVILEGES ON SCHEMA public TO "iwwc-stats";
\c - "iwwc-stats"

\conninfo
show search_path;

CREATE SEQUENCE IF NOT EXISTS agent_pk;
CREATE TABLE IF NOT EXISTS agent (
	agent_id	INTEGER DEFAULT nextval('agent_pk') NOT NULL PRIMARY KEY,
	name		VARCHAR(255) NOT NULL UNIQUE
);

CREATE SEQUENCE IF NOT EXISTS stat_pk;
CREATE TABLE IF NOT EXISTS stat (
	stat_id		INTEGER DEFAULT nextval('stat_pk') NOT NULL PRIMARY KEY,
	name		VARCHAR(255) NOT NULL UNIQUE
);

CREATE SEQUENCE IF NOT EXISTS upload_pk;
CREATE TABLE IF NOT EXISTS upload (
	upload_id	INTEGER DEFAULT nextval('upload_pk') NOT NULL PRIMARY KEY,
	agent_id	INTEGER REFERENCES agent(agent_id),
	uploaded_at	TIMESTAMP NOT NULL,
	faction		VARCHAR(255),
	UNIQUE		(agent_id, uploaded_at)

);
CREATE INDEX upload_at ON upload(uploaded_at);

CREATE SEQUENCE IF NOT EXISTS stat_pk;
CREATE TABLE IF NOT EXISTS history (
	upload_id	INTEGER REFERENCES upload(upload_id),
	stat_id		INTEGER REFERENCES stat(stat_id),
	num_value	DECIMAL,
	str_value	VARCHAR(255),
	PRIMARY KEY	(stat_id, upload_id)
);

CREATE SEQUENCE IF NOT EXISTS source_pk;
CREATE TABLE IF NOT EXISTS source (
	source_id	INTEGER DEFAULT nextval('source_pk') NOT NULL PRIMARY KEY,
	name		VARCHAR(255) NOT NULL UNIQUE
);

CREATE SEQUENCE IF NOT EXISTS league_pk;
CREATE TABLE IF NOT EXISTS league (
	league_id	INTEGER DEFAULT nextval('league_pk') NOT NULL PRIMARY KEY,
	source_id	INTEGER REFERENCES source(source_id),
	external_id	TEXT NOT NULL,
	UNIQUE		(source_id, external_id)
)

CREATE TABLE IF NOT EXISTS league_membership (
	league_id	INTEGER REFERENCES league(league_id),
	agent_id	INTEGER REFERENCES agent(agent_id),
	from_date	TIMESTAMP WITH TIME ZONE NOT NULL,
	thru_date	TIMESTAMP WITH TIME ZONE,
	UNIQUE		(league_id, agent_id, from_date)
)

CREATE OR REPLACE FUNCTION isnumeric(text)
RETURNS pg_catalog.bool AS $BODY$
DECLARE x NUMERIC;
BEGIN
    x = $1::NUMERIC;
    RETURN TRUE;
EXCEPTION WHEN others THEN
    RETURN FALSE;
END;
$BODY$
  LANGUAGE 'plpgsql' IMMUTABLE STRICT  COST 100
;

DROP FUNCTION IF EXISTS import_agent_upload(agent_name TEXT, agent_info JSONB);
CREATE FUNCTION import_agent_upload(_agent_name TEXT, _agent_info JSONB) RETURNS VOID
SECURITY INVOKER AS $$
DECLARE
	_agent_id INTEGER;
	_upload_id INTEGER;
	_uploaded_at TIMESTAMP;
	_old_faction TEXT;
	_new_faction TEXT;
	_key TEXT;
	_value TEXT;
	_stat_id INTEGER;
	_new_num_value DECIMAL;
	_new_str_value TEXT;
BEGIN
	INSERT INTO agent(name) VALUES (_agent_name) ON CONFLICT DO NOTHING;
	SELECT agent_id INTO _agent_id FROM agent WHERE name = _agent_name;
	_uploaded_at := (_agent_info ->> 'last_submit')::timestamp;
	_new_faction := (_agent_info ->> 'faction');
	INSERT INTO upload(agent_id, uploaded_at, faction) VALUES (_agent_id, _uploaded_at, _new_faction) ON CONFLICT DO NOTHING;
	SELECT upload_id, faction INTO _upload_id, _old_faction FROM upload WHERE agent_id = _agent_id AND uploaded_at = _uploaded_at;
	IF _new_faction != _old_faction THEN
		UPDATE upload SET faction = _new_faction WHERE agent_id = _agent_id AND uploaded_at = _uploaded_at;
	END IF;
	-- RAISE NOTICE 'import_agent_upload(%=%, %=%)" ', _agent_name, _agent_id, _uploaded_at, _upload_id;
	FOR _key, _value IN
		SELECT * FROM jsonb_each_text(_agent_info)
	LOOP
		IF _key = 'faction' THEN

		ELSIF _key = 'last_submit' THEN

		ELSE
			INSERT INTO stat(name) VALUES (_key) ON CONFLICT DO NOTHING;
			SELECT stat_id INTO _stat_id FROM stat WHERE name = _key;
			_new_num_value := CASE isnumeric(_value) WHEN TRUE THEN _value::numeric ELSE NULL END;
			_new_str_value := CASE isnumeric(_value) WHEN TRUE THEN NULL ELSE _value END;
			INSERT INTO history
				(upload_id, stat_id, num_value, str_value)
				VALUES
				(
					_upload_id,
					_stat_id,
					_new_num_value,
					_new_str_value
				)
			ON CONFLICT DO NOTHING;
			IF NOT EXISTS (SELECT 1 FROM history WHERE upload_id = _upload_id AND stat_id = _stat_id AND num_value = _new_num_value AND str_value = _new_str_value) THEN
				UPDATE history SET num_value = _new_num_value, str_value = _new_str_value WHERE upload_id = _upload_id AND stat_id = _stat_id;
			END IF;
		END IF;

	END LOOP;
END
$$ LANGUAGE 'plpgsql' VOLATILE;

CREATE SEQUENCE IF NOT EXISTS source_pk;
CREATE TABLE IF NOT EXISTS source (
	source_id	INTEGER DEFAULT nextval('source_pk') NOT NULL PRIMARY KEY,
	name		VARCHAR(255) NOT NULL UNIQUE
);

CREATE SEQUENCE IF NOT EXISTS league_pk;
CREATE TABLE IF NOT EXISTS league (
	league_id	INTEGER DEFAULT nextval('league_pk') NOT NULL PRIMARY KEY,
	source_id	INTEGER REFERENCES source(source_id),
	external_id	TEXT NOT NULL,
	UNIQUE		(source_id, external_id)
);

CREATE TABLE IF NOT EXISTS league_membership (
	league_id	INTEGER REFERENCES league(league_id),
	agent_id	INTEGER REFERENCES agent(agent_id),
	from_date	TIMESTAMP WITH TIME ZONE NOT NULL,
	thru_date	TIMESTAMP WITH TIME ZONE,
	UNIQUE		(league_id, agent_id, from_date)
);

CREATE OR REPLACE FUNCTION _ensure_agent_id(_agent_name TEXT) RETURNS INTEGER
SECURITY INVOKER AS $$
DECLARE
	_agent_id INTEGER;
BEGIN
	INSERT INTO agent(name) VALUES (_agent_name) ON CONFLICT DO NOTHING;
	SELECT agent_id INTO _agent_id FROM agent WHERE name = _agent_name;
	RETURN _agent_id;
END
$$ LANGUAGE 'plpgsql' VOLATILE;

CREATE OR REPLACE FUNCTION _ensure_stat_id(_stat_name TEXT) RETURNS INTEGER
SECURITY INVOKER AS $$
DECLARE
	_stat_id INTEGER;
BEGIN
	INSERT INTO stat(name) VALUES (_stat_name) ON CONFLICT DO NOTHING;
	SELECT stat_id INTO _stat_id FROM stat WHERE name = _stat_name;
	RETURN _stat_id;
END
$$ LANGUAGE 'plpgsql' VOLATILE;

CREATE OR REPLACE FUNCTION _ensure_upload_id(_agent_id INTEGER, _uploaded_at TIMESTAMP WITHOUT TIME ZONE, _faction TEXT) RETURNS INTEGER
SECURITY INVOKER AS $$
DECLARE
	_upload_id INTEGER;
	_current_faction TEXT;
BEGIN
	INSERT INTO upload(agent_id, uploaded_at, faction) VALUES (_agent_Id, _uploaded_at, _faction) ON CONFLICT DO NOTHING;
	SELECT upload_id, faction INTO _upload_id, _current_faction FROM upload WHERE agent_id = _agent_id AND uploaded_at = _uploaded_at;
	IF _faction != _current_faction THEN
		UPDATE upload SET faction = _faction WHERE agent_id = _agent_id AND uploaded_at = _uploaded_at;
	END IF;
	RETURN _upload_id;
END
$$ LANGUAGE 'plpgsql' VOLATILE;

CREATE OR REPLACE FUNCTION _ensure_source_id(_source_name TEXT) RETURNS INTEGER
SECURITY INVOKER AS $$
DECLARE
	_source_id INTEGER;
BEGIN
	INSERT INTO source(name) VALUES (_source_name) ON CONFLICT DO NOTHING;
	SELECT source_id INTO _source_id FROM source WHERE name = _source_name;
	RETURN _source_id;
END
$$ LANGUAGE 'plpgsql' VOLATILE;

CREATE OR REPLACE FUNCTION _ensure_league_id(_source_id INTEGER, _league_name TEXT) RETURNS INTEGER
SECURITY INVOKER AS $$
DECLARE
	_league_id INTEGER;
BEGIN
	INSERT INTO league(source_id, external_id) VALUES (_source_id, _league_name) ON CONFLICT DO NOTHING;
	SELECT league_id INTO _league_id FROM league WHERE source_id = _source_id AND external_id = _league_name;
	RETURN _league_id;
END
$$ LANGUAGE 'plpgsql' VOLATILE;

CREATE OR REPLACE FUNCTION _ensure_history_entry(_upload_id INTEGER, _stat_name TEXT, _stat_value JSONB) RETURNS VOID
SECURITY INVOKER AS $$
DECLARE
	_stat_id INTEGER := _ensure_stat_id(_stat_name);
	_num_value DECIMAL;
	_str_value TEXT;
BEGIN
	CASE jsonb_typeof(_stat_value)
		WHEN 'string', 'number' THEN
		ELSE
			RAISE EXCEPTION 'Unknown type of value % => %', _stat_name, _stat_value;
	END CASE;
	_num_value := CASE jsonb_typeof(_stat_value) WHEN 'number' THEN _stat_value ELSE NULL END;
	_str_value := CASE jsonb_typeof(_stat_value) WHEN 'string' THEN _stat_value ELSE NULL END;
	INSERT INTO history
		(upload_id, stat_id, num_value, str_value)
		VALUES
		(
			_upload_id,
			_stat_id,
			_num_value,
			_str_value
		)
		ON CONFLICT DO NOTHING;
	IF NOT EXISTS (SELECT 1 FROM history WHERE upload_id = _upload_id AND stat_id = _stat_id AND num_value = _num_value AND str_value = _str_value) THEN
		UPDATE history SET num_value = _num_value, str_value = _str_value WHERE upload_id = _upload_id AND stat_id = _stat_id;
	END IF;
END
$$ LANGUAGE 'plpgsql' VOLATILE;

DROP FUNCTION IF EXISTS bulk_as_import(_source_name TEXT, _league_name TEXT, _timestamp TEXT, _custom JSONB);
CREATE FUNCTION bulk_as_import(_source_name TEXT, _league_name TEXT, _timestamp TEXT, _custom JSONB) RETURNS VOID
SECURITY INVOKER AS $$
DECLARE
	_source_id INTEGER := _ensure_source_id(_source_name);
	_league_id INTEGER := _ensure_league_id(_source_id, _league_name);
	_from_date TIMESTAMP WITH TIME ZONE := _timestamp::TIMESTAMP WITH TIME ZONE;
	_agent_name TEXT;
	_agent_info JSONB;
	_key TEXT;
	_value JSONB;
	_agent_id INTEGER;
	_upload_id INTEGER;
	_agent_ids INTEGER[] DEFAULT '{}';
BEGIN
	FOR _agent_name, _agent_info IN SELECT * FROM jsonb_each(_custom) LOOP
		_agent_id := _ensure_agent_id(_agent_name);
		_agent_ids := _agent_ids || _agent_id;
		_upload_id := _ensure_upload_id(_agent_id, (_agent_info ->> 'last_submit')::timestamp, (_agent_info ->> 'faction'));

		FOR _key, _value IN SELECT * FROM jsonb_each(_agent_info) LOOP
			CASE _key
				WHEN 'faction', 'last_submit' THEN
					CONTINUE;
				ELSE
			END CASE;
			PERFORM _ensure_history_entry(_upload_id, _key, _value);
		END LOOP;
	END LOOP;
	UPDATE league_membership SET thru_date = _from_date WHERE thru_date IS NULL AND league_id = league_id AND NOT agent_id = ANY (_agent_ids);
	INSERT INTO league_membership (league_id, agent_id, from_date) SELECT _league_id, arr.agent_id, _from_date FROM unnest(_agent_ids) AS arr(agent_id) WHERE arr.agent_id NOT IN (SELECT agent_id FROM league_membership WHERE league_id = _league_id AND from_date <= from_date AND thru_date IS NULL) ON CONFLICT DO NOTHING;
END
$$ LANGUAGE 'plpgsql' VOLATILE;

CREATE OR REPLACE AGGREGATE jsonb_object_agg(jsonb) (
  SFUNC = 'jsonb_concat',
  STYPE = jsonb,
  INITCOND = '{}'
);

DROP FUNCTION IF EXISTS agent_info(_upload UPLOAD);
CREATE FUNCTION agent_info(_upload upload) RETURNS JSONB
SECURITY INVOKER AS $$
	SELECT jsonb_object_agg(val::jsonb) FROM (
		SELECT json_object_agg(stat.name, history.num_value) FROM history JOIN stat USING (stat_id) WHERE history.upload_id = _upload.upload_id
		UNION ALL
		SELECT json_build_object('faction', _upload.faction)
		UNION ALL
		SELECT json_build_object('last_submit', _upload.uploaded_at)
	) a(val)
$$ LANGUAGE 'sql' STABLE;

