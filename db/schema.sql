CREATE TABLE IF NOT EXISTS teachers (id serial PRIMARY KEY, name text UNIQUE NOT NULL, active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS template_cells (day text NOT NULL, room text NOT NULL, slot text NOT NULL, name text NOT NULL, PRIMARY KEY(day,room,slot));
CREATE TABLE IF NOT EXISTS weeks (id serial PRIMARY KEY, start_date date UNIQUE NOT NULL, label text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS week_cells (week_id int NOT NULL REFERENCES weeks ON DELETE CASCADE, day text NOT NULL, room text NOT NULL, slot text NOT NULL, name text, source text NOT NULL CHECK (source IN ('release','claim','swap','admin')), updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(week_id,day,room,slot));
CREATE TABLE IF NOT EXISTS swap_requests (id serial PRIMARY KEY, week_id int NOT NULL REFERENCES weeks ON DELETE CASCADE, from_teacher text NOT NULL, to_teacher text NOT NULL, from_cells jsonb NOT NULL, to_cells jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')), note text, created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz);
CREATE TABLE IF NOT EXISTS audit_log (id serial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), actor text NOT NULL, role text NOT NULL, action text NOT NULL, details jsonb NOT NULL DEFAULT '{}');
CREATE OR REPLACE FUNCTION change_week_cells(p_week int, p_actor text, p_role text, p_action text, p_cells jsonb, p_name text DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c jsonb; current_name text; regular_name text; updater text; result_name text;
BEGIN
 PERFORM pg_advisory_xact_lock(90210, p_week);
 IF NOT EXISTS (SELECT 1 FROM weeks WHERE id=p_week) THEN RAISE EXCEPTION 'Week not found'; END IF;
 FOR c IN SELECT * FROM jsonb_array_elements(p_cells) LOOP
  SELECT t.name, w.updated_by, CASE WHEN w.week_id IS NOT NULL THEN w.name ELSE t.name END INTO regular_name, updater, current_name FROM (SELECT 1) x LEFT JOIN template_cells t ON t.day=c->>'day' AND t.room=c->>'room' AND t.slot=c->>'slot' LEFT JOIN week_cells w ON w.week_id=p_week AND w.day=c->>'day' AND w.room=c->>'room' AND w.slot=c->>'slot';
  IF p_action='release' THEN
   IF p_role <> 'staff' OR NOT (p_actor = ANY(string_to_array(coalesce(current_name,''), '/'))) THEN RAISE EXCEPTION 'A selected slot is no longer yours'; END IF;
   SELECT nullif(array_to_string(array_remove(string_to_array(current_name,'/'),p_actor),'/'),'') INTO result_name;
  ELSIF p_action='claim' THEN
   IF p_role <> 'staff' OR current_name IS NOT NULL THEN RAISE EXCEPTION 'A selected slot is no longer free'; END IF; result_name:=p_actor;
  ELSIF p_action='reset' THEN
   IF p_role <> 'admin' AND NOT (p_actor = ANY(string_to_array(coalesce(regular_name,''),'/')) OR coalesce(updater=p_actor,false)) THEN RAISE EXCEPTION 'Cannot restore this slot'; END IF;
   DELETE FROM week_cells WHERE week_id=p_week AND day=c->>'day' AND room=c->>'room' AND slot=c->>'slot'; CONTINUE;
  ELSIF p_action='admin' AND p_role='admin' THEN result_name:=p_name;
  ELSE RAISE EXCEPTION 'Invalid action'; END IF;
  INSERT INTO week_cells(week_id,day,room,slot,name,source,updated_by) VALUES(p_week,c->>'day',c->>'room',c->>'slot',result_name,p_action,p_actor) ON CONFLICT(week_id,day,room,slot) DO UPDATE SET name=excluded.name,source=excluded.source,updated_by=excluded.updated_by,updated_at=now();
 END LOOP;
 INSERT INTO audit_log(actor,role,action,details) VALUES(p_actor,p_role,p_action,jsonb_build_object('week',p_week,'cells',p_cells,'name',CASE WHEN p_action='claim' THEN p_actor WHEN p_action='release' THEN NULL WHEN p_action='reset' THEN '(regular rota)' ELSE p_name END));
END $$;
CREATE OR REPLACE FUNCTION decide_swap(p_id int,p_actor text,p_role text,p_action text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r swap_requests%ROWTYPE; c jsonb; current_name text; new_name text;
BEGIN
 SELECT * INTO r FROM swap_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR r.status <> 'pending' OR p_role <> 'staff' THEN RAISE EXCEPTION 'Request is no longer pending'; END IF;
 IF (p_action IN ('accept','decline') AND r.to_teacher<>p_actor) OR (p_action='cancel' AND r.from_teacher<>p_actor) THEN RAISE EXCEPTION 'Access denied'; END IF;
 PERFORM pg_advisory_xact_lock(90210,r.week_id);
 IF p_action='accept' THEN
  FOR c IN SELECT * FROM jsonb_array_elements(r.from_cells || r.to_cells) LOOP
   SELECT CASE WHEN w.week_id IS NOT NULL THEN w.name ELSE t.name END INTO current_name FROM (SELECT 1) x LEFT JOIN template_cells t ON t.day=c->>'day' AND t.room=c->>'room' AND t.slot=c->>'slot' LEFT JOIN week_cells w ON w.week_id=r.week_id AND w.day=c->>'day' AND w.room=c->>'room' AND w.slot=c->>'slot';
   IF r.from_cells @> jsonb_build_array(c) THEN new_name:=r.to_teacher; IF current_name IS DISTINCT FROM r.from_teacher THEN RAISE EXCEPTION 'Bookings have changed; propose a new swap'; END IF;
   ELSE new_name:=r.from_teacher; IF current_name IS DISTINCT FROM r.to_teacher THEN RAISE EXCEPTION 'Bookings have changed; propose a new swap'; END IF; END IF;
   INSERT INTO week_cells(week_id,day,room,slot,name,source,updated_by) VALUES(r.week_id,c->>'day',c->>'room',c->>'slot',new_name,'swap',p_actor) ON CONFLICT(week_id,day,room,slot) DO UPDATE SET name=excluded.name,source='swap',updated_by=p_actor,updated_at=now();
  END LOOP;
 END IF;
 UPDATE swap_requests SET status=CASE p_action WHEN 'accept' THEN 'accepted' WHEN 'decline' THEN 'declined' ELSE 'cancelled' END,decided_at=now() WHERE id=p_id;
 INSERT INTO audit_log(actor,role,action,details) VALUES(p_actor,p_role,p_action || ' swap',jsonb_build_object('request',p_id,'week',r.week_id));
END $$;

BEGIN;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS archived_by text;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS restored_at timestamptz;
ALTER TABLE swap_requests DROP CONSTRAINT IF EXISTS swap_requests_status_check;
ALTER TABLE swap_requests ADD CONSTRAINT swap_requests_status_check CHECK (status IN ('pending','accepted','declined','cancelled','expired'));
CREATE OR REPLACE FUNCTION change_week_cells(p_week int, p_actor text, p_role text, p_action text, p_cells jsonb, p_name text DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c jsonb; current_name text; regular_name text; updater text; result_name text;
BEGIN
 PERFORM pg_advisory_xact_lock(90210, p_week);
 IF NOT EXISTS (SELECT 1 FROM weeks WHERE id=p_week) THEN RAISE EXCEPTION 'Week not found'; END IF;
 IF EXISTS (SELECT 1 FROM weeks WHERE id=p_week AND (archived_at IS NOT NULL OR (p_role='staff' AND restored_at IS NULL AND start_date + 6 < (now() AT TIME ZONE 'Europe/London')::date))) THEN RAISE EXCEPTION 'Week is archived or unavailable'; END IF;
 FOR c IN SELECT * FROM jsonb_array_elements(p_cells) LOOP
  SELECT t.name, w.updated_by, CASE WHEN w.week_id IS NOT NULL THEN w.name ELSE t.name END INTO regular_name, updater, current_name FROM (SELECT 1) x LEFT JOIN template_cells t ON t.day=c->>'day' AND t.room=c->>'room' AND t.slot=c->>'slot' LEFT JOIN week_cells w ON w.week_id=p_week AND w.day=c->>'day' AND w.room=c->>'room' AND w.slot=c->>'slot';
  IF p_action='release' THEN
   IF p_role <> 'staff' OR NOT (p_actor = ANY(string_to_array(coalesce(current_name,''), '/'))) THEN RAISE EXCEPTION 'A selected slot is no longer yours'; END IF;
   SELECT nullif(array_to_string(array_remove(string_to_array(current_name,'/'),p_actor),'/'),'') INTO result_name;
  ELSIF p_action='claim' THEN
   IF p_role <> 'staff' OR current_name IS NOT NULL THEN RAISE EXCEPTION 'A selected slot is no longer free'; END IF; result_name:=p_actor;
  ELSIF p_action='reset' THEN
   IF p_role <> 'admin' AND NOT (p_actor = ANY(string_to_array(coalesce(regular_name,''),'/')) OR coalesce(updater=p_actor,false)) THEN RAISE EXCEPTION 'Cannot restore this slot'; END IF;
   DELETE FROM week_cells WHERE week_id=p_week AND day=c->>'day' AND room=c->>'room' AND slot=c->>'slot'; CONTINUE;
  ELSIF p_action='admin' AND p_role='admin' THEN result_name:=p_name;
  ELSE RAISE EXCEPTION 'Invalid action'; END IF;
  INSERT INTO week_cells(week_id,day,room,slot,name,source,updated_by) VALUES(p_week,c->>'day',c->>'room',c->>'slot',result_name,p_action,p_actor) ON CONFLICT(week_id,day,room,slot) DO UPDATE SET name=excluded.name,source=excluded.source,updated_by=excluded.updated_by,updated_at=now();
 END LOOP;
 INSERT INTO audit_log(actor,role,action,details) VALUES(p_actor,p_role,p_action,jsonb_build_object('week',p_week,'cells',p_cells,'name',CASE WHEN p_action='claim' THEN p_actor WHEN p_action='release' THEN NULL WHEN p_action='reset' THEN '(regular rota)' ELSE p_name END));
END $$;
CREATE OR REPLACE FUNCTION swap_cells_valid(p_week int, p_cells jsonb, p_name text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT jsonb_typeof(p_cells)='array' AND jsonb_array_length(p_cells)>0 AND NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(p_cells) c
  LEFT JOIN template_cells t ON t.day=c->>'day' AND t.room=c->>'room' AND t.slot=c->>'slot'
  LEFT JOIN week_cells w ON w.week_id=p_week AND w.day=c->>'day' AND w.room=c->>'room' AND w.slot=c->>'slot'
  WHERE (CASE WHEN w.week_id IS NOT NULL THEN w.name ELSE t.name END) IS DISTINCT FROM p_name
 )
$$;
CREATE OR REPLACE FUNCTION propose_swap(p_week int,p_actor text,p_target text,p_from jsonb,p_to jsonb,p_note text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(90210,p_week);
 IF NOT EXISTS (SELECT 1 FROM weeks WHERE id=p_week AND archived_at IS NULL AND (restored_at IS NOT NULL OR start_date+6 >= (now() AT TIME ZONE 'Europe/London')::date)) THEN RAISE EXCEPTION 'Week is unavailable'; END IF;
 IF p_actor=p_target OR NOT EXISTS(SELECT 1 FROM teachers WHERE name=p_target AND active) OR NOT swap_cells_valid(p_week,p_from,p_actor) OR NOT swap_cells_valid(p_week,p_to,p_target) THEN RAISE EXCEPTION 'Bookings have changed'; END IF;
 IF EXISTS(SELECT 1 FROM swap_requests WHERE week_id=p_week AND status='pending' AND ((from_teacher=p_actor AND to_teacher=p_target AND from_cells=p_from AND to_cells=p_to) OR (from_teacher=p_target AND to_teacher=p_actor AND from_cells=p_to AND to_cells=p_from))) THEN RAISE EXCEPTION 'An identical request is already pending'; END IF;
 INSERT INTO swap_requests(week_id,from_teacher,to_teacher,from_cells,to_cells,note) VALUES(p_week,p_actor,p_target,p_from,p_to,p_note);
 INSERT INTO audit_log(actor,role,action,details) VALUES(p_actor,'staff','propose swap',jsonb_build_object('week',p_week,'teacher',p_target,'from',p_from,'to',p_to));
END $$;
CREATE OR REPLACE FUNCTION decide_swap_result(p_id int,p_actor text,p_role text,p_action text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r swap_requests%ROWTYPE; c jsonb; new_name text; wid int;
BEGIN
 SELECT week_id INTO wid FROM swap_requests WHERE id=p_id;
 IF wid IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
 PERFORM pg_advisory_xact_lock(90210,wid);
 SELECT * INTO r FROM swap_requests WHERE id=p_id FOR UPDATE;
 IF r.status <> 'pending' THEN RAISE EXCEPTION 'Request is no longer pending'; END IF;
 IF NOT ((p_role='staff' AND ((p_action IN ('accept','decline') AND r.to_teacher=p_actor) OR (p_action='cancel' AND r.from_teacher=p_actor))) OR (p_role='admin' AND p_action='cancel')) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF p_action='accept' THEN
  IF NOT EXISTS (SELECT 1 FROM weeks WHERE id=wid AND archived_at IS NULL AND (restored_at IS NOT NULL OR start_date+6 >= (now() AT TIME ZONE 'Europe/London')::date)) OR NOT swap_cells_valid(wid,r.from_cells,r.from_teacher) OR NOT swap_cells_valid(wid,r.to_cells,r.to_teacher) THEN
   UPDATE swap_requests SET status='expired',decided_at=now() WHERE id=p_id;
   INSERT INTO audit_log(actor,role,action,details) VALUES(p_actor,p_role,'expire swap',jsonb_build_object('request',p_id,'week',wid));
   RETURN 'Bookings have changed or the week is unavailable';
  END IF;
  FOR c IN SELECT * FROM jsonb_array_elements(r.from_cells || r.to_cells) LOOP
   new_name:=CASE WHEN r.from_cells @> jsonb_build_array(c) THEN r.to_teacher ELSE r.from_teacher END;
   INSERT INTO week_cells(week_id,day,room,slot,name,source,updated_by) VALUES(wid,c->>'day',c->>'room',c->>'slot',new_name,'swap',p_actor) ON CONFLICT(week_id,day,room,slot) DO UPDATE SET name=excluded.name,source='swap',updated_by=p_actor,updated_at=now();
  END LOOP;
  WITH expired AS (UPDATE swap_requests SET status='expired',decided_at=now() WHERE week_id=wid AND id<>p_id AND status='pending' AND EXISTS (SELECT 1 FROM jsonb_array_elements(from_cells || to_cells) x WHERE (r.from_cells || r.to_cells) @> jsonb_build_array(x)) RETURNING id) INSERT INTO audit_log(actor,role,action,details) SELECT p_actor,p_role,'expire swap',jsonb_build_object('request',id,'week',wid) FROM expired;
 END IF;
 UPDATE swap_requests SET status=CASE p_action WHEN 'accept' THEN 'accepted' WHEN 'decline' THEN 'declined' ELSE 'cancelled' END,decided_at=now() WHERE id=p_id;
 INSERT INTO audit_log(actor,role,action,details) VALUES(p_actor,p_role,p_action || ' swap',jsonb_build_object('request',p_id,'week',wid));
 RETURN 'ok';
END $$;
CREATE OR REPLACE FUNCTION decide_swap(p_id int,p_actor text,p_role text,p_action text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN PERFORM decide_swap_result(p_id,p_actor,p_role,p_action); END $$;
CREATE OR REPLACE FUNCTION admin_swap(p_week int,p_actor text,p_from jsonb,p_to jsonb,p_first text,p_second text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c jsonb; new_name text;
BEGIN
 PERFORM pg_advisory_xact_lock(90210,p_week);
 IF NOT EXISTS (SELECT 1 FROM weeks WHERE id=p_week AND archived_at IS NULL) THEN RAISE EXCEPTION 'Week is archived or unavailable'; END IF;
 IF p_first=p_second OR NOT swap_cells_valid(p_week,p_from,p_first) OR NOT swap_cells_valid(p_week,p_to,p_second) THEN RAISE EXCEPTION 'Bookings have changed'; END IF;
 FOR c IN SELECT * FROM jsonb_array_elements(p_from || p_to) LOOP
  new_name:=CASE WHEN p_from @> jsonb_build_array(c) THEN p_second ELSE p_first END;
  INSERT INTO week_cells(week_id,day,room,slot,name,source,updated_by) VALUES(p_week,c->>'day',c->>'room',c->>'slot',new_name,'swap',p_actor) ON CONFLICT(week_id,day,room,slot) DO UPDATE SET name=excluded.name,source='swap',updated_by=p_actor,updated_at=now();
 END LOOP;
 WITH expired AS (UPDATE swap_requests SET status='expired',decided_at=now() WHERE week_id=p_week AND status='pending' AND EXISTS (SELECT 1 FROM jsonb_array_elements(from_cells || to_cells) x WHERE (p_from || p_to) @> jsonb_build_array(x)) RETURNING id) INSERT INTO audit_log(actor,role,action,details) SELECT p_actor,'admin','expire swap',jsonb_build_object('request',id,'week',p_week) FROM expired;
 INSERT INTO audit_log(actor,role,action,details) VALUES(p_actor,'admin','admin swap',jsonb_build_object('week',p_week,'from',p_from,'to',p_to,'teacher',p_first || ' / ' || p_second));
END $$;
CREATE OR REPLACE FUNCTION set_week_archive(p_week int,p_actor text,p_archive boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(90210,p_week);
 UPDATE weeks SET archived_at=CASE WHEN p_archive THEN now() ELSE NULL END, archived_by=CASE WHEN p_archive THEN p_actor ELSE NULL END, restored_at=CASE WHEN p_archive THEN NULL ELSE now() END WHERE id=p_week;
 IF NOT FOUND THEN RAISE EXCEPTION 'Week not found'; END IF;
END $$;
COMMIT;
