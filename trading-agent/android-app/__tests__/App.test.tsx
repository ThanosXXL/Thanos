/**
 * @format
 */

import React from 'react';
import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import {it} from '@jest/globals';

// Note: test renderer must be required after react-native.
import {act, create} from 'react-test-renderer';

jest.useFakeTimers();

it('renders correctly', async () => {
  let root: ReturnType<typeof create>;
  await act(async () => {
    root = create(<App />);
  });
  root!.unmount();
});
