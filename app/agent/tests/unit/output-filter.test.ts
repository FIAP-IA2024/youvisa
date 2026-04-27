import { describe, expect, it } from 'vitest';
import { outputFilter } from '@/agents/output-filter';

describe('outputFilter', () => {
  it('passes a normal status response', () => {
    const r = outputFilter('Olá! Seu processo de visto de Turismo para EUA está Em Análise.');
    expect(r.allowed).toBe(true);
    expect(r.reason).toBeUndefined();
  });

  it('passes a generic greeting', () => {
    expect(outputFilter('Olá! Como posso ajudar?').allowed).toBe(true);
  });

  it('blocks specific time prazo: "em 5 dias"', () => {
    const r = outputFilter('Seu visto será aprovado em 5 dias.');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('prazo');
  });

  it('blocks "prazo de N"', () => {
    const r = outputFilter('Temos um prazo de 30 dias para responder.');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('prazo');
  });

  it('blocks "previsão de N dias"', () => {
    const r = outputFilter('A previsão de 10 dias úteis para análise.');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('prazo');
  });

  it('blocks internal status code "em_analise"', () => {
    const r = outputFilter('Seu processo está em em_analise.');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('internal_code');
  });

  it('blocks internal status code "pendente_documentos"', () => {
    const r = outputFilter('Status: pendente_documentos.');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('internal_code');
  });

  it('blocks placeholder a_definir', () => {
    const r = outputFilter('Tipo de visto: a_definir');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('placeholder_a_definir');
  });

  it('blocks placeholder "A definir"', () => {
    const r = outputFilter('País destino: A definir');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('placeholder_a_definir');
  });

  it('toTrace() shape', () => {
    const ok = outputFilter('mensagem ok');
    expect(ok.toTrace()).toEqual({ allowed: true });

    const bad = outputFilter('em_analise');
    expect(bad.toTrace()).toEqual({ allowed: false, reason: 'internal_code' });
  });
});
