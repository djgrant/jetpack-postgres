drop function if exists jetpack.create_task cascade;
drop function if exists jetpack.before_insert_task cascade;
drop function if exists jetpack.dispatch_action cascade;
drop function if exists jetpack.before_insert_action cascade;
drop function if exists jetpack.run_transition cascade;

create function jetpack.create_task(
  name text,
  machine_id uuid,
  parent_id bigint default null,
  params jsonb default '{}', 
  context jsonb default '{}'
) returns jetpack.tasks as $$
  insert into jetpack.tasks (machine_id, name, parent_id, params, context, status, iterations)
  values (machine_id, name, parent_id, params, context, 'pending', 0)
  returning *;
$$ language sql volatile;

create function jetpack.dispatch_action(task_id bigint, action_type text, payload jsonb default null) returns jetpack.actions as $$
  with current_snapshot as (
    select to_jsonb(n) as snapshot from jetpack.tasks n where n.id = task_id order by id desc limit 1
  )
  insert into jetpack.actions (type, task_id, payload, previous_snapshot) 
  values (action_type, task_id, payload, (select snapshot from current_snapshot)) 
  returning *;
$$ language sql volatile;

create function jetpack.before_insert_action() returns trigger as $$
  var { type, task_id, payload } = NEW;
  var task_query = plv8.prepare('select * from jetpack.tasks where id = $1', ['bigint']);
  var [task] = task_query.execute([task_id]);
  if (!task) return;

  var machine_query = plv8.prepare('select def from jetpack.machines where id = $1', ['uuid'])
  var [machine] = machine_query.execute([task.machine_id])
  if (!machine) return;

  var transitions = machine.def[type];
  if (!transitions) return;

  var run_transition = plv8.find_function("jetpack.run_transition");
  
  for (var transition of [].concat(transitions)) {
    run_transition(transition, task, payload);
  }

  var [updated_task] = task_query.execute([task_id]);
  NEW.snapshot = updated_task;
  return NEW;
$$ language plv8 volatile;

create function jetpack.run_transition(
  transition jsonb, 
  task jetpack.tasks,
  action_payload jsonb
) returns void as $$
  var current_task_query = plv8.prepare('select * from jetpack.tasks n where n.id = $1 order by id desc limit 1', ['bigint']);
  var [current_task] = current_task_query.execute([task.id]);
  if (!current_task) return;

  var conditions = Object.entries(transition.when);
  var then_case = Object.entries(transition.then);
  var else_case = Object.entries(transition.else || {});
  var is_match = conditions.every(([field, value]) => {
    return value === true || [].concat(value).includes(current_task[field])
  });
  
  plv8.subtransaction(function () {
    for (var [transition_type, transition_payload] of is_match ? then_case : else_case) {
      if (transition_type === 'change_status') {   
        var change_status_query = plv8.prepare(
          'update jetpack.tasks set status = $1, iterations = $2 where id = $3', 
          ['text', 'int', 'bigint']
        );
        change_status_query.execute([transition_payload, current_task.iterations + 1, task.id]);
      }  
    }
  });
$$ language plv8 volatile;

create trigger before_insert_action
before insert on jetpack.actions
for each row
execute procedure jetpack.before_insert_action();
