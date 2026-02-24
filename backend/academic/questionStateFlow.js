export const QUESTION_STATE_FLOW = {
  initial: 'fresh',
  states: ['fresh', 'in-progress', 'locked', 'completed-assisted', 'completed-clean'],
  transitions: [
    { from: 'fresh', action: 'submit-correct', to: 'completed-clean' },
    { from: 'fresh', action: 'submit-incorrect', to: 'in-progress' },
    { from: 'in-progress', action: 'submit-correct', to: 'completed-clean' },
    { from: 'in-progress', action: 'submit-incorrect-max-attempts', to: 'completed-assisted' },
    { from: 'fresh', action: 'help-hint', to: 'in-progress' },
    { from: 'in-progress', action: 'help-hint', to: 'in-progress' },
    { from: 'fresh', action: 'help-full', to: 'completed-assisted' },
    { from: 'in-progress', action: 'help-full', to: 'completed-assisted' },
  ],
  rules: {
    maxAttempts: 3,
    lockOnFullHelp: true,
    xpRequires: ['correct', 'attempts<=2', 'assisted=false'],
  },
}

export const deriveFlowState = (state) => {
  if (!state) return 'fresh'
  if (state.locked && state.assisted) return 'completed-assisted'
  if (state.locked && !state.assisted) return 'completed-clean'
  if (state.attempts > 0 || state.helpClicks > 0) return 'in-progress'
  return 'fresh'
}
