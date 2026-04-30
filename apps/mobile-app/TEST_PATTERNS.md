# Test Patterns Quick Reference

**Quick cheat sheet for common testing patterns used in this project.**

---

## Table of Contents

1. [Component Testing](#component-testing)
2. [Hook Testing](#hook-testing)
3. [API Testing](#api-testing)
4. [Context Testing](#context-testing)
5. [Navigation Testing](#navigation-testing)
6. [Assertions](#assertions)
7. [Async Patterns](#async-patterns)

---

## Component Testing

### Basic Component Test

```typescript
import { render, screen } from '@/__tests__/utils/test-utils';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByTestId('my-component')).toBeTruthy();
  });
});
```

### Test with Props

```typescript
test('displays title prop', () => {
  render(<MyComponent title="Hello" />);
  expect(screen.getByText('Hello')).toBeTruthy();
});
```

### Test User Interactions

```typescript
test('calls onPress when button is clicked', () => {
  const onPressMock = jest.fn();
  render(<MyButton onPress={onPressMock} />);
  
  fireEvent.press(screen.getByTestId('my-button'));
  
  expect(onPressMock).toHaveBeenCalled();
});
```

### Test Loading State

```typescript
test('shows loading spinner while fetching', () => {
  render(<DataComponent />);
  expect(screen.getByTestId('loading-spinner')).toBeTruthy();
});

test('hides spinner after data loads', async () => {
  mockApi.fetchData.mockResolvedValue({ data: 'test' });
  
  const { queryByTestId } = render(<DataComponent />);
  
  await waitFor(() => {
    expect(queryByTestId('loading-spinner')).toBeFalsy();
  });
});
```

### Test Error State

```typescript
test('displays error message on failure', async () => {
  mockApi.fetchData.mockRejectedValue(new Error('Failed to load'));
  
  render(<DataComponent />);
  
  await waitFor(() => {
    expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to load');
  });
});
```

---

## Hook Testing

### Basic Hook Test

```typescript
import { renderHook } from '@testing-library/react';
import useMyHook from '@/hooks/useMyHook';

describe('useMyHook', () => {
  test('returns initial value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe('initial');
  });
});
```

### Test Hook with State Update

```typescript
test('updates state when action is called', async () => {
  const { result } = renderHook(() => useMyHook());
  
  await act(async () => {
    await result.current.setValue('new value');
  });
  
  expect(result.current.value).toBe('new value');
});
```

### Test Hook with Provider

```typescript
test('hook works with AuthProvider', () => {
  const { result } = renderHook(() => useMyHook(), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  });
  
  expect(result.current.isAuthenticated).toBe(false);
});
```

### Test Hook Error Throwing

```typescript
test('throws error when used outside provider', () => {
  expect(() => {
    renderHook(() => useMyHook());
  }).toThrow('useMyHook must be used inside <MyProvider>');
});
```

---

## API Testing

### Mock Fetch for Success

```typescript
test('fetches data successfully', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: '123' }),
    } as Response)
  );

  const result = await Api.request('/endpoint');
  expect(result).toEqual({ id: '123' });
});
```

### Mock Fetch for Error

```typescript
test('handles fetch error', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'Bad request' }),
    } as Response)
  );

  await expect(Api.request('/endpoint')).rejects.toThrow('Bad request');
});
```

### Test API Headers

```typescript
test('includes auth token in header', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: async () => '{}',
    } as Response)
  );

  await Api.request('/endpoint', { token: 'test-token' });

  expect(global.fetch).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token',
      }),
    })
  );
});
```

### Test API with Mock Service Module

```typescript
jest.mock('@/services/api');
const mockApi = Api as jest.Mocked<typeof Api>;

beforeEach(() => {
  jest.clearAllMocks();
});

test('calls API with correct parameters', async () => {
  mockApi.getClientCalendar.mockResolvedValue(mockClientCalendarResponse);
  
  await loadSchedule('test-token');
  
  expect(mockApi.getClientCalendar).toHaveBeenCalledWith('test-token', 1, 100);
});
```

---

## Context Testing

### Test Context Provider

```typescript
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';

describe('AuthContext', () => {
  test('provides auth state', () => {
    mockApi.getMyProfile.mockResolvedValue(mockProfile);
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    
    expect(result.current.profile).toEqual(mockProfile);
  });
});
```

### Test Context State Changes

```typescript
test('updates state after signIn', async () => {
  mockApi.login.mockResolvedValue(mockLoginResponse);
  mockApi.getMyProfile.mockResolvedValue(mockProfile);
  
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  });

  await act(async () => {
    await result.current.signIn('test@example.com', 'password');
  });

  expect(result.current.token).toBe(mockLoginResponse.accessToken);
  expect(result.current.profile).toEqual(mockProfile);
});
```

---

## Navigation Testing

### Mock Router

```typescript
jest.mock('expo-router');

beforeEach(() => {
  mockUseRouter.mockReturnValue({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  });
});

test('navigates to login when not authenticated', () => {
  mockUseAuth.mockReturnValue({
    token: null,
    isLoading: false,
  });

  render(<SplashScreen />);

  expect(mockReplace).toHaveBeenCalledWith('/login');
});
```

### Test Role-based Navigation

```typescript
test('redirects client to (client)/ route', () => {
  mockUseAuth.mockReturnValue({
    token: 'token',
    role: 'Client',
    isLoading: false,
  });

  render(<SplashScreen />);

  expect(mockReplace).toHaveBeenCalledWith('/(client)/');
});
```

---

## Assertions

### Common Assertions

```typescript
// Existence
expect(element).toBeTruthy();
expect(element).toBeFalsy();
expect(screen.queryByTestId('id')).toBeFalsy();

// Text content
expect(screen.getByText('Hello')).toBeTruthy();
expect(element).toHaveTextContent('Hello');

// Values
expect(result.current.value).toBe('expected');
expect(array).toHaveLength(5);
expect(object).toEqual({ key: 'value' });

// Functions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(3);
expect(mockFn).toHaveBeenLastCalledWith('arg');

// Async
await expect(promise).rejects.toThrow('error message');
await expect(promise).resolves.toEqual({ data: 'test' });

// Arrays
expect(array).toContain('item');
expect(array).toContainEqual({ id: 1 });

// Objects
expect(object).toHaveProperty('key');
expect(object).toHaveProperty('key', 'value');
```

---

## Async Patterns

### Wait for Async Operation

```typescript
await waitFor(() => {
  expect(result.current.isLoaded).toBe(true);
});

// With timeout
await waitFor(
  () => {
    expect(mockApi.call).toHaveBeenCalled();
  },
  { timeout: 3000 }
);
```

### Wait for Specific Condition

```typescript
await waitFor(() => {
  expect(screen.getByTestId('data')).toHaveTextContent('loaded');
}, { timeout: 1000 });
```

### Wait and Use Act

```typescript
const { result } = renderHook(() => useMyHook());

await act(async () => {
  await result.current.loadData();
});

expect(result.current.data).toBeDefined();
```

### Fire Events in Act

```typescript
const { result } = renderHook(() => useCounter());

act(() => {
  result.current.increment();
});

expect(result.current.count).toBe(1);
```

### Fake Timers for Intervals

```typescript
jest.useFakeTimers();

renderHook(() => useScheduleNotifications('token', 'Client'));

// Advance time by 30 seconds
jest.advanceTimersByTime(30_000);

await waitFor(() => {
  expect(mockApi.getClientCalendar).toHaveBeenCalledTimes(2);
});

jest.useRealTimers();
```

---

## Setup/Teardown Patterns

### Before/After Each Test

```typescript
describe('MyComponent', () => {
  beforeEach(() => {
    // Run before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Run after each test
    // Cleanup
  });

  test('test 1', () => {
    // ...
  });

  test('test 2', () => {
    // ...
  });
});
```

### Before/After All Tests

```typescript
beforeAll(() => {
  // Run once before all tests in this suite
});

afterAll(() => {
  // Run once after all tests in this suite
});
```

---

## Mocking Patterns

### Mock Function

```typescript
const mockFn = jest.fn();
mockFn.mockReturnValue('result');
mockFn.mockResolvedValue({ data: 'test' });
mockFn.mockRejectedValue(new Error('failed'));
mockFn.mockImplementation((arg) => arg * 2);
```

### Mock Module

```typescript
jest.mock('@/services/api');
const mockApi = Api as jest.Mocked<typeof Api>;

mockApi.getClientCalendar.mockResolvedValue(mockCalendarResponse);
```

### Mock with Rest Parameter

```typescript
jest.mock('@/services/api', () => ({
  request: jest.fn(),
  getClientCalendar: jest.fn(),
}));
```

### Reset Mocks

```typescript
jest.clearAllMocks();     // Clear call history
jest.resetAllMocks();     // Clear + reset implementation
jest.restoreAllMocks();   // Restore original implementation
```

---

## Common Test Template

```typescript
import { render, waitFor, fireEvent } from '@/__tests__/utils/test-utils';
import MyComponent from '@/components/MyComponent';
import * as MyService from '@/services/MyService';

jest.mock('@/services/MyService');

describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    test('shows spinner while loading', () => {
      render(<MyComponent />);
      expect(screen.getByTestId('spinner')).toBeTruthy();
    });
  });

  describe('Success state', () => {
    test('displays data when loaded', async () => {
      (MyService.getData as jest.Mock).mockResolvedValue({ id: '123' });
      
      render(<MyComponent />);
      
      await waitFor(() => {
        expect(screen.getByText('123')).toBeTruthy();
      });
    });
  });

  describe('Error state', () => {
    test('shows error message on failure', async () => {
      (MyService.getData as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      
      render(<MyComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeTruthy();
      });
    });
  });

  describe('Interactions', () => {
    test('calls action on button press', () => {
      const mockAction = jest.fn();
      render(<MyComponent onAction={mockAction} />);
      
      fireEvent.press(screen.getByTestId('action-btn'));
      
      expect(mockAction).toHaveBeenCalled();
    });
  });
});
```

---

## See Also

- [docs/testing.md](../docs/testing.md) - Comprehensive testing guide
- [Jest Docs](https://jestjs.io/docs/api)
- [React Testing Library](https://testing-library.com/react)
- Test files: `__tests__/` folder
