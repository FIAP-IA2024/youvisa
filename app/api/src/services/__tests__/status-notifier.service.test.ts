import { describe, expect, it, vi } from 'vitest';
import { StatusNotifierService } from '../status-notifier.service';

/**
 * Unit tests for StatusNotifierService template rendering.
 * These tests focus on the deterministic rendering — the only piece that
 * matters for governance: the wrong template = wrong message to a real user.
 */

function makeService(): StatusNotifierService {
  // Inject minimal stubs — only renderTemplate is exercised in these tests
  return new StatusNotifierService(
    { sendMessage: vi.fn() } as any,
    {} as any, // ProcessRepository
    {} as any, // ConversationRepository
    {} as any, // UserRepository
    { warn: vi.fn(), info: vi.fn(), error: vi.fn() } as any,
  );
}

describe('StatusNotifierService.renderTemplate', () => {
  const svc = makeService();

  it('recebido -> em_analise: greets and mentions analysis', () => {
    const msg = svc.renderTemplate({
      from: 'recebido',
      to: 'em_analise',
      userName: 'Gabriel',
      visaType: 'turismo',
      country: 'EUA',
    });
    expect(msg).toContain('Gabriel');
    expect(msg.toLowerCase()).toMatch(/analisad/);
    expect(msg.toLowerCase()).toContain('turismo');
    expect(msg).toContain('EUA');
  });

  it('em_analise -> pendente_documentos: requests docs and includes reason', () => {
    const msg = svc.renderTemplate({
      from: 'em_analise',
      to: 'pendente_documentos',
      userName: 'Maria',
      visaType: 'trabalho',
      country: 'Canadá',
      reason: 'Falta comprovante de renda',
    });
    expect(msg).toContain('Maria');
    expect(msg.toLowerCase()).toContain('documentos');
    expect(msg).toContain('Falta comprovante de renda');
  });

  it('em_analise -> aprovado: celebrates approval', () => {
    const msg = svc.renderTemplate({
      from: 'em_analise',
      to: 'aprovado',
      userName: 'João',
      visaType: 'estudante',
      country: 'França',
    });
    expect(msg).toContain('João');
    expect(msg.toLowerCase()).toMatch(/aprovado|parabéns|parabens/);
  });

  it('em_analise -> rejeitado: explains rejection respectfully', () => {
    const msg = svc.renderTemplate({
      from: 'em_analise',
      to: 'rejeitado',
      userName: 'Ana',
      visaType: 'turismo',
      country: 'Reino Unido',
    });
    expect(msg).toContain('Ana');
    expect(msg.toLowerCase()).toMatch(/n[ãa]o foi aprovado/);
  });

  it('aprovado -> finalizado: thanks and closes', () => {
    const msg = svc.renderTemplate({
      from: 'aprovado',
      to: 'finalizado',
      userName: 'Pedro',
      visaType: 'residencia',
      country: 'Portugal',
    });
    expect(msg).toContain('Pedro');
    expect(msg.toLowerCase()).toContain('finalizado');
    expect(msg.toLowerCase()).toContain('youvisa');
  });

  it('any -> cancelado: includes reason', () => {
    const msg = svc.renderTemplate({
      from: 'em_analise',
      to: 'cancelado',
      userName: 'Lucas',
      visaType: 'turismo',
      country: 'EUA',
      reason: 'Solicitação do cliente',
    });
    expect(msg).toContain('Lucas');
    expect(msg.toLowerCase()).toContain('cancelado');
    expect(msg).toContain('Solicitação do cliente');
  });

  it('omits visa type when a_definir', () => {
    const msg = svc.renderTemplate({
      from: 'recebido',
      to: 'em_analise',
      userName: 'Bruno',
      visaType: 'a_definir',
      country: 'EUA',
    });
    expect(msg).not.toContain('a_definir');
    expect(msg).not.toContain('A definir');
    expect(msg).toContain('EUA');
  });

  it('omits country when "a definir"', () => {
    const msg = svc.renderTemplate({
      from: 'recebido',
      to: 'em_analise',
      userName: 'Carlos',
      visaType: 'turismo',
      country: 'a definir',
    });
    expect(msg).not.toMatch(/a definir/i);
    expect(msg.toLowerCase()).toContain('turismo');
  });

  it('omits both when both are placeholders', () => {
    const msg = svc.renderTemplate({
      from: 'recebido',
      to: 'em_analise',
      userName: 'Sara',
      visaType: 'a_definir',
      country: 'a_definir',
    });
    expect(msg).not.toMatch(/a_definir|a definir/i);
    expect(msg).toContain('Sara');
  });

  it('uses friendly visa labels (capitalized as a noun in lowercase context)', () => {
    const msg = svc.renderTemplate({
      from: 'em_analise',
      to: 'aprovado',
      userName: 'Diego',
      visaType: 'estudante',
      country: 'França',
    });
    // Should NOT include the internal code
    expect(msg).not.toContain('em_analise');
    expect(msg).not.toContain('estudante:');
    // Should include the friendly version
    expect(msg.toLowerCase()).toContain('estudante');
  });

  it('handles unmapped transition gracefully (generic fallback)', () => {
    const msg = svc.renderTemplate({
      from: 'em_analise',
      to: 'em_analise', // self-loop, shouldn't happen but template must not crash
      userName: 'Fernanda',
    });
    expect(msg).toContain('Fernanda');
    expect(msg.toLowerCase()).toContain('atualizado');
  });
});
