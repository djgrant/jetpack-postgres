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
- `EVENT: Operation` where `Operation` is an object in the shape `{ type: OperatorType, ...payload}`

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
      onEvent: {
        ENTER: "ready";
      }
    }
  }
}
```

Whenever the failed state is entered this machine immediately transitions to the running state. This can, of course, lead to an infinite cycle so a transition guard can be put in place:

```js
{
  states: {
    failed: {
      onEvent: {
        ENTER: {
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
}
```

Here, a combination of the `condition` `lte` and `context` operators are used to create a guard that only allows a transition when the node's iterations is >= 4.

In the upcoming examples we'll discover jetpack ships with a collection of operation helpers, which help simplify the composition of operators.

### A low-level example

Starting with the low-level `createMachine` function, let's define a task machine that restarts whenever it fails, up to 5 times. This example will start out very verbose, but don't worry, we'll refactor as we go along!

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
      },
    },
    failed: {
      onEvent: {
        ENTER: {
          type: "condition",
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
    },
    done: {},
  },
});
```

> 💡 Workers looks for tasks in a `ready` state to lock (that is, to take off the queue and execute). Whenever this task is locked by a worker, it receives a `LOCKED_BY_WORKER` event and transitions to the `running` state.

### Using operators to describe transitions

The previous code sample is exactly the kind of code we don't want to be writing by hand. So, instead, we can use the provided operators to clean it up.

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
      },
    },
    failed: {
      onEvent: {
        ENTER: ops.retry(5),
      },
    },
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

The example is now easier to read but there's still boilerplate we'll end up writing for every task.

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

Let's create a task machine which uses `ops.createTask` to enqueue a new task once it reaches the `done` state.

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
      onEvent: {
        ENTER: ops.createTask({
          machine: nextTaskMachine,
        }),
      },
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

> 💡 Note that `Machine.createTask` is different to `ops.createTask`. The latter generates a static operator (it is merely an instruction), while the former actually creates a task at runtime.

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
  name: "Email new todo assignee",
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
  return query select * from jetpack.createTask(machine_name := 'Email new todo assignee', params := params);
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

## Workflows

Operators, which describe what should happen on a certain event, unlock the power of workflows.

In the next example we'll create a workflow for booking a holiday. When the user books the holiday, a car and a hotel both must be booked. But, if one of the transactions failed, the other should be cancelled.

```ts
import { createMachine, ops, late } from "@djgrant/jetpack";

// Note: we're just using `createMachine` here as there is no actual task to process
// This machine is transitory, it merely glues together transitions between other machines
export const bookHoliday = createMachine({
  name: "Book holiday",
  states: {
    ready: {
      onEvent: {
        // Multiple operations can be defined in an array
        ENTER: [
          ops.createTask({
            // `late` enables us to reference machines that have yet to be declared
            machine: late(() => bookCar),
          }),
          ops.createTask({
            machine: late(() => bookHotel),
          }),
          "done",
        ],
      }
    },
    done: {
      onEvent: {
        // Built in events (might need a bit more thought)
        ALL_DESCENDANTS_DONE: ops.createRootTask({
          machine: late(() => onBookingSuccess),
        }),
        ALL_DESCENDANTS_DONE_OR_FAILED: ops.createRootTask({
          machine: late(() => onBookingFailure,
        }),
      },
    },
  },
});

// Create a base machine for bookCar and bookHotel's common functionality
export const bookHolidayComponent = createTaskMachine({
  name: "Book holiday component",
  states: {
    pending: {
      onEvent: {
        UNDO: "done",
      },
    },
    error: {
      onEvent: {
        ENTER: ops.dispatchEventToSiblings("UNDO"),
      }
    },
    running: {
      onEvent: {
        // We only want to undo successful tasks so
        // let the task finish running before this event is processed
        UNDO: ops.deferEventUntilNextTransition(),
      },
    },
  },
});

export const bookCar = bookHolidayComponent.extend({
  name: "Book car",
  states: {
    done: {
      onEvent: {
        UNDO: ops.createTask({ machine: cancelCar }),
      },
    },
  },
});

export const bookHotel = bookHolidayComponent.extend({
  name: "Book hotel",
  states: {
    done: {
      onEvent: {
        UNDO: ops.createTask({ machine: cancelHotel }),
      },
    },
  },
});

export const cancelCar = createTaskMachine("Cancel car booking");
export const cancelHotel = createTaskMachine("Cancel hotel booking");
export const onBookingSuccess = createTaskMachine("Booking complete");
export const onBookingFailure = createTaskMachine("Booking complete");
```

> 💡 When processing this workflow we can use the `context` object, which is passed between tasks, to access information about the booking request.
