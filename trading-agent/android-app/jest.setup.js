jest.mock('@react-native-async-storage/async-storage', () => {
  const mockStore = new Map();
  return {
    getItem: jest.fn(async (key) => (mockStore.has(key) ? mockStore.get(key) : null)),
    setItem: jest.fn(async (key, value) => {
      mockStore.set(key, value);
    }),
    removeItem: jest.fn(async (key) => {
      mockStore.delete(key);
    }),
  };
});

jest.mock('react-native-background-actions', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  isRunning: jest.fn(() => false),
}));
