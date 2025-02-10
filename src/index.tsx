import { useReducer, useCallback, useContext, createContext, useDebugValue } from 'react';

type Transitions<T extends string, N extends string> = {
  [K in T]: {
    [M in N]?: T;
  };
};

export type FSMLogger = {
  log: (message: string) => void;
  warn: (message: string) => void;
};

export type FSMConfig = {
  logLevel?: 'none' | 'info' | 'debug';
  maxHistoryLength?: number;
  logger?: FSMLogger;
};

type FSMState<T extends string> = {
  currentState: T;
  history: T[];
};

type FSMAction<T extends string> = { type: 'TRANSITION'; to: T } | { type: 'UNDO' };

const FSMReducer = <T extends string>(
  state: FSMState<T>,
  action: FSMAction<T>,
  maxHistoryLength: number = Infinity,
): FSMState<T> => {
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

const FSMContext = createContext<FSMConfig>({
  logLevel: 'none',
  maxHistoryLength: Infinity,
  logger: console,
});

const useFSM = <T extends string, N extends string, M>(
  initialState: T,
  transitions: M & Transitions<T, N>,
  config?: FSMConfig,
) => {
  const globalConfig = useContext(FSMContext);
  const mergedConfig = { ...globalConfig, ...config };

  const [state, dispatch] = useReducer(
    (state: FSMState<T>, action: FSMAction<T>) =>
      FSMReducer(state, action, mergedConfig.maxHistoryLength),
    {
      currentState: initialState,
      history: [],
    },
  );

  const logger = mergedConfig.logger || console;

  const transition = useCallback(
    <P extends keyof M>(to: P extends keyof M ? keyof M[P] : keyof (typeof transitions)[T]) => {
      if (transitions[state.currentState][to as unknown as N]) {
        if (mergedConfig.logLevel === 'debug') {
          logger.log(`Transitioning from ${state.currentState} to ${to.toString()}`);
        }
        dispatch({
          type: 'TRANSITION',
          to: transitions[state.currentState][to as unknown as N] as T,
        });
      } else {
        if (mergedConfig.logLevel !== 'none') {
          logger.warn(`Invalid transition from ${state.currentState} to ${to.toString()}`);
        }
      }
    },
    [state.currentState, transitions, mergedConfig.logLevel, logger],
  );

  const undo = useCallback(() => {
    if (state.history.length > 0) {
      if (mergedConfig.logLevel === 'debug') {
        logger.log(
          `Undoing from ${state.currentState} to ${state.history[state.history.length - 1]}`,
        );
      }
      dispatch({ type: 'UNDO' });
    } else {
      if (mergedConfig.logLevel !== 'none') {
        logger.warn('No history to undo');
      }
    }
  }, [state.currentState, state.history, mergedConfig.logLevel, logger]);

  const availableTransitions = useCallback(() => {
    return Object.keys(transitions[state.currentState]);
  }, [state.currentState, transitions]);

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

interface FSMProviderProps {
  config: FSMConfig;
  children: React.ReactNode;
}

function FSMProvider({ config, children }: FSMProviderProps) {
  return <FSMContext.Provider value={config}>{children}</FSMContext.Provider>;
}

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

export { useFSM, FSMProvider, generateMermaidDiagram };
