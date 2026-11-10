// vasita-koord.sql'in son (bozulmuş Fethiye) satırını düzgün UTF-8 ile değiştirir
const fs = require('fs');
let satirlar = fs.readFileSync('supabase/scratch/vasita-koord.sql', 'utf8').split('\n').map((x) => x.trim()).filter(Boolean);
satirlar = satirlar.slice(0, 11);
satirlar.push("update public.ilanlar set alanlar = alanlar || '{\"enlem\":36.622115,\"boylam\":29.115338}'::jsonb where durum='yayinda' and ana='vasita' and il='Muğla' and ilce='Fethiye' and not (alanlar ? 'enlem');");
fs.writeFileSync('supabase/scratch/vasita-koord.sql', satirlar.join('\n') + '\n', 'utf8');
const t = fs.readFileSync('supabase/scratch/vasita-koord.sql', 'utf8');
console.log('satır:', t.split('\n').filter(Boolean).length, '· Muğla doğru:', t.includes("il='Muğla'"), '· bozuk iz:', /Ä|Å|Â/.test(t));
