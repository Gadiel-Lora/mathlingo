import { render, screen } from '@testing-library/react';
import RegisterOnboarding from '../pages/RegisterOnboarding';

test('muestra el título de onboarding', () => {
  render(<RegisterOnboarding />);
  expect(screen.getByText(/Completa tu mapa academico/i)).toBeInTheDocument();
});
