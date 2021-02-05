-- Generated current migration

drop function if exists jetpack.after_status_change cascade;

create function jetpack.after_status_change() returns trigger as $$
  var module = (function () {
  'use strict';

  function afterTaskStatusChange() {
      var _a, _b;
      var transitionsQuery = plv8.prepare("select transitions from jetpack.machines where id = $1", ["uuid"]);
      var machine = transitionsQuery.execute([NEW.machine_id])[0];
      if (!machine)
          return NEW;
      var onEnterOperation = (_b = (_a = machine.transitions[NEW.status]) === null || _a === void 0 ? void 0 : _a.onEvent) === null || _b === void 0 ? void 0 : _b.ENTER;
      if (!onEnterOperation)
          return NEW;
      var dispatchActionQuery = plv8.prepare("select * from jetpack.dispatch_action($1, $2)", ["bigint", "text"]);
      dispatchActionQuery.execute([NEW.id, "ENTER"]);
  }

  return afterTaskStatusChange;

}());

 return module();
$$ language plv8 volatile;

create trigger after_status_change
after update on jetpack.tasks
for each row
when (old.status is distinct from new.status)
execute procedure jetpack.after_status_change();

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
            type: "no-op",
        }),
        value: (value) => ({
            type: "value",
            value,
        }),
    };

    function evaluateOperator(operator, task) {
        function evalOp(op) {
            if (typeof op === "string") {
                return { type: "change-status", newStatus: op };
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
            if (op.type === "iterations") {
                return ops.value(task.iterations);
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
        if (typeof op === "string" || op.type === "change-status") {
            var updateStatusQuery = plv8.prepare("update jetpack.tasks set status = $1 where id = $2", ["text", "bigint"]);
            var newStatus = typeof op === "string" ? op : op.newStatus;
            updateStatusQuery.execute([newStatus, task.id]);
        }
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
        NEW.snapshot = task;
        NEW.operation = ops.noOp();
        var machine = transitionsQuery.execute([task.machine_id])[0];
        if (!machine)
            return NEW;
        var operation = (_b = (_a = machine.transitions[task.status]) === null || _a === void 0 ? void 0 : _a.onEvent) === null || _b === void 0 ? void 0 : _b[type];
        if (!operation)
            return NEW;
        var effectOperator = evaluateOperator(operation, task);
        runEffect(effectOperator, task);
        var updatedTask = taskQuery.execute([task_id])[0];
        NEW.snapshot = updatedTask;
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
  insert into jetpack.tasks (machine_id, parent_id, params, context, status, iterations)
  values (machine_id, parent_id, params, context, (select initial from machine), 0)
  returning *;
$$ language sql volatile;

drop function if exists jetpack.dispatch_action cascade;

create function jetpack.dispatch_action(task_id bigint, action_type text, payload jsonb default null) returns jetpack.actions as $$
  with current_snapshot as (
    select to_jsonb(t) as snapshot from jetpack.tasks t where t.id = task_id order by id desc limit 1
  )
  insert into jetpack.actions (type, task_id, payload, previous_snapshot) 
  values (action_type, task_id, payload, (select snapshot from current_snapshot)) 
  returning *;
$$ language sql volatile;
