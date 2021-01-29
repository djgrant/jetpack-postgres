# jetpack

Jetpack is a high reliability platform for processing background tasks and running complex workflows.

Workflows are described using state machines that describe how tasks should transition between different states.

State machines can be connected together to handle all manner of workflows and edge cases. The state machines are stored and evaluated in the persistence layer ensuring transitions are always executed, even following a total system failure. The entire state of the system can be introspected at any point in time, including moments past.

## Introduction

A state machine describes:

1. All the possibe states a state machine node can be in
2. How the node can transition from one state to another

A set of states is described as an object:

```js
{
  states: {
    pending: {},
    failed: {},
    running: {},
    done: {}
  }
}
```

The transitions are describe in the form `EVENT: 'next-state'`.

```js
{
  states: {
    pending: {},
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
      onEnter: 'pending';
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
        then: 'pending'
      }
    }
  }
}
```

Here, operators in the form `{ type: 'operator-type', ...payload }` are used to create a guard that only allows a transition when the node's iterations is >= 4.

In the upcoming examples we'll see that typed helpers are provided to simplify the composition of operators.

### A low-level example

Starting with just the low-level `createMachine` function, let's take define a task machine that restarts whenever it fails or times out, up to 5 times.

```ts
import { createMachine } from '@djgrant/jetpack';

const taskMachine = await createMachine({
  name: 'My task machine',
  initial: 'pending',
  states: {
    pending: {
      onEvent: {
        LOCKED_BY_WORKER: 'running',
      },
    },
    running: {
      onEvent: {
        ERROR: 'failed',
        SUCCESS: 'done',
        IDLE: 'idle',
      },
    },
    failed: {
      onEnter: {
        type: 'cond',
        when: {
          type: 'lte',
          left: {
            type: 'context',
            path: 'iterations',
          },
          right: 5,
        },
        then: 'pending',
      },
    },
    idle: {
      onEnter: {
        type: 'cond',
        when: {
          type: 'lte',
          left: {
            type: 'context',
            path: 'iterations',
          },
          right: 5,
        },
        then: 'pending',
      },
    },
    done: {},
  },
});
```

> 💡 Workers looks for tasks in a `pending` state to lock (that is, to take off the queue and execute). Whenever this task is locked by a worker, it receives a `LOCKED_BY_WORKER` event and transitions to the `running` state.

### Using operators to describe transitions

The above code is very verbose and exactly the kind of code we don't want to be writing by hand. Instead, we can use the provided operators to clean it up.

```ts
import { createMachine, operators } from '@djgrant/jetpack';
const { retry } = operators;

const taskMachine = await createMachine({
  name: 'My task machine',
  initial: 'pending',
  states: {
    pending: {
      onEvent: {
        LOCKED_BY_WORKER: 'running',
      },
    },
    running: {
      onEvent: {
        ERROR: 'failed',
        SUCCESS: 'done',
        IDLE: 'idle',
      },
    },
    failed: { onEnter: retry(5) },
    idle: { onEnter: retry(5) },
    done: {},
  },
});
```

The `retry` operator itself is a composition of other operators:

```ts
import { operators } from '@djgrant/jetpack';
const { cond, lte, context } = operators;

const retry = (maxAttempts: number) =>
  cond(lte(context('iterations'), 5), 'running');
```

### Simplifying task machines

This is easier to read but it's still code that we'll end up writing for every task.

Instead, we can use `createTaskMachine`, which has standard task transitions set by default.

```ts
import { createTaskMachine } from "@djgrant/jetpack";

const taskMachine = await createTaskMachine({
  name: 'My task machine'
  maxAttempts: 5
});
```

### Extending task machines

Now that we've abstracted the state machine away what exactly is the benefit of using one? State machines allow us to create more advanced workflows with runtime guarantees.

Let's create a task machine which uses the `scheduleTask` operator to schedule a new task once it reaches the `done` state.

```ts
import { createTaskMachine, createTask, operators } from "@djgrant/jetpack";
const { scheduleTask } = operators;

export const nextTaskMachine = await createTaskMachine({
  name: 'My next task',
  maxAttempts: 2
});

export const taskMachine = await createTaskMachine({
  name: 'My task machine'
  maxAttempts: 5,
  states: {
    done: {
      onEnter: scheduleTask({
        name: 'Sub Task',
        machine: nextTaskMachine
      })
    }
  }
});
```

And, voila, we now have a workflow.

### Responding to state machines

Now that we have a state machine defined we need to:

1. Create an instance of our root machine (called a task)
1. Define handlers that get run whenever a machine's task enters the `running` state

```ts
import { taskMachine, nextTaskMachine } from './my-machines';

await taskMachine.create({
  name: 'My task',
  delayFor: '1 hour',
});

taskMachine.onRunning(async () => {
  // do work
});

nextTaskMachine.onRunning('path/to/file');
```

### Visualising workflows

Once the state machines have been created in the database, they can introspected.

```bash
$ npx jetpack viz

Generated visualiation of jetpack workflow: http://localhost:4329
```
