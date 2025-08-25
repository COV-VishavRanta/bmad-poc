import React from 'react';

interface SystemComponentsProps {
  // Future props can be added here for dynamic status
}

/**
 * Component displaying the status of system components
 */
export const SystemComponents: React.FC<SystemComponentsProps> = () => {
  const components = [
    { name: 'Next.js Frontend (TypeScript)', status: '✅', isReady: true },
    { name: 'FastAPI Backend', status: '🔄', isReady: false },
    { name: 'MySQL Database', status: '🔄', isReady: false },
    { name: 'Docker Services', status: '🔄', isReady: false },
  ];

  return (
    <div>
      <h2>System Components</h2>
      <ul>
        {components.map((component) => (
          <li key={component.name}>
            {component.status} {component.name}
          </li>
        ))}
      </ul>
    </div>
  );
};