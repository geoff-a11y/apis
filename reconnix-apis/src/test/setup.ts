import '@testing-library/jest-dom';

// Mock ResizeObserver for Recharts tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
