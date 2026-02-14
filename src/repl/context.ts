// REPL session context

import type { Park, PlanWithPark } from '../types/index.js';

export interface SessionContext {
  currentPark: Park | null;
  currentPlan: PlanWithPark | null;
  commandHistory: string[];
  startTime: Date;
}

export function createContext(): SessionContext {
  return {
    currentPark: null,
    currentPlan: null,
    commandHistory: [],
    startTime: new Date(),
  };
}

export function setCurrentPark(context: SessionContext, park: Park | null): void {
  context.currentPark = park;
}

export function setCurrentPlan(context: SessionContext, plan: PlanWithPark | null): void {
  context.currentPlan = plan;
}

export function addToHistory(context: SessionContext, command: string): void {
  context.commandHistory.push(command);
  // Keep only last 100 commands
  if (context.commandHistory.length > 100) {
    context.commandHistory.shift();
  }
}

export function formatContextDisplay(context: SessionContext): string {
  const lines: string[] = ['Session Context:'];

  if (context.currentPark) {
    lines.push(`  Current Park: ${context.currentPark.reference} - ${context.currentPark.name}`);
  } else {
    lines.push('  Current Park: (none selected)');
  }

  if (context.currentPlan) {
    lines.push(`  Current Plan: #${context.currentPlan.id} - ${context.currentPlan.plannedDate}`);
  } else {
    lines.push('  Current Plan: (none)');
  }

  lines.push(`  Session started: ${context.startTime.toLocaleString()}`);
  lines.push(`  Commands this session: ${context.commandHistory.length}`);

  return lines.join('\n');
}
