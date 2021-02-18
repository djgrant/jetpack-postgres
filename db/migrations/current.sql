/*
  This is a generated file. Do not modify it manually.
*/

/*
  functions/create-task.sql
*/
drop function if exists jetpack.create_task cascade;

create function jetpack.create_task(
  machine_id uuid,
  parent_id bigint default null,
  params jsonb default '{}', 
  context jsonb default '{}'
) returns jetpack.tasks as $$
  with machine as (
    select initial from jetpack.machines where id = machine_id
  )
  insert into jetpack.tasks (machine_id, parent_id, params, context, state, attempts)
  values (machine_id, parent_id, params, context, (select initial from machine), 0)
  returning *;
$$ language sql volatile;


/*
  functions/dispatch-action.sql
*/
drop function if exists jetpack.dispatch_action cascade;

create function jetpack.dispatch_action(task_id bigint, action_type text, payload jsonb default null) returns jetpack.actions as $$
  insert into jetpack.actions (type, task_id, payload) 
  values (action_type, task_id, payload)
  returning *;
$$ language sql volatile;


/*
  functions/get-next-task.sql
*/
drop function if exists jetpack.get_next_task cascade;

create function jetpack.get_next_task() returns jetpack.tasks as $$
declare
  next_task jetpack.tasks;
begin
  select * into next_task
  from jetpack.tasks
  where state = 'ready'
  order by id
  limit 1
  for update skip locked;

	if not found then 
	  return next_task;
	end if;

  perform jetpack.dispatch_action(next_task.id, 'LOCKED_BY_WORKER');

  return next_task;
end
$$ language plpgsql volatile;


/*
  functions/get-subtree-states-agg.sql
*/
drop function if exists jetpack.get_subtree_states_agg;

create function jetpack.get_subtree_states_agg (id bigint) returns setof jetpack.subtree_states as 
$$
  select * 
  from jetpack.subtree_states 
  where task_id = id
  union
  select 
    id::bigint as task_id, 
    'total' as state, 
    coalesce(sum(children), 0)::int as children, 
    coalesce(sum(descendants), 0)::int as descendants 
  from jetpack.subtree_states 
  where task_id = id;
$$ 
language sql stable;

/*
  triggers/on-insert-action-eval-transition.sql
*/
drop function if exists jetpack.eval_transition cascade;

create function jetpack.eval_transition() returns trigger as $$
  var module = (function () {
    'use strict';

    const noOp = () => ({
        type: "no_op",
    });
    const error = (message) => ({
        type: "error",
        message,
    });
    const value = (value) => ({
        type: "value",
        value,
    });
    const changeState = (newState) => ({
        type: "change_state",
        new_state: newState,
    });

    function evaluateOperation(operation, task) {
        try {
            return evaluateOperator(operation, task);
        }
        catch (err) {
            return error(err.toString());
        }
    }
    function evaluateOperator(operator, task) {
        function evalOp(op) {
            if (typeof op === "string") {
                return changeState(op);
            }
            if (op.type === "condition") {
                var when = evalOp(op.when);
                if (!isValueOperator(when))
                    throwValueOpError();
                var isPass = Boolean(when.value);
                return isPass ? evalOp(op.then) : op["else"] ? evalOp(op["else"]) : noOp();
            }
            if (op.type === "lt" || op.type === "lte") {
                var left = evalComparable(op.left);
                var right = evalComparable(op.right);
                if (!isValueOperator(left))
                    throwValueOpError();
                if (!isValueOperator(right))
                    throwValueOpError();
                if (typeof left.value !== "number" || typeof right.value !== "number") {
                    return value(false);
                }
                if (op.type === "lte") {
                    return value(left.value <= right.value);
                }
                if (op.type === "lt") {
                    return value(left.value < right.value);
                }
            }
            if (op.type === "params") {
                return value(task.params[op.path]);
            }
            if (op.type === "context") {
                return value(task.params[op.path]);
            }
            if (op.type === "attempts") {
                return value(task.attempts);
            }
            return op;
        }
        function evalComparable(input) {
            if (input !== null && typeof input === "object" && "type" in input) {
                return evalOp(input);
            }
            return value(input);
        }
        return evalOp(operator);
    }
    function isValueOperator(op) {
        if (typeof op !== "object" || !("value" in op)) {
            return false;
        }
        return true;
    }
    function throwValueOpError() {
        throw new Error("Condition must ulimately return a value type");
    }

    function createTask(task) {
        var createTaskQuery = plv8.prepare("select * from jetpack.create_task($1, $2, $3, $4)", ["uuid", "bigint", "jsonb", "jsonb"]);
        var newTask = createTaskQuery.execute([
            task.machine_id,
            task.parent_id,
            task.params || {},
            task.context || {},
        ])[0];
        return newTask;
    }

    function runEffect(op, task) {
        if (typeof op === "string") {
            task.state = op;
            return task;
        }
        if (op.type === "change_state") {
            task.state = op.new_state;
            return task;
        }
        if (op.type === "increment_attempts") {
            task.attempts = task.attempts + 1;
            return task;
        }
        if (op.type === "create_sub_task") {
            createTask({
                machine_id: op.machine_id === "$self" ? task.machine_id : op.machine_id,
                parent_id: op.parent_id === "$self" ? task.id : op.parent_id,
            });
            return;
        }
        if (op.type === "create_root_task") {
            createTask({
                machine_id: op.machine_id === "$self" ? task.machine_id : op.machine_id,
                parent_id: null,
            });
            return;
        }
    }

    function updateTask(task) {
        var updateTaskQuery = plv8.prepare("\n    update jetpack.tasks \n    set context = $1, state = $2, attempts = $3 \n    where id = $4\n    returning *\n    ", ["jsonb", "text", "int", "bigint"]);
        var updatedTask = updateTaskQuery.execute([
            task.context,
            task.state,
            task.attempts,
            task.id,
        ])[0];
        return updatedTask;
    }

    function beforeInsertAction() {
        var _a, _b;
        var type = NEW.type, task_id = NEW.task_id;
        var taskQuery = plv8.prepare("select * from jetpack.tasks where id = $1", ["bigint"]);
        var transitionsQuery = plv8.prepare("select transitions from jetpack.machines where id = $1", ["uuid"]);
        var task = taskQuery.execute([task_id])[0];
        if (!task) {
            throw new Error("Task " + task_id + " does not exist");
        }
        NEW.previous_state = task.state;
        NEW.new_state = task.state;
        NEW.operation = noOp();
        var machine = transitionsQuery.execute([task.machine_id])[0];
        if (!machine)
            return NEW;
        var operation = (_b = (_a = machine.transitions[task.state]) === null || _a === void 0 ? void 0 : _a.onEvent) === null || _b === void 0 ? void 0 : _b[type];
        if (!operation)
            return NEW;
        var effectOperator = evaluateOperation(operation, task);
        var effectedTask = runEffect(effectOperator, task);
        if (effectedTask) {
            var updatedTask = updateTask(effectedTask);
            NEW.new_state = updatedTask.state;
        }
        NEW.operation = effectOperator;
        return NEW;
    }

    return beforeInsertAction;

}());

 return module();
$$ language plv8 volatile;

create trigger before_insert_action
before insert on jetpack.actions
for each row
execute procedure jetpack.eval_transition();


/*
  triggers/on-new-state-eval-enter-transition.sql
*/
drop function if exists jetpack.eval_enter_transition cascade;

create function jetpack.eval_enter_transition() returns trigger as $$
  var module = (function () {
  'use strict';

  function dispatchAction(taskId, action) {
      var dispatchActionQuery = plv8.prepare("select * from jetpack.dispatch_action($1, $2)", ["bigint", "text"]);
      dispatchActionQuery.execute([taskId, action]);
  }

  function afterUpdateTaskState() {
      var _a, _b;
      var transitionsQuery = plv8.prepare("select transitions from jetpack.machines where id = $1", ["uuid"]);
      var machine = transitionsQuery.execute([NEW.machine_id])[0];
      if (!machine)
          return null;
      var onEnterOperation = (_b = (_a = machine.transitions[NEW.state]) === null || _a === void 0 ? void 0 : _a.onEvent) === null || _b === void 0 ? void 0 : _b.ENTER;
      if (!onEnterOperation)
          return null;
      dispatchAction(NEW.id, "ENTER");
  }

  return afterUpdateTaskState;

}());

 return module();
$$ language plv8 volatile;

create trigger after_update_state
after update on jetpack.tasks
for each row
when (old.state is distinct from new.state)
execute procedure jetpack.eval_enter_transition();


/*
  triggers/on-new-state-update-subtree.sql
*/
drop function if exists jetpack.update_subtree_states cascade; 

create function jetpack.update_subtree_states() returns trigger as $$ 
declare
  parent_id bigint;
  ancestors text[];
begin
  if (new is null) then
    parent_id = coalesce(old.parent_id, 0);
    ancestors = string_to_array('0.' || old.path::text, '.');
    ancestors = array_remove(ancestors, old.id::text);
    ancestors = array_remove(ancestors, parent_id::text);
  else 
    parent_id = coalesce(new.parent_id, 0);
    ancestors = string_to_array('0.' || new.path::text, '.');
    ancestors = array_remove(ancestors, new.id::text);
    ancestors = array_remove(ancestors, parent_id::text);
  end if;

  if (TG_OP = 'DELETE' and old.parent_id is not null) then
    delete from jetpack.subtree_states where task_id = old.id;
  end if;

  -- decrement counts
  if (old.state != new.state or new.state is null) then

    -- parent task
    update jetpack.subtree_states as s set 
      children = s.children - 1,
      descendants = s.descendants - 1
    where s.task_id = parent_id
    and s.state = old.state;

    -- grandparent+ tasks
    update jetpack.subtree_states as s set
      task_id = t.task_id,
      descendants = s.descendants - 1
    from (
      select unnest::bigint as task_id from unnest(ancestors)
    ) as t(task_id) 
    where s.task_id = t.task_id
    and state = old.state;
    
  end if;

  -- increment counts
  if (new.state is not null) then
  
    -- parent task
    insert into jetpack.subtree_states as s (task_id, state, children, descendants)
    values (parent_id, new.state, 1, 1)
    on conflict on constraint subtree_states_pkey do update 
    set children = s.children + 1, descendants = s.descendants + 1;

    -- grandparent+ tasks
    insert into jetpack.subtree_states as s (task_id, state, descendants, children) 
    select unnest::bigint as task_id, new.state as state, 1 as descendants, 0 as children
    from unnest(ancestors)
    on conflict on constraint subtree_states_pkey do update 
    set descendants = s.descendants + 1;
  
  end if;

	return null;
end
$$ language plpgsql volatile;


create constraint trigger state_change 
after update on jetpack.tasks
deferrable initially deferred
for each row
when (old.state != new.state)
execute procedure jetpack.update_subtree_states();

create constraint trigger state_insert 
after insert on jetpack.tasks
deferrable initially deferred
for each row
execute procedure jetpack.update_subtree_states();

create trigger state_delete
after delete on jetpack.tasks
for each row
execute procedure jetpack.update_subtree_states();


/*
  triggers/on-upsert-task-set-path.sql
*/
drop function if exists jetpack.set_task_path cascade;

create function jetpack.set_task_path () returns trigger as $$
declare
  parent record;
begin
  select path into parent from jetpack.tasks where id = new.parent_id;
  if parent.path is not null then
    new.path = parent.path || new.id::text::ltree;
  else
    new.path = new.id;
  end if;
  return new;
end
$$ language plpgsql volatile;

create trigger before_insert_task
before insert on jetpack.tasks
for each row
execute procedure jetpack.set_task_path();

create trigger before_update_task
before update on jetpack.tasks
for each row when (old.parent_id is distinct from new.parent_id)
execute procedure jetpack.set_task_path();
