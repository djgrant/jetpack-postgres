-- Generated current migration

drop function if exists jetpack.after_state_change cascade;

create function jetpack.after_state_change() returns trigger as $$
  var module = (function () {
  'use strict';

  function dispatchAction(taskId, action) {
      var dispatchActionQuery = plv8.prepare("select * from jetpack.dispatch_action($1, $2)", ["bigint", "text"]);
      dispatchActionQuery.execute([taskId, action]);
  }

  function afterTaskstateChange() {
      var _a, _b;
      var transitionsQuery = plv8.prepare("select transitions from jetpack.machines where id = $1", ["uuid"]);
      var machine = transitionsQuery.execute([NEW.machine_id])[0];
      if (!machine)
          return NEW;
      var onEnterOperation = (_b = (_a = machine.transitions[NEW.state]) === null || _a === void 0 ? void 0 : _a.onEvent) === null || _b === void 0 ? void 0 : _b.ENTER;
      if (!onEnterOperation)
          return NEW;
      dispatchAction(NEW.id, "ENTER");
  }

  return afterTaskstateChange;

}());

 return module();
$$ language plv8 volatile;

create trigger after_state_change
after update on jetpack.tasks
for each row
when (old.state is distinct from new.state)
execute procedure jetpack.after_state_change();


drop function if exists jetpack.after_update_task cascade;

-- not sure what this is for
create function jetpack.after_update_task () returns trigger as $$
begin
  update jetpack.tasks
  set path = new.path || subpath(path, nlevel(old.path))
  where old.path @> path
  and old.path != path;
  return new;
end
$$ language plpgsql volatile;

create trigger after_update_task
after update on jetpack.tasks
for each row when (old.parent_id is distinct from new.parent_id)
execute procedure jetpack.after_update_task();


drop function if exists jetpack.before_insert_action cascade;

create function jetpack.before_insert_action() returns trigger as $$
  var module = (function () {
    'use strict';

    const ops = {
        noOp: () => ({
            type: "no_op",
        }),
        value: (value) => ({
            type: "value",
            value,
        }),
        changeState: (newState) => ({
            type: "change_state",
            new_state: newState,
        }),
    };

    function evaluateOperator(operator, task) {
        function evalOp(op) {
            if (typeof op === "string") {
                return ops.changeState(op);
            }
            if (op.type === "condition") {
                var when = evalOp(op.when);
                if (!isValueOperator(when))
                    throwValueOpError();
                var isPass = Boolean(when.value);
                return isPass ? evalOp(op.then) : op["else"] ? evalOp(op["else"]) : ops.noOp();
            }
            if (op.type === "lte") {
                var left = evalComparable(op.left);
                var right = evalComparable(op.right);
                if (!isValueOperator(left))
                    throwValueOpError();
                if (!isValueOperator(right))
                    throwValueOpError();
                if (typeof left.value !== "number" || typeof right.value !== "number") {
                    return ops.value(false);
                }
                return ops.value(left.value <= right.value);
            }
            if (op.type === "params") {
                return ops.value(task.params[op.path]);
            }
            if (op.type === "context") {
                return ops.value(task.params[op.path]);
            }
            if (op.type === "attempts") {
                return ops.value(task.attempts);
            }
            return op;
        }
        function evalComparable(input) {
            if (input !== null && typeof input === "object" && "type" in input) {
                return evalOp(input);
            }
            return ops.value(input);
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
        return task;
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
        NEW.operation = ops.noOp();
        var machine = transitionsQuery.execute([task.machine_id])[0];
        if (!machine)
            return NEW;
        var operation = (_b = (_a = machine.transitions[task.state]) === null || _a === void 0 ? void 0 : _a.onEvent) === null || _b === void 0 ? void 0 : _b[type];
        if (!operation)
            return NEW;
        var effectOperator = evaluateOperator(operation, task);
        var effectedTask = runEffect(effectOperator, task);
        var updatedTask = updateTask(effectedTask);
        NEW.new_state = updatedTask.state;
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
execute procedure jetpack.before_insert_action();


drop function if exists jetpack.before_upsert_task cascade;

create function jetpack.before_upsert_task () returns trigger as $$
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
execute procedure jetpack.before_upsert_task();

create trigger before_update_task
before update on jetpack.tasks
for each row when (old.parent_id is distinct from new.parent_id)
execute procedure jetpack.before_upsert_task();


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


drop function if exists jetpack.dispatch_action cascade;

create function jetpack.dispatch_action(task_id bigint, action_type text, payload jsonb default null) returns jetpack.actions as $$
  insert into jetpack.actions (type, task_id, payload) 
  values (action_type, task_id, payload)
  returning *;
$$ language sql volatile;


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
