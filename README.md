# jetpack

Jetpack is a high reliability platform for processing background tasks and running complex workflows.

Workflows are described using state machines that describe how tasks should transition between different states.

State machines can be connected together to handle all manner of workflows and edge cases. The state machines are stored and evaluated in the persistence layer ensuring transitions are always executed, even following a total system failure. The entire state of the system can be introspected at any point in time, including moments past, enabling powerful debugging tools.

## Introduction

A state machine describes:

1. All the possibe states a state machine node can be in
2. How the node can transition from one state to another

A set of states is described as an object:

```js
{
  states: {
    ready: {},
    failed: {},
    running: {},
    done: {}
  }
}
```

Transitions can be described in two forms:

- `EVENT: NextState` where `NextState` is a string
- `EVENT: Operation` where `Operation` is an object in the shape `{ type: "operationType", ...payload}`

```js
{
  states: {
    ready: {},
    running: {
      onEvent: {
        CANCEL: 'failed',
        SUCCESS: 'done'
      }
    },
    failed: {},
    done: {}
  }
}
```

As well as being triggered by events, transitions can also be triggered whenever a state is entered:

```js
{
  states: {
    failed: {
      onEnter: "ready";
    }
  }
}
```

Whenever the failed state is entered this machine immediately transitions to the running state. This can, of course, lead to an infinite cycle so a transition guard can be put in place:

```js
{
  states: {
    failed: {
      onEnter: {
        type: 'condition',
        when: {
          type: 'lte',
          left: {
            type: 'context',
            path: 'iterations'
          },
          right: 5
        },
        then: 'ready'
      }
    }
  }
}
```

Here, operators in the form `{ type: "operatorType", ...payload }` are used to create a guard that only allows a transition when the node's iterations is >= 4.

In the upcoming examples we'll discover provided typed helpers to simplify the composition of operators.

### A low-level example

Starting with just the low-level `createMachine` function, let's take define a task machine that restarts whenever it fails or times out, up to 5 times.

```ts
import { createMachine } from "@djgrant/jetpack";

const taskMachine = createMachine({
  name: "My task machine",
  initial: "ready",
  states: {
    ready: {
      onEvent: {
        LOCKED_BY_WORKER: "running",
      },
    },
    running: {
      onEvent: {
        ERROR: "failed",
        SUCCESS: "done",
        IDLE: "idle",
      },
    },
    failed: {
      onEnter: {
        type: "cond",
        when: {
          type: "lte",
          left: {
            type: "context",
            path: "iterations",
          },
          right: 5,
        },
        then: "ready",
      },
    },
    idle: {
      onEnter: {
        type: "cond",
        when: {
          type: "lte",
          left: {
            type: "context",
            path: "iterations",
          },
          right: 5,
        },
        then: "ready",
      },
    },
    done: {},
  },
});
```

> 💡 Workers looks for tasks in a `ready` state to lock (that is, to take off the queue and execute). Whenever this task is locked by a worker, it receives a `LOCKED_BY_WORKER` event and transitions to the `running` state.

### Using operators to describe transitions

The previous code sample is very verbose and exactly the kind of code we don't want to be writing by hand. Instead, we can use the provided operators to clean it up.

```ts
import { createMachine, ops } from "@djgrant/jetpack";

const taskMachine = createMachine({
  name: "My task machine",
  initial: "ready",
  states: {
    ready: {
      onEvent: {
        LOCKED_BY_WORKER: "running",
      },
    },
    running: {
      onEvent: {
        ERROR: "failed",
        SUCCESS: "done",
        IDLE: "idle",
      },
    },
    failed: { onEnter: ops.retry(5) },
    idle: { onEnter: ops.retry(5) },
    done: {},
  },
});
```

The `retry` operator itself is a composition of other operators:

```ts
import { ops } from "@djgrant/jetpack";

const retry = (maxAttempts: number) =>
  ops.cond(ops.lte(ops.context("iterations"), 5), "running");
```

### Simplifying task machines

This is easier to read but it's still code that we'll end up writing for every task.

Instead, we can use `createTaskMachine`, which has standard task transitions set by default.

```ts
import { createTaskMachine } from "@djgrant/jetpack";

const taskMachine = createTaskMachine({
  name: 'My task'
  maxAttempts: 5
});
```

### Extending task machines

Now that we've abstracted the state machine away what exactly is the benefit of using one? State machines allow us to create more advanced workflows with runtime guarantees.

Let's create a task machine which uses the `scheduleTask` operator to schedule a new task once it reaches the `done` state.

```ts
// machines.ts
import { createTaskMachine, createTask, ops } from "@djgrant/jetpack";

export const nextTaskMachine = createTaskMachine({
  name: "My next task",
  maxAttempts: 2,
});

export const taskMachine = createTaskMachine({
  name: "My task",
  maxAttempts: 5,
  states: {
    done: {
      onEnter: ops.scheduleTask({
        machine: nextTaskMachine,
      }),
    },
  },
});
```

And, voila, we now have a workflow.

### Enqueing tasks

A task is simply an instance of a state machine.

```ts
// run-tasks.ts
import { taskMachine } from "./machines";

async function runTasks() {
  await taskMachine.createTask();
}
```

When a task is created it is given an initial state of `pending` which makes it available for workers to pick up and process.

### Responding to state machines

Now that tasks are getting created we need to define handlers for them. These handlers will get run whenever a machine's task enters the `running` state

```ts
// worker.ts
import { taskMachine, nextTaskMachine } from "./machines";

taskMachine.onRunning(async () => {
  // do work
});

nextTaskMachine.onRunning("path/to/file");
```

### Running workers

In order to execute tasks, a worker must do two things:

1. On initialisation, save the state machines to the database ensuring the tasks are processed correctly (machines are processed in the database so must be stored there)
2. When a task moves into the `ready` state, lock onto it (thereby triggering a transition to the `running` state), and execute the task handler

```ts
import { runWorker } from "@djgrant/jetpack";
import { taskMachine, nextTaskMachine } from "./machines";

runWorker({
  machines: [taskMachine, nextTaskMachine],
});
```

> 💡 Saving machines is an idempotent operation: it can be done multiple times and from different services with the same result.

### Enqueing tasks from other services

Tasks can be enqueued from other services (e.g. a web server).

```ts
// server.ts
import { assignTodoMachine } from "./worker";

app.post("todo/:todoId/assign/:assignedUserId", (req, res) => {
  const { todoId, assignedUserId } = req.params;
  await db.query("UPDATE todos SET assignee TO $1 WHERE id = $2", [
    assignedUserId,
    todoId,
  ]);
  await assignTodoMachine.createTask({
    params: { todoId, assignedUserId },
  });
  res.send(204);
});
```

```ts
// worker.ts
import { createTaskMachine, runWorker } from "@djgrant/jetpack";

const assignTodoMachine = createTaskMachine({
  name: "email_new_todo_assignee",
  maxAttempts: 5,
});

assignTodoMachine.onRunning(async ({ params }) => {
  const { todoId, assignedUserId } = params;
  // get todo and user details
  // send email
});

runWorker({
  machines: [assignTodoMachine],
});
```

### Enqueing tasks in database triggers

An alternative approach to the previous example is to enqueue tasks in a database trigger that fires whenever the assigned user is updated.

```sql
create function on_update_todo_assigned_to returns trigger as $$
declare
  params jsonb;
begin
  params = jsonb_build_object('todoId', new.id, 'assignedUserId', new.assigned_to);
  perform jetpack.createTask(machine_name := 'email_new_todo_assignee', params := params);
end
$$ language plpsql volatile;

create trigger after_todo_set_assigned
before insert on todos
for each row
when old.assigned_to != new.assigned_to
execute procedure on_update_todo_assigned_to();
```

### Visualising workflows

Once the state machines have been created in the database, they can introspected.

```bash
$ npx jetpack viz src/machines.ts

Generated visualiation of jetpack workflow: http://localhost:4329
```
