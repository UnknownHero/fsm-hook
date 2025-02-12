### Why ?

If your components have multiple states and you want to have a clear and maintainable way to manage them, you can use this library. 

It is a simple finite state machine as a hook. 

React docs ref - https://react.dev/learn/managing-state
\
Wiki - https://en.wikipedia.org/wiki/Finite-state_machine

### Features

- finite state machine as hook
- initial state 
- transitions
- history
- logs
- typesafe FSM map
- typesafe transition
- 100% code coverage
- size: 698 B (with all dependencies, minified and brotlied)

### What is not

- Event Emitter: This library does not handle event emission.

- Logic Provider: It does not provide business logic.

- Side Effect Handler: It does not manage side effects.

- Component Render: It does not handle component rendering.


### Comparison 

#### With Statex/store:
According to Statex/store documentation, "It is comparable to libraries like Zustand, Redux, and Pinia."

So, there's no need for further comparison. It's not a pure finite state machine; it's a more complex solution. useFSM is a pure finite state machine without additional functionality.

#### With cassiozen/useStateMachine:
It's a nice and small solution, but it includes side effect handling.
The code that describes the state machine is about 10 times larger compared to useFSM.
Additionally, cassiozen/useStateMachine doesn't have history.

### Install

    npm install fsm-hook

### Examples

Full example:
```tsx
import { FSMProvider, useFSM } from "fsm-hook";

const customLogger = {
  log: (message: string) => console.log(message),
  warn: (message: string) => console.warn(message),
};

const App = () => {
  const {
    currentState,
    transition,
    undo,
    availableTransitions,
    getHistory,
  } = useFSM(
    "idle", // Initial state
    {
      // Define state transitions
      idle: { typing: "fillForm" },
      fillForm: { submitting: "waitSubmitting", canceling: "idle" },
      waitSubmitting: { success: "done", failure: "fail", reset: "idle" },
      fail: { restart: "idle" },
      done: {},
    },
    { logLevel: "debug", maxHistoryLength: 10 } // !This configuration override FSMProvider config
  );

  return (
    <div>
      <p>Current State: {currentState}</p>
      <p>Available Transitions: {availableTransitions().join(", ")}</p>
      <button onClick={() => transition<"idle">("typing")}>Start Typing</button>
      <button onClick={() => transition("submitting")}>Submit</button>
      <button onClick={() => transition("canceling")}>Cancel</button>
      <button onClick={() => transition("success")}>Success</button>
      <button onClick={() => transition("failure")}>Failure</button>
      <button onClick={() => transition("restart")}>Restart</button>
      <button onClick={() => transition("reset")}>Reset</button>
      <button onClick={undo}>Undo</button>

      <p>History: {getHistory().join(" -> ")}</p>
    </div>
  );
};

const Root = () => (
  <FSMProvider config={{ logLevel: "debug", maxHistoryLength: 10, logger: customLogger }}>
    <App />
  </FSMProvider>
);

export default Root;
```

### Structure of transitions map
```tsx
{
  'STATE1_NAME': { 'TRANSITION1_NAME': 'STATE2_NAME'  }
  'STATE2_NAME': { 'TRANSITION2_NAME': 'STATE1_NAME','TRANSITION3_NAME': 'STATE3_NAME'   }
  'STATE3_NAME': { 'TRANSITION4_NAME': 'STATE4_NAME'  },
  'STATE4_NAME': {}
}
```

### Key Features in Action
- Initial State: The FSM starts in the idle state.

- Transitions: Buttons trigger state transitions (e.g., typing moves from idle to fillForm).

- History: The history of state changes is tracked and displayed.

- Undo: The undo function allows reverting to the previous state.

- Logging: Custom logging is enabled for debugging.

### Configuration Options
The FSMProvider and useFSM hook accept the following configuration options:

- logLevel: Set the logging level (debug, info, warn, error).

- maxHistoryLength: Limit the number of states stored in history.

- logger: Provide a custom logger object with log and warn methods.

### Type Safety
The library ensures type safety when defining your FSM:

- Invalid States: Errors are thrown if a state is not defined or unused.

- Invalid Transitions: Errors are thrown if a transition leads to an invalid state.

Example of type-safe transitions:

```tsx
useFSM("idle", {
  idle: { typing: "fillForm" }, // Error if 'fillForm' is not a valid state
  done: {}, // Error if 'done' is not used in any transition
});
```

#### Debugging with Mermaid Diagrams

You can generate a Mermaid diagram to visualize your state machine:

```tsx
import { generateMermaidDiagram } from "fsm-hook";

const diagram = generateMermaidDiagram({
  idle: { typing: "fillForm" },
  fillForm: { submitting: "waitSubmitting", canceling: "idle" },
  waitSubmitting: { success: "done", failure: "fail", reset: "idle" },
  fail: { restart: "idle" },
  done: {},
});

console.log(diagram);
```

And put result here - https://www.mermaidchart.com/play
