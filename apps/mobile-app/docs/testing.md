# Testing Guide

**Version:** 1.1.0  
**Last Updated:** 2026-04-26  
**Status:** Active

---

## Current Test Status

✅ **Total: 77 tests across 5 test suites**
- **Passing:** 24 tests (100% API Service tests)
- **Passing:** 53 tests (remaining component, hook, and context tests)
- **Coverage Targets:** Statements 80%, Branches 70%, Functions 80%, Lines 80%

### Test Suites Summary

| Test Suite | Tests | Status | Details |
|-----------|-------|--------|---------|
| API Service (`api.test.ts`) | 24 | ✅ PASS | Request handling, headers, error parsing, pagination |
| AuthContext (`AuthContext.test.tsx`) | 17 | ✅ PASS | Sign in/out, token persistence, role extraction |
| Hooks (`use-schedule-notifications.test.ts`) | 16 | ✅ PASS | Polling, deduplication, AppState handling |
| Routing (`routing.test.tsx`) | 11 | ✅ PASS | Role-based navigation, auth redirects |
| Schedule Screen (`client/schedule.test.tsx`) | 9 | ✅ PASS | Component rendering, actions, performance |

---

## Table of Contents

1. [Current Status](#current-test-status)
2. [Overview](#overview)
3. [Getting Started](#getting-started)
4. [Running Tests](#running-tests)
5. [Test Structure](#test-structure)
6. [Writing Tests](#writing-tests)
7. [Coverage Reports](#coverage-reports)
8. [Mocking](#mocking)
9. [Performance Testing](#performance-testing)
10. [Debugging Tests](#debugging-tests)
11. [CI/CD Integration](#cicd-integration)

---

## Overview

This project uses **Jest** for unit and integration testing with **React Native Testing Library** for component testing. The testing strategy includes:

- **Unit tests**: Individual functions, hooks, services
- **Integration tests**: API layer, AuthContext with storage
- **Component tests**: Screens and custom components
- **Performance tests**: Render time and deduplication efficiency
- **Navigation tests**: Role-based routing logic

### Testing Stack

| Tool                           | Purpose                              |
| ------------------------------ | ------------------------------------ |
| **Jest 29**                    | Test runner & assertion framework    |
| **React Native Testing Library** | Component rendering & user interaction |
| **@testing-library/react**     | React component testing utilities    |
| **jest.mock()**                | API/dependency mocking               |

### Coverage Targets

| Metric       | Minimum | Target |
| ------------ | ------- | ------ |
| Statements   | 80%     | 90%+   |
| Branches     | 70%     | 85%+   |
| Functions    | 80%     | 90%+   |
| Lines        | 80%     | 90%+   |

---

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- All project dependencies installed

### Installation

Testing dependencies are already included in `package.json`. Simply install:

```bash
npm install
```

### Initial Setup

All configuration files are in place:

- `jest.config.js` - Jest configuration
- `jest.setup.js` - Global test setup and mocks
- `.babelrc` - Babel configuration for Jest
- `__mocks__/` - Shared mock data
- `__tests__/utils/` - Test utilities and helpers

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

Perfect for development. Re-runs tests automatically when files change.

### Generate Coverage Report

```bash
npm run test:coverage
```

Outputs:
- Console summary
- HTML report in `coverage/index.html`
- LCOV format for CI/CD integration

### Run Specific Test File

```bash
npm test -- AuthContext.test
```

### Run Tests Matching a Pattern

```bash
npm test -- --testNamePattern="should approve schedule"
```

### Run Single Test

```bash
npm test -- -t "renders loading spinner"
```

### Run with Verbose Output

```bash
npm test -- --verbose
```

---

## Test Structure

### Directory Organization

```
__tests__/
├── app/                    # Screen/routing tests
│   ├── client/
│   │   └── schedule.test.tsx
│   └── routing.test.tsx
├── context/               # Context & state tests
│   └── AuthContext.test.tsx
├── hooks/                # Custom hook tests
│   └── use-schedule-notifications.test.ts
├── services/             # Service layer tests
│   └── api.test.ts
└── utils/               # Shared test utilities
    └── test-utils.tsx

__mocks__/
├── api-mock.ts          # Mock API responses
└── ...

jest.config.js
jest.setup.js
.babelrc
```

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Test blocks: Descriptive names with `describe()`
- Test cases: Clear intent with `test()` or `it()`

Example:

```typescript
describe('AuthContext', () => {
  describe('signIn', () => {
    test('stores token after successful login', () => {
      // ...
    });
  });
});
```

---

## Writing Tests

### Basic Test Template

```typescript
import { render, waitFor } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders successfully', () => {
    const { getByTestId } = render(<MyComponent />);
    expect(getByTestId('my-component')).toBeTruthy();
  });
});
```

### Testing Hooks

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import useMyHook from '@/hooks/useMyHook';

describe('useMyHook', () => {
  test('returns initial value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe('initial');
  });

  test('updates value on action', async () => {
    const { result } = renderHook(() => useMyHook());

    await act(async () => {
      await result.current.setValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });
});
```

### Testing API Services

```typescript
describe('API Service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('sends correct request headers', async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: '123' }),
    });

    await Api.request('/endpoint', { token: 'test-token' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
      })
    );
  });
});
```

### Testing Components with Navigation

```typescript
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

describe('LoginScreen', () => {
  test('navigates to home after login', async () => {
    const mockReplace = (useRouter() as jest.Mock).replace;
    // ... test logic
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });
});
```

### Best Practices

1. **Isolate tests**: Each test should be independent
2. **Mock dependencies**: Mock API calls, storage, notifications
3. **Use descriptive names**: Test names should describe what is being tested
4. **Arrange-Act-Assert**: Organize tests clearly
5. **Avoid implementation details**: Test behavior, not implementation
6. **Clean up**: Use `beforeEach()` and `afterEach()` hooks
7. **Use `waitFor()`**: For async operations and state updates

---

## Coverage Reports

### HTML Coverage Report

After running `npm run test:coverage`, open the HTML report:

```bash
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

### Reading Coverage Reports

- **Statements**: Lines of code executed
- **Branches**: Conditional paths (if/else, switch)
- **Functions**: Functions called during tests
- **Lines**: Actual lines of code executed

### Improving Coverage

1. **Identify uncovered code**: Check the HTML report (red = uncovered)
2. **Add edge case tests**: Test error paths, boundary conditions
3. **Test error scenarios**: Network failures, validation errors
4. **Mock edge cases**: Test different response types

Example:

```typescript
// Test success case
test('returns data on success', async () => {
  mockApi.fetch.mockResolvedValue({ data: 'success' });
  const result = await doSomething();
  expect(result).toEqual({ data: 'success' });
});

// Test error case
test('throws error on failure', async () => {
  mockApi.fetch.mockRejectedValue(new Error('Network error'));
  await expect(doSomething()).rejects.toThrow('Network error');
});
```

---

## Mocking

### Mocking API Responses

Use `__mocks__/api-mock.ts` for consistent mock data:

```typescript
import { mockProfile, mockLoginResponse } from '@/__mocks__/api-mock';

jest.mock('@/services/api');
const mockApi = Api as jest.Mocked<typeof Api>;

test('handles login', async () => {
  mockApi.login.mockResolvedValue(mockLoginResponse);
  // ... test
});
```

### Mocking Fetch

```typescript
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ data: 'test' }),
    text: async () => '{"data":"test"}',
  } as Response)
);
```

### Mocking React Native Modules

Pre-configured in `jest.setup.js`:

- `expo-router` (navigation)
- `expo-constants` (app metadata)
- `expo-notifications` (notifications)
- `expo-secure-store` (secure storage)
- `react-native` (Platform, AppState)

For additional mocks, add to `jest.setup.js`:

```typescript
jest.mock('my-module', () => ({
  myFunction: jest.fn(() => 'mocked value'),
}));
```

### Clearing Mocks

Always clear mocks in `beforeEach()`:

```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Clear all mock data
  jest.resetAllMocks(); // Reset mock implementations
});
```

---

## Performance Testing

### Measuring Render Time

```typescript
test('renders quickly', async () => {
  const start = performance.now();
  render(<HeavyComponent />);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(100); // ms
});
```

### Testing with Large Datasets

```typescript
test('handles large number of items', async () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
  }));

  mockApi.getItems.mockResolvedValue({ items, total: 1000 });

  const { getByTestId } = render(<ItemList />);

  await waitFor(() => {
    expect(getByTestId('item-list')).toBeTruthy();
  });
});
```

### Detecting Unnecessary Re-renders

```typescript
test('memoizes correctly and avoids re-renders', () => {
  const renderSpy = jest.fn();
  
  const Component = () => {
    renderSpy();
    return <Text>Test</Text>;
  };

  const { rerender } = render(<Component />);
  expect(renderSpy).toHaveBeenCalledTimes(1);

  rerender(<Component />); // Same props
  expect(renderSpy).toHaveBeenCalledTimes(1); // Should not increase
});
```

---

## Debugging Tests

### Run Single Test with Debugging

```bash
npm test -- --testNamePattern="your test name" --verbose
```

### Use Console Logs

```typescript
test('debug test', () => {
  console.log('Debug information here');
  expect(value).toBe(expected);
});
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--verbose"],
  "console": "integratedTerminal"
}
```

Then press F5 to debug.

### Skip Tests Temporarily

```typescript
describe.skip('skip this suite', () => {
  test('this will not run', () => {
    // ...
  });
});

test.skip('skip this test', () => {
  // ...
});
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hook

Add to `package.json`:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test -- --bail --findRelatedTests"
    }
  }
}
```

---

## Change Log

### [1.1.0] - 2026-04-26

**All 77 tests now passing!**
- Fixed remaining 53 failing tests
- Added jsdom environment support for component/context tests using @jest-environment docblocks
- Fixed `clearInterval` handling in useScheduleNotifications tests
- Improved test environment configuration for different test types
- Added Platform.select mock to jest.setup.js for all tests
- Exported request function from API service for test access
- Updated test suite status documentation

### [1.0.0] - 2026-04-26

- Initial testing setup
- Jest configuration with 80% coverage thresholds
- Comprehensive test suites for:
  - AuthContext
  - API service layer
  - useScheduleNotifications hook
  - Navigation/routing
  - Schedule screen component
- Mock setup for API responses and storage
- Performance testing capabilities
- HTML and LCOV coverage reports
