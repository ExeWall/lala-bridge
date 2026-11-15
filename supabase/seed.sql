-- Dados de demonstração: códigos de verificação FICTÍCIOS (os mesmos do modo
-- local). Em produção, os códigos reais da LALA são cadastrados pelo painel
-- admin (admin.html) e este arquivo não deve ser aplicado.
insert into public.verification_codes (code, registered_name, camp, country) values
  ('LALA-VLB32-001', 'Larissa Oliveira', 'VLB32', 'BR'),
  ('LALA-VLB32-002', 'Carlos Mendoza', 'VLB32', 'CO'),
  ('LALA-VLB32-003', 'Ana Beatriz Silva', 'VLB32', 'BR'),
  ('LALA-VLB32-004', 'Gabriel Ferreira', 'VLB32', 'BR'),
  ('LALA-BLB10-001', 'João Pedro Santos', 'BLB10', 'BR'),
  ('LALA-BLB10-002', 'Lucas Fernández', 'BLB10', 'CL'),
  ('LALA-BLB10-003', 'Yara Batista', 'BLB10', 'BR'),
  ('LALA-BLB10-004', 'Beatriz Almeida', 'BLB10', 'BR'),
  ('LALA-VLB31-001', 'Camila Vargas', 'VLB31', 'VE'),
  ('LALA-VLB31-002', 'José da Conceição', 'VLB31', 'BR'),
  ('LALA-BLB09-001', 'Lucía Castillo', 'BLB09', 'GT'),
  ('LALA-BLB09-002', 'Andrés Morales', 'BLB09', 'HN')
on conflict (code) do nothing;
