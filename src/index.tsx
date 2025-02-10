import {useReducer, useCallback, useContext, createContext, useDebugValue} from 'react';

/**
 * Type for State Machine transitions
 * @typeParam TState - Constraints. Array of strings. List of all possible States
 * @typeParam TTransition - Constraints. Array of strings. List of all possible Transitions in all States
 * @Example { state1: { transition1: 'state1' }, state2: { transition2: 'state2' } }
 * @Example { state1: { transition1: 'state1' }, state2: { transition2: 'state3' } } // Error! state3 not exists
 * @Example { state1: { transition1: 'state1' }, state2: { transition2: 'state2' }, state3: {} } // Error! state3 not used
 *
 * @version 0.1.0
 */
type Transitions<TState extends string, TTransition extends string> = {
  [K in TState]: {
    [M in TTransition]?: TState;
  };
};

/**
 * Internal logger. Used to log messages and warnings
 * log - for debug level
 * warn - debug and info level
 *
 * console as default logger
 *
 * @version 0.1.0
 */
export type FSMLogger = {
  log: (message: string) => void;
  warn: (message: string) => void;
};

/**
 * @property logLevel - level of logs. Values: 'none' | 'info' | 'debug'. Default: 'none'
 * @property maxHistoryLength - Length of history array. FIFO. Default: Infinity
 * @property logger - logger provider that implement FSMLogger type. console default logger
 *
 * @version 0.1.0
 */
export type FSMConfig = {
  /**
   * @default none
   *
   * none = disable any log
   * info - warns only. Possible when call invalid transition or undo empty history
   * debug - show all logs. Warns and transitions between states
   *
   * @version 0.1.0
   */
  logLevel?: 'none' | 'info' | 'debug';

  /**
   * @default Infinity
   *
   * 0 or less is equal to disable history
   *
   * @version 0.1.0
   */
  maxHistoryLength?: number;

  /**
   * @default console
   *
   * logger provider
   *
   * @version 0.1.0
   */
  logger?: FSMLogger;
};

/**
 * @property currentState - current state of FSM
 * @property history - history of states. FIFO
 *
 * Type of State Machine react states
 *
 * @version 0.1.0
 */
type FSMState<TState extends string> = {
  currentState: TState;
  history: TState[];
};

/**
 *
 * Action type for State Machine.
 * TRANSITION - when need to change state
 * UNDO - when need to undo transition by history
 *
 * @version 0.1.0
 */
type FSMAction<TState extends string> = { type: 'TRANSITION'; to: TState } | { type: 'UNDO' };

/**
 * @property currentState - current state of FSM
 * @property history - history of states. FIFO
 *
 * Reducer of actions for State Machine
 * Change states and save/cut/undo history
 *
 * @version 0.1.0
 */
const FSMReducer = <TState extends string>(
  state: FSMState<TState>,
  action: FSMAction<TState>,
  maxHistoryLength: number = Infinity,
): FSMState<TState> => {
  switch (action.type) {
    case 'TRANSITION':
      return {
        currentState: action.to,
        history:
          maxHistoryLength > 0
            ? state.history.concat(state.currentState).slice(-maxHistoryLength)
            : [],
      };
    case 'UNDO':
      return {
        currentState: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
      };
  }
};

/**
 * Context for State Machine
 *
 * @property logLevel - level of logs. Values: 'none' | 'info' | 'debug'. Default: 'none'
 * @property maxHistoryLength - Length of history array. FIFO. Default: Infinity
 * @property logger - logger provider that implement FSMLogger type. console default logger
 *
 * @version 0.1.0
 */
const FSMContext = createContext<FSMConfig>({
  logLevel: 'none',
  maxHistoryLength: Infinity,
  logger: console,
});

/**
 * hook for create and use State Machine
 *
 * @property initialState - initial state of FSM. One of state in transitions (second property)
 * @property transitions - map of states and transitions. { "state": { "transition": "otherState" }, "otherState": {} }
 * @property config - direct configuration for FSM. If not set, use global configuration or FSMContext
 *
 * @example
 *     const {result} = renderHook(() => useFSM(
 *       'idle',
 *       {
 *         idle: {typing: 'typing'},
 *         typing: {submitting: 'submitting', canceling: 'idle'},
 *         submitting: {success: 'idle', failure: 'fail'},
 *         fail: {restart: 'idle'},
 *       },
 *       {logLevel: 'debug', maxHistoryLength: 10, logger: console },
 *     ))
 *
 * @version 0.1.0
 */
const useFSM = <TState extends string, TTransition extends string, TTransitionMap>(
  initialState: TState,
  transitions: TTransitionMap & Transitions<TState, TTransition>,
  config?: FSMConfig,
) => {
  const globalConfig = useContext(FSMContext);
  const mergedConfig = {...globalConfig, ...config};

  const [state, dispatch] = useReducer(
    (state: FSMState<TState>, action: FSMAction<TState>) =>
      FSMReducer(state, action, mergedConfig.maxHistoryLength),
    {
      currentState: initialState,
      history: [],
    },
  );

  const logger = mergedConfig.logger || console;

  /**
   * @typeParam TPredicatedState - predicated current state. Help to show only available transitions. If not pass, it will show all transitions of all states.
   *
   * Transition to another state
   * if pass Generic with predicated (because currentState is runtime value) current state, then will show only available transitions
   */
  const transition = useCallback(
    <TPredicatedState extends keyof TTransitionMap>(to: TPredicatedState extends keyof TTransitionMap ? keyof TTransitionMap[TPredicatedState] : keyof (typeof transitions)[TState]) => {
      if (transitions[state.currentState][to as unknown as TTransition]) {
        if (mergedConfig.logLevel === 'debug') {
          logger.log(`Transitioning from ${state.currentState} to ${to.toString()}`);
        }
        dispatch({
          type: 'TRANSITION',
          to: transitions[state.currentState][to as unknown as TTransition] as TState,
        });
      } else {
        if (mergedConfig.logLevel !== 'none') {
          logger.warn(`Invalid transition from ${state.currentState} to ${to.toString()}`);
        }
      }
    },
    [state.currentState, transitions, mergedConfig.logLevel, logger],
  );

  /**
   * undo one step in history
   */
  const undo = useCallback(() => {
    if (state.history.length > 0) {
      if (mergedConfig.logLevel === 'debug') {
        logger.log(
          `Undoing from ${state.currentState} to ${state.history[state.history.length - 1]}`,
        );
      }
      dispatch({type: 'UNDO'});
    } else {
      if (mergedConfig.logLevel !== 'none') {
        logger.warn('No history to undo');
      }
    }
  }, [state.currentState, state.history, mergedConfig.logLevel, logger]);

  /**
   * Get available transitions for current state
   * @return string[] - list of available transitions for current state
   */
  const availableTransitions = useCallback(() => {
    return Object.keys(transitions[state.currentState]);
  }, [state.currentState, transitions]);

  /**
   * Get history of current states
   * @return string[] - list of states in history
   */
  const getHistory = useCallback(() => {
    return state.history;
  }, [state.history]);

  useDebugValue(state.currentState);

  return {
    currentState: state.currentState,
    transition,
    undo,
    availableTransitions,
    getHistory,
  };
};

/**
 * Provider props for State Machine
 *
 * @property config - configuration for all children FSM
 *
 * @example
 *   <FSMProvider config={{logLevel: 'debug', maxHistoryLength: 0, logger: console }}>
 *     <App/>
 *   </FSMProvider>
 *
 * @version 0.1.0
 */
interface FSMProviderProps {
  config: FSMConfig;
  children: React.ReactNode;
}

/**
 * Provider for State Machine
 *
 * @example
 *   <FSMProvider config={{logLevel: 'debug', maxHistoryLength: 0, logger: console }}>
 *     <App/>
 *   </FSMProvider>
 *
 * @version 0.1.0
 */
function FSMProvider({config, children}: FSMProviderProps) {
  return <FSMContext.Provider value={config}>{children}</FSMContext.Provider>;
}


/**
 * Generate Mermaid diagram from transitions. You can pass result in https://www.mermaidchart.com/play
 *
 * @property transitions - states and transitions of FSM. Second param of useFSM
 *
 * @example
 *  console.log(generateMermaidDiagram({
 *     idle: {typing: 'typing'},
 *     typing: {submitting: 'submitting', canceling: 'idle'},
 *     submitting: {success: 'done', failure: 'fail'},
 *     fail: {restart: 'idle'},
 *     done: {}
 *   }));
 *
 * @return string - Mermaid diagram code
 *
 * @version 0.1.0
 */
const generateMermaidDiagram = <T extends string, N extends string>(
  transitions: Transitions<T, N>,
): string => {
  let mermaidCode = 'stateDiagram-v2\n';
  for (const [fromState, transitionsFromState] of Object.entries(transitions)) {
    if (transitionsFromState) {
      for (const [event, toState] of Object.entries(transitionsFromState)) {
        mermaidCode += `    ${fromState} --> ${toState}: ${event}\n`;
      }
    }
  }
  return mermaidCode;
};

export {useFSM, FSMProvider, generateMermaidDiagram};
