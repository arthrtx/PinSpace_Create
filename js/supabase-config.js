/**
 * supabase-config.js — Liga os quadros públicos ao Supabase (base na nuvem).
 *
 * COMO ATIVAR (2 minutos, grátis):
 *   1. Vai a https://supabase.com → New project (região próxima de ti).
 *   2. No teu projeto: Settings → API → copia o "Project URL" e a "anon public key".
 *   3. Cola-os abaixo. GUARDA as aspas.
 *   4. No SQL Editor corre este SQL (permite qualquer pessoa ver+publicar):
 *
 *   create table if not exists public.quadros (
 *     id         text primary key,
 *     titulo     text default 'Sem título',
 *     autor      text default 'Anónimo',
 *     thumb      text default '',
 *     atualizado timestamptz default now(),
 *     publicado  timestamptz default now(),
 *     projeto    jsonb default '{}'::jsonb
 *   );
 *   alter table public.quadros enable row level security;
 *   create policy "ler_quadros" on public.quadros for select using (true);
 *   create policy "publicar_quadros" on public.quadros for insert with check (true);
 *   create policy "apagar_quadros" on public.quadros for delete using (true);
 *
 *   (Ativa "Enable row-level security" n a tabela e publica as policies acima.)
 *
 * NOTA: a anon key é pública de propósito — quem abre o site pode ler e publicar.
 * Se um dia não quiseres que apaguem quadros, muda a policy "apagar_quadros"
 * para `using (autor = auth.uid())` ou apaga essa policy por completo.
 */

window.SUPABASE_CONFIG = {
    url: 'https://bvhinutatusriwkywywh.supabase.co',
    anonKey: 'sb_publishable_om5YO7UDKoYezI5YQt8tAQ_fP27cR-E'
};
