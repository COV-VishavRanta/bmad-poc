import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveAttribute(attr: string, value?: string): R
      toHaveClass(className: string): R
      toHaveValue(value: string | number): R
      toBeVisible(): R
      toBeDisabled(): R
      toBeEnabled(): R
      toHaveFocus(): R
    }
  }
}