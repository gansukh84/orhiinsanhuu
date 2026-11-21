// Аль Supabase руу холбогдохыг шийдэж, client үүсгэнэ.
//  - localhost / 127.0.0.1 дээр нээвэл → таны компьютер дээрх дотоод Supabase
//  - бусад үед (GitHub Pages)          → үүлэн Supabase төсөл
//
// Энд зөвхөн НИЙТИЙН утгууд байна: төслийн хаяг, publishable (anon) түлхүүр.
// Эдгээр нь нууц биш — хамгаалалтыг сангийн RLS дүрэм хийдэг.
// service_role / secret түлхүүрийг ЭНД ХЭЗЭЭ Ч БҮҮ БИЧ.

// Supabase-ийн JS сан — CDN-ээс, хувилбарыг нь тогтмол заасан (build хэрэгсэлгүй)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';

// Дотоод орчин: `npx supabase status`-ийн API_URL ба PUBLISHABLE_KEY.
// Энэ түлхүүр бүх хүний компьютер дээр ижил, зөвхөн туршилтад зориулсан.
const LOCAL = {
  url: 'http://127.0.0.1:54321',
  key: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
};

// Үүлэн орчин: Supabase сайт → Project Settings → API Keys
// TODO: Project URL болон publishable (anon) түлхүүрээр солих
const CLOUD = {
  url: 'https://YOUR-PROJECT-ID.supabase.co',
  key: 'YOUR-PUBLISHABLE-KEY',
};

export const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

const env = isLocal ? LOCAL : CLOUD;

// Үүлэн утгуудыг бөглөөгүй бол апп «тохируулагдаагүй» гэж мэдэгдэнэ
export const isConfigured = !env.url.includes('YOUR-') && !env.key.includes('YOUR-');

export const supabase = isConfigured ? createClient(env.url, env.key) : null;
