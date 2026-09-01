import { fireEvent, render, screen } from '@testing-library/react';
import EasterEgg from './EasterEgg.jsx';

test('revela el mensaje al escribir la clave oculta', () => {
  render(<EasterEgg />);
  for (const key of 'axel') fireEvent.keyDown(document, { key });
  expect(screen.getByText('Axel was here')).toBeInTheDocument();
});

test('no captura la clave mientras se escribe en un formulario', () => {
  render(<><input aria-label="campo" /><EasterEgg /></>);
  const input = screen.getByLabelText('campo');
  for (const key of 'axel') fireEvent.keyDown(input, { key });
  expect(screen.queryByText('Axel was here')).not.toBeInTheDocument();
});
