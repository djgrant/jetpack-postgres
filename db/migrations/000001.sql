create extension if not exists ltree;
create extension if not exists plv8;

drop schema jetpack cascade;
create schema if not exists jetpack;

drop table if exists jetpack.machines cascade;
drop table if exists jetpack.tasks cascade;
drop table if exists jetpack.snapshots cascade;
drop table if exists jetpack.actions cascade;

create table jetpack.machines (
  id uuid primary key,
  name text not null,
  initial text not null,
  transitions jsonb not null
);

create table jetpack.tasks (
  id bigserial primary key,
  parent_id bigint,
  machine_id uuid not null references jetpack.machines(id),
  path ltree,
  params jsonb not null default '{}',
  context jsonb not null default '{}',
  status text not null,
  iterations int not null,
  locked boolean not null default false
);

create table jetpack.actions (
  id bigserial primary key,
  task_id bigint not null,
  type text not null,
  payload jsonb,
  operation jsonb not null,
  previous_snapshot jsonb not null,
  snapshot jsonb not null,
  timestamp timestamptz not null default now()
);
