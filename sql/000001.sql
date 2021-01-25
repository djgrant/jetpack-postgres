drop schema if exists jetpack cascade;

create extension if not exists ltree;
create extension if not exists plv8;
create schema if not exists jetpack;

drop table if exists jetpack.machines cascade;
drop table if exists jetpack.nodes cascade;
drop table if exists jetpack.snapshots cascade;
drop table if exists jetpack.actions cascade;

create table jetpack.machines (
  id uuid primary key,
  name text not null,
  def jsonb not null
);

create table jetpack.nodes (
  id bigserial primary key,
  name text not null,
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
  node_id bigint not null,
  type text not null,
  payload jsonb,
  previous_snapshot jsonb not null,
  snapshot jsonb not null,
  timestamp timestamptz not null default now()
);
