create extension if not exists ltree;
create extension if not exists plv8;

drop schema if exists jetpack cascade;
create schema if not exists jetpack;

drop table if exists jetpack.machines cascade;
drop table if exists jetpack.tasks cascade;
drop table if exists jetpack.actions cascade;
drop table if exists jetpack.subtree_states cascade;

create table jetpack.machines (
  id uuid primary key,
  name text not null,
  initial text not null,
  transitions jsonb not null
);

create table jetpack.tasks (
  id bigserial primary key,
  parent_id bigint references jetpack.tasks(id),
  machine_id uuid not null references jetpack.machines(id),
  path ltree,
  params jsonb not null default '{}',
  context jsonb not null default '{}',
  state text not null,
  attempts int not null
);

create table jetpack.actions (
  id bigserial primary key,
  task_id bigint not null,
  type text not null,
  payload jsonb,
  operation jsonb not null,
  previous_state text not null,
  new_state text not null,
  timestamp timestamptz not null default now()
);

create table jetpack.subtree_states (
  primary key (root_task_id, state),
  root_task_id bigint, -- todo: FK prevents after trigger working
  state text not null,
  children int not null,
  descendants int not null
);
