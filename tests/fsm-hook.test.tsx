import {it, expect, describe, vi} from 'vitest'
import {render, screen, fireEvent, renderHook, act} from '@testing-library/react';
import {FSMLogger, FSMProvider, generateMermaidDiagram, useFSM} from '../src';
import {TestComponent} from "./fsm-hook-components";

describe('useFSM Hook', () => {
  it('should initialize with the correct state', () => {
    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'debug'},
    ));

    expect(result.current.currentState).to.equal('idle');
    expect(result.current.availableTransitions()).to.have.members(['typing']);
  });

  it('should transition to the next state correctly', () => {
    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'debug'},
    ));

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    expect(result.current.currentState).to.equal('typing');
    expect(result.current.availableTransitions()).to.have.members(['submitting','canceling']);
  });

  it('should handle undo correctly', () => {
    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'debug'},
    ));

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    act(() => {
      result.current.undo()
    });

    expect(result.current.currentState).to.equal('idle');
    expect(result.current.availableTransitions()).to.have.members(['typing']);
  });

  it('should\'t handle undo when maxHistoryLength is 0', () => {
    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'debug', maxHistoryLength: 0},
    ));

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    act(() => {
      result.current.undo()
    });

    expect(result.current.currentState).to.equal('typing');
    expect(result.current.availableTransitions()).to.have.members(['submitting','canceling']);
  });

  it('should\'t show logger warn when logLevel is none', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'none', maxHistoryLength: 0},
    ));

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    expect(consoleSpy).not.toHaveBeenCalledWith('Invalid transition from typing to success');

    act(() => {
      result.current.undo()
    });

    expect(consoleSpy).not.toHaveBeenCalledWith('No history to undo');

    consoleSpy.mockRestore();
  });

  it('should log transitions when logLevel is debug', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'debug'},
    ));

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    expect(consoleSpy).toHaveBeenCalledWith('Transitioning from idle to typing');
    consoleSpy.mockRestore();
  });

  it('should warn on invalid transitions', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'debug'},
    ));

    act(() => {
      result.current.transition('typing')
    });

    act(() => {
      result.current.transition('success')
    });

    expect(consoleSpy).toHaveBeenCalledWith('Invalid transition from typing to success');
    consoleSpy.mockRestore();
  });

  it('should log on no history to UNDO', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'debug'},
    ));

    act(() => {
      result.current.undo()
    });

    expect(consoleSpy).toHaveBeenCalledWith('No history to undo');
    consoleSpy.mockRestore();
  });


  it('should log on disabled history to UNDO', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'debug'},
    ));

    act(() => {
      result.current.undo()
    });

    expect(consoleSpy).toHaveBeenCalledWith('No history to undo');
    consoleSpy.mockRestore();
  });

  it('should generate correct Mermaid diagram', () => {
    const transitions = {
      idle: {typing: 'typing'},
      typing: {submitting: 'submitting', canceling: 'idle'},
      submitting: {success: 'idle', failure: 'fail'},
      fail: {restart: 'idle'},
    };

    const expectedDiagram = `stateDiagram-v2
    idle --> typing: typing
    typing --> submitting: submitting
    typing --> idle: canceling
    submitting --> idle: success
    submitting --> fail: failure
    fail --> idle: restart
`;

    expect(generateMermaidDiagram(transitions)).toBe(expectedDiagram);
  });

  it('should\'t log transition on info logLevel', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'info'},
    ));

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    expect(consoleSpy).not.toHaveBeenCalledWith('Transitioning from idle to typing');
    consoleSpy.mockRestore();
  });

  it('should\'t log transition on none logLevel', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'none'},
    ));

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    expect(consoleSpy).not.toHaveBeenCalledWith('Transitioning from idle to typing');
    consoleSpy.mockRestore();
  });

  it('should have correct history', () => {
    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'none'},
    ));

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    act(() => {
      result.current.transition<'typing'>('submitting')
    });

    act(() => {
      result.current.transition<'submitting'>('success')
    });

    expect(result.current.getHistory()).to.eql(['idle','typing','submitting']);
  });

  it('should have limited transition history', () => {
    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'none', maxHistoryLength: 2},
    ));

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    act(() => {
      result.current.transition<'typing'>('submitting')
    });

    act(() => {
      result.current.transition<'submitting'>('success')
    });

    expect(result.current.getHistory()).to.eql(['typing','submitting']);
  });

  it('should log with custom logger', () => {
    const customLogger: FSMLogger = {
      log:(_: string) => {},
      warn:(_: string) => {},
    }

    const customLoggerLogSpy = vi.spyOn(customLogger, 'log').mockImplementation(() => undefined);
    const customLoggerWarnSpy = vi.spyOn(customLogger, 'warn').mockImplementation(() => undefined);

    const {result} = renderHook(() => useFSM(
      'idle',
      {
        idle: {typing: 'typing'},
        typing: {submitting: 'submitting', canceling: 'idle'},
        submitting: {success: 'idle', failure: 'fail'},
        fail: {restart: 'idle'},
      },
      {logLevel: 'debug', logger: customLogger},
    ));

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    expect(customLoggerLogSpy).toHaveBeenCalledWith('Transitioning from idle to typing');
    customLoggerLogSpy.mockRestore();

    act(() => {
      result.current.transition<'idle'>('typing')
    });

    expect(customLoggerWarnSpy).toHaveBeenCalledWith('Invalid transition from typing to typing');
    customLoggerWarnSpy.mockRestore();
  });

});

describe('FSMProvider Component', () => {
  it('should log transition on debug log logger level', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    render(
      <FSMProvider config={{ logLevel: 'debug' }}>
        <TestComponent />
      </FSMProvider>
    );


    fireEvent.click(screen.getByText(/Start Typing/i));

    expect(consoleSpy).toHaveBeenCalledWith('Transitioning from idle to typing');
    consoleSpy.mockRestore();
  });

  it('should\'t log transition on info logger level', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    render(
      <FSMProvider config={{ logLevel: 'info' }}>
        <TestComponent />
      </FSMProvider>
    );


    fireEvent.click(screen.getByText(/Start Typing/i));

    expect(consoleSpy).not.toHaveBeenCalledWith('Transitioning from idle to typing');
    consoleSpy.mockRestore();
  });

  it('should\'t log transition on none logger level', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    render(
      <FSMProvider config={{ logLevel: 'none' }}>
        <TestComponent />
      </FSMProvider>
    );


    fireEvent.click(screen.getByText(/Start Typing/i));

    expect(consoleSpy).not.toHaveBeenCalledWith('Transitioning from idle to typing');
    consoleSpy.mockRestore();
  });

  it('should\'t have history when maxHistoryLength is 0', () => {
    render(
      <FSMProvider config={{ logLevel: 'none', maxHistoryLength: 0 }}>
        <TestComponent />
      </FSMProvider>
    );


    fireEvent.click(screen.getByText(/Start Typing/i));
    expect(() => screen.getByText(/History: idle/i)).toThrow();
  });

  it('should log transitions using custom logger', () => {
    const customLogger: FSMLogger = {
      log:(_: string) => {},
      warn:(_: string) => {},
    }

    const customLoggerLogSpy = vi.spyOn(customLogger, 'log').mockImplementation(() => undefined);
    const customLoggerWarnSpy = vi.spyOn(customLogger, 'warn').mockImplementation(() => undefined);

    render(
      <FSMProvider config={{ logLevel: 'debug', maxHistoryLength: 0, logger: customLogger }}>
        <TestComponent />
      </FSMProvider>
    );

    fireEvent.click(screen.getByText(/Start Typing/i));
    expect(customLoggerLogSpy).toHaveBeenCalledWith('Transitioning from idle to typing');
    customLoggerLogSpy.mockRestore();

    fireEvent.click(screen.getByText(/Start Typing/i));
    expect(customLoggerWarnSpy).toHaveBeenCalledWith('Invalid transition from typing to typing');
    customLoggerWarnSpy.mockRestore();
  });

  it('should\'t log using custom logger with info log level', () => {
    const customLogger: FSMLogger = {
      log:(_: string) => {},
      warn:(_: string) => {},
    }

    const customLoggerLogSpy = vi.spyOn(customLogger, 'log').mockImplementation(() => undefined);

    render(
      <FSMProvider config={{ logLevel: 'info', logger: customLogger }}>
        <TestComponent />
      </FSMProvider>
    );

    fireEvent.click(screen.getByText(/Start Typing/i));
    expect(customLoggerLogSpy).not.toHaveBeenCalledWith('Transitioning from idle to typing');
    customLoggerLogSpy.mockRestore();
  });

  it('should\'t log using custom logger with none log level', () => {
    const customLogger: FSMLogger = {
      log:(_: string) => {},
      warn:(_: string) => {},
    }

    const customLoggerLogSpy = vi.spyOn(customLogger, 'log').mockImplementation(() => undefined);

    render(
      <FSMProvider config={{ logLevel: 'none', logger: customLogger }}>
        <TestComponent />
      </FSMProvider>
    );

    fireEvent.click(screen.getByText(/Start Typing/i));
    expect(customLoggerLogSpy).not.toHaveBeenCalledWith('Transitioning from idle to typing');
    customLoggerLogSpy.mockRestore();
  });

  it('should log using custom logger with debug log level', () => {
    const customLogger: FSMLogger = {
      log:(_: string) => {},
      warn:(_: string) => {},
    }

    const customLoggerLogSpy = vi.spyOn(customLogger, 'log').mockImplementation(() => undefined);

    render(
      <FSMProvider config={{ logLevel: 'debug', logger: customLogger }}>
        <TestComponent />
      </FSMProvider>
    );

    fireEvent.click(screen.getByText(/Start Typing/i));
    expect(customLoggerLogSpy).toHaveBeenCalledWith('Transitioning from idle to typing');
    customLoggerLogSpy.mockRestore();
  });

});