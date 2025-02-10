import {useFSM} from "../src";

export function TestComponent () {
  const {currentState, transition, undo, availableTransitions, getHistory} = useFSM(
    'idle',
    {
      idle: {typing: 'typing'},
      typing: {submitting: 'submitting', canceling: 'idle'},
      submitting: {success: 'idle', failure: 'fail'},
      fail: {restart: 'idle'},
    }
  );

  return (
    <div>
      <p>Current State: {currentState}</p>
      <p>Available Transitions: {availableTransitions().join(', ')}</p>
      <button onClick={() => transition('typing')}>Start Typing</button>
      <button onClick={() => transition('submitting')}>Submit</button>
      <button onClick={() => transition('canceling')}>Cancel</button>
      <button onClick={() => transition('success')}>Success</button>
      <button onClick={() => transition('failure')}>Failure</button>
      <button onClick={() => transition('restart')}>Restart</button>
      <button onClick={undo}>Undo</button>
      <p>History: {getHistory().join(' -> ')}</p>
    </div>
  );
}