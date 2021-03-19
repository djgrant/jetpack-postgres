/*
  This is a generated file. Do not modify it manually.
*/

/*
  /Users/danielgrant/Sites/djgrant/jetpack/packages/jetpack-db/sql/functions/create-task.sql
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
  /Users/danielgrant/Sites/djgrant/jetpack/packages/jetpack-db/sql/functions/dispatch-action.sql
*/
drop function if exists jetpack.dispatch_action cascade;

create function jetpack.dispatch_action(task_id bigint, action_type text, payload jsonb default null) returns jetpack.actions as $$
  insert into jetpack.actions (type, task_id, payload) 
  values (action_type, task_id, payload)
  returning *;
$$ language sql volatile;


/*
  /Users/danielgrant/Sites/djgrant/jetpack/packages/jetpack-db/sql/functions/get-next-task.sql
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
  /Users/danielgrant/Sites/djgrant/jetpack/packages/jetpack-db/sql/functions/get-subtree-states-agg.sql
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
  /Users/danielgrant/Sites/djgrant/jetpack/packages/jetpack-db/sql/triggers/on-insert-action-eval-transition.sql
*/
drop function if exists jetpack.eval_transition cascade;

create function jetpack.eval_transition() returns trigger as $$
  var module = (function () {
    'use strict';

    // Getters
    // Effects
    const noOp = (operation) => ({
        type: "no_op",
        operation,
    });
    const error = (message) => ({
        type: "error",
        message,
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
        const cache = {};
        const evaluatedOperation = evalOp(operator);
        if (typeof evaluatedOperation === "string") {
            return changeState(evaluatedOperation);
        }
        if (isEffectOperator(evaluatedOperation)) {
            return evaluatedOperation;
        }
        return noOp(evaluatedOperation);
        function evalOpAsValue(op) {
            const value = evalOp(op);
            if (isPrimitive(value))
                return value;
            throw new Error("Operator must ulimately return a value type");
        }
        function evalExpressionMap(expressionMap) {
            return Object.entries(expressionMap).reduce((acc, [key, value]) => {
                let v;
                if (isPrimitive(value)) {
                    v = value;
                }
                else if (isExpressionOperator(value)) {
                    v = evalOpAsValue(value);
                }
                else {
                    v = evalExpressionMap(value);
                }
                return Object.assign(Object.assign({}, acc), { [key]: v });
            }, {});
        }
        function evalPayload(payload) {
            if (isPrimitive(payload)) {
                return payload;
            }
            if (isExpressionOperator(payload)) {
                return evalOpAsValue(payload);
            }
            return evalExpressionMap(payload);
        }
        function evalOp(op) {
            var _a, _b;
            if (isPrimitive(op)) {
                return op;
            }
            // Logical
            if (op.type === "condition") {
                const when = evalOpAsValue(op.when);
                const passed = Boolean(when);
                if (!passed) {
                    return typeof op.else !== "undefined" ? evalOp(op.else) : noOp();
                }
                return evalOp(op.then);
            }
            // Comparison
            if ("left" in op && "right" in op) {
                const left = evalOpAsValue(op.left);
                const right = evalOpAsValue(op.right);
                if (op.type === "eq") {
                    return left === right;
                }
                if (op.type === "not_eq") {
                    return left !== right;
                }
                // Numeric
                if (typeof left !== "number" || typeof right !== "number") {
                    return false;
                }
                if (op.type === "lte") {
                    return left <= right;
                }
                if (op.type === "lt") {
                    return left < right;
                }
                if (op.type === "gte") {
                    return left >= right;
                }
                if (op.type === "gt") {
                    return left > right;
                }
            }
            // Logical
            if (op.type === "any") {
                const values = op.values.map(evalOpAsValue);
                return values.some(valueOperator => Boolean(valueOperator));
            }
            if (op.type === "all") {
                const values = op.values.map(evalOpAsValue);
                return values.every(valueOperator => Boolean(valueOperator));
            }
            if (op.type === "not") {
                const valueOperator = evalOpAsValue(op.value);
                return !Boolean(valueOperator);
            }
            // Arithmetic
            if (op.type === "sum") {
                const nums = op.values.map(evalOpAsValue);
                let total = 0;
                for (const num of nums) {
                    if (typeof num !== "number") {
                        throw new Error("Value operator must contain a number");
                    }
                    total += num;
                }
                return total;
            }
            // Getters
            if (op.type === "params") {
                return op.path ? task.params[op.path] : task.params;
            }
            if (op.type === "context") {
                return op.path ? task.context[op.path] : task.context;
            }
            if (op.type === "attempts") {
                return task.attempts;
            }
            if (op.type === "depth") {
                return task.path.split(".").length;
            }
            if (op.type === "subtree_state_count") {
                if (!cache.subtree) {
                    const subtreeQuery = plv8.prepare(`select * from jetpack.get_subtree_states_agg($1)`, ["bigint"]);
                    const subtreeStates = subtreeQuery.execute([task.id]);
                    cache.subtree = {};
                    for (const row of subtreeStates) {
                        cache.subtree[row.state] = row.descendants;
                    }
                }
                return ((_a = cache.subtree) === null || _a === void 0 ? void 0 : _a[op.state]) || 0;
            }
            // Actions
            if ("action" in op) {
                const action = (_b = evalOpAsValue(op.action)) === null || _b === void 0 ? void 0 : _b.toString();
                const payload = op.payload && evalPayload(op.payload);
                if (!action)
                    return null;
                return Object.assign(Object.assign({}, op), { action, payload });
            }
            // Create task
            if ("context" in op || "params" in op) {
                const params = op.params && evalExpressionMap(op.params);
                const context = op.context && evalExpressionMap(op.context);
                return Object.assign(Object.assign({}, op), { params, context });
            }
            return op;
        }
    }
    function isPrimitive(value) {
        return typeof value !== "object" || value === null;
    }
    function isEffectOperator(op) {
        if (typeof op !== "object" || op === null)
            return false;
        return effectTypes.includes(op.type);
    }
    function isExpressionOperator(op) {
        if (typeof op !== "object" || op === null)
            return false;
        return expressionTypes.includes(op.type);
    }
    const effectTypes = [
        "change_state",
        "create_root_task",
        "create_sub_task",
        "dispatch_action_to_parent",
        "dispatch_action_to_root",
        "dispatch_action_to_siblings",
        "error",
        "increment_attempts",
        "no_op",
    ];
    const expressionTypes = [
        "all",
        "any",
        "attempts",
        "condition",
        "context",
        "context",
        "depth",
        "eq",
        "gt",
        "gte",
        "lt",
        "lte",
        "not",
        "not_eq",
        "params",
        "subtree_state_count",
        "sum",
    ];

    function createTask(task) {
        const createTaskQuery = plv8.prepare("select * from jetpack.create_task($1, $2, $3, $4)", ["uuid", "bigint", "jsonb", "jsonb"]);
        const [newTask] = createTaskQuery.execute([
            task.machine_id,
            task.parent_id,
            task.params || {},
            task.context || {},
        ]);
        return newTask;
    }

    function runEffect(op, task) {
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
                parent_id: task.id,
                params: op.params,
                context: mergeContext(task.context, op.context),
            });
            return null;
        }
        if (op.type === "create_root_task") {
            createTask({
                machine_id: op.machine_id === "$self" ? task.machine_id : op.machine_id,
                parent_id: null,
                params: op.params,
                context: op.context,
            });
            return null;
        }
        return null;
    }
    function mergeContext(oldContext, newContext) {
        return Object.assign(Object.assign({}, oldContext), newContext);
    }

    function updateTask(task) {
        const updateTaskQuery = plv8.prepare(`
    update jetpack.tasks 
    set context = $1, state = $2, attempts = $3 
    where id = $4
    returning *
    `, ["jsonb", "text", "int", "bigint"]);
        const [updatedTask] = updateTaskQuery.execute([
            task.context,
            task.state,
            task.attempts,
            task.id,
        ]);
        return updatedTask;
    }

    function beforeInsertAction() {
        var _a, _b;
        const { type, task_id } = NEW;
        const taskQuery = plv8.prepare("select * from jetpack.tasks where id = $1", ["bigint"]);
        const transitionsQuery = plv8.prepare("select transitions from jetpack.machines where id = $1", ["uuid"]);
        const [task] = taskQuery.execute([task_id]);
        if (!task) {
            throw new Error(`Task ${task_id} does not exist`);
        }
        NEW.previous_state = task.state;
        NEW.new_state = task.state;
        NEW.operations = [noOp()];
        const [machine] = transitionsQuery.execute([task.machine_id]);
        if (!machine)
            return NEW;
        const operation = (_b = (_a = machine.transitions[task.state]) === null || _a === void 0 ? void 0 : _a.onEvent) === null || _b === void 0 ? void 0 : _b[type];
        if (!operation)
            return NEW;
        const operations = [].concat(operation);
        const effectOperators = [];
        for (const operation of operations) {
            const effectOperator = evaluateOperation(operation, task);
            const effectedTask = runEffect(effectOperator, task);
            if (effectedTask) {
                const updatedTask = updateTask(effectedTask);
                NEW.new_state = updatedTask.state;
            }
            effectOperators.push(effectOperator);
        }
        NEW.operations = effectOperators;
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
  /Users/danielgrant/Sites/djgrant/jetpack/packages/jetpack-db/sql/triggers/on-new-state-dispatch-enter-transition.sql
*/
drop function if exists jetpack.eval_enter_transition cascade;

create function jetpack.eval_enter_transition() returns trigger as $$
  var module = (function () {
  'use strict';

  function dispatchAction(taskId, action) {
      const dispatchActionQuery = plv8.prepare("select * from jetpack.dispatch_action($1, $2)", ["bigint", "text"]);
      dispatchActionQuery.execute([taskId, action]);
  }

  function onNewTaskState() {
      var _a;
      const transitionsQuery = plv8.prepare("select transitions from jetpack.machines where id = $1", ["uuid"]);
      const [machine] = transitionsQuery.execute([NEW.machine_id]);
      const onEvent = ((_a = machine === null || machine === void 0 ? void 0 : machine.transitions[NEW.state]) === null || _a === void 0 ? void 0 : _a.onEvent) || {};
      if ("ENTER" in onEvent) {
          dispatchAction(NEW.id, "ENTER");
      }
      return null;
  }

  return onNewTaskState;

}());

 return module();
$$ language plv8 volatile;

create trigger after_update_state
after update on jetpack.tasks
for each row
when (old.state is distinct from new.state)
execute procedure jetpack.eval_enter_transition();

create trigger after_insert_state
after insert on jetpack.tasks
for each row
execute procedure jetpack.eval_enter_transition();


/*
  /Users/danielgrant/Sites/djgrant/jetpack/packages/jetpack-db/sql/triggers/on-new-state-update-subtree.sql
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
  /Users/danielgrant/Sites/djgrant/jetpack/packages/jetpack-db/sql/triggers/on-new-subtree-dispatch-subtree-action.sql
*/
drop function if exists jetpack.dispatch_subtree_action_once cascade;
drop function if exists jetpack.dispatch_subtree_action cascade;

create function jetpack.dispatch_subtree_action_once() returns trigger as $$
declare
  already_run int;
begin
  create temp table if not exists transaction_attempts (
    task_id bigint primary key
  ) on commit drop;

  select task_id into already_run from transaction_attempts where task_id = NEW.task_id;

  if (already_run is not null) then
    return null;
  else
    insert into transaction_attempts (task_id) values (NEW.task_id);
    perform jetpack.dispatch_subtree_action(NEW);
    return null;
  end if;
end
$$ language plpgsql volatile;


create function jetpack.dispatch_subtree_action(subtree_state jetpack.subtree_states) returns void as $$
  var module = (function () {
  'use strict';

  function dispatchAction(taskId, action) {
      const dispatchActionQuery = plv8.prepare("select * from jetpack.dispatch_action($1, $2)", ["bigint", "text"]);
      dispatchActionQuery.execute([taskId, action]);
  }

  function evalSubtreeActions() {
      var _a;
      if (Number(subtree_state.task_id) === 0)
          return null;
      const machineQuery = plv8.prepare(`select m.*, t.state as task_state from jetpack.machines m
    inner join jetpack.tasks t
    on t.machine_id = m.id
    and t.id = $1`, ["bigint"]);
      const [machine] = machineQuery.execute([subtree_state.task_id]);
      const onEvent = ((_a = machine === null || machine === void 0 ? void 0 : machine.transitions[machine.task_state]) === null || _a === void 0 ? void 0 : _a.onEvent) || {};
      if ("SUBTREE_UPDATE" in onEvent) {
          dispatchAction(subtree_state.task_id, "SUBTREE_UPDATE");
      }
      return null;
  }

  return evalSubtreeActions;

}());

 return module();
$$ language plv8 volatile;

create constraint trigger after_update_subtree_state
after update on jetpack.subtree_states
deferrable initially deferred
for each row
execute function jetpack.dispatch_subtree_action_once();

create constraint trigger after_insert_subtree_state
after insert on jetpack.subtree_states
deferrable initially deferred
for each row
execute function jetpack.dispatch_subtree_action_once();


/*
  /Users/danielgrant/Sites/djgrant/jetpack/packages/jetpack-db/sql/triggers/on-upsert-task-set-path.sql
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
