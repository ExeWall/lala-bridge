/**
 * Cria um doador e um Lalíder direto no armazenamento (sem hash, que é lento).
 */
export function seedUsers(Auth) {
  const donor = {
    id: 'donor-t1',
    type: 'donor',
    name: 'Empresa Teste',
    email: 'empresa@example.com',
    country: 'Brazil',
    organization: 'Empresa Teste',
  };
  const donor2 = { ...donor, id: 'donor-t2', email: 'outra@example.com', name: 'Outra Empresa' };
  const lalider = {
    id: 'lalider-t1',
    type: 'lalider',
    name: 'Ana Beatriz Silva',
    email: 'ana@example.com',
    verificationCode: 'LALA-VLB32-003',
    camp: 'VLB32',
    country: 'Brazil',
  };
  const lalider2 = {
    ...lalider,
    id: 'lalider-t2',
    name: 'Carlos Mendoza',
    email: 'carlos@example.com',
    verificationCode: 'LALA-VLB32-002',
  };
  Auth.saveUsers([donor, donor2, lalider, lalider2]);
  return { donor, donor2, lalider, lalider2 };
}

export function loginAs(Auth, user) {
  Auth._startSession(user);
}
