-- =============================================================================
-- LALA Bridge — armazenamento de fotos (Supabase Storage)
--
-- donation-photos: público para leitura (as doações são públicas). Cada doador
--   só envia para a própria pasta: <uid>/<arquivo>.
-- impact-photos: privado. Pasta = id da oferta; só as partes da oferta veem.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('donation-photos', 'donation-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('impact-photos', 'impact-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "fotos de doação: doador envia na própria pasta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'donation-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.my_role() = 'donor'
  );

create policy "fotos de doação: doador apaga as próprias"
  on storage.objects for delete to authenticated
  using (bucket_id = 'donation-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos de impacto: Lalíder envia na pasta da oferta entregue"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'impact-photos'
    and exists (
      select 1 from public.offers o
      where o.id::text = (storage.foldername(name))[1]
        and o.lalider_id = auth.uid() and o.status = 'delivered'
    )
  );

create policy "fotos de impacto: só as partes da oferta veem"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'impact-photos'
    and exists (
      select 1 from public.offers o
      where o.id::text = (storage.foldername(name))[1]
        and (o.donor_id = auth.uid() or o.lalider_id = auth.uid() or public.is_admin())
    )
  );
