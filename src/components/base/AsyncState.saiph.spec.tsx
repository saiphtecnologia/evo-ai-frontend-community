import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState, LoadingState } from './AsyncState';

describe('SAIPH async feedback states', () => {
  it('announces loading without presenting decorative elements to assistive technology', () => {
    render(<LoadingState label="Carregando contatos" description="Buscando dados recentes." />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Carregando contatos');
    expect(status).toHaveTextContent('Buscando dados recentes.');
  });

  it('keeps an actionable error in context and supports retry', () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Não foi possível carregar"
        description="Verifique a conexão e tente novamente."
        retryLabel="Tentar novamente"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
