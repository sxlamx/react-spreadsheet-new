import React from 'react';

// Mock DnD Provider
export const DndProvider: React.FC<{ children: React.ReactNode; backend: any }> = ({ children }) => {
  return React.createElement('div', { 'data-testid': 'dnd-provider' }, children);
};

// Mock useDrag hook
export const useDrag = () => [
  {},
  {
    isDragging: false,
  },
  React.createRef(),
];

// Mock useDrop hook
export const useDrop = () => [
  {
    isOver: false,
    canDrop: false,
  },
  React.createRef(),
];

// Mock DragSource
export const DragSource = () => (component: any) => component;

// Mock DropTarget
export const DropTarget = () => (component: any) => component;