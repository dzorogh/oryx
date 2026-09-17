alter table public.logistics_manufacturer
  add column if not exists code text;

update public.logistics_manufacturer
set code = case id
  when 'm-1' then 'SH-1'
  when 'm-2' then 'SH-2'
  when 'm-3' then 'SH-3'
  when 'm-4' then 'SH-4'
  when 'm-5' then 'SH-7'
  when 'm-6' then 'SH-34'
  when 'm-7' then 'SH-8'
  when 'm-8' then 'SH-27'
  when 'm-9' then 'SH-10'
  when 'm-10' then 'SH-9'
  when 'm-11' then 'SH-69'
  when 'm-12' then 'SH-28'
  when 'm-13' then 'SH-29'
  when 'm-14' then 'SH-11'
  when 'm-15' then 'SH-12'
  when 'm-16' then 'SH-18'
  when 'm-17' then 'SH-14'
  when 'm-18' then 'SH-19'
  when 'm-19' then 'SH-61'
  when 'm-20' then 'SH-60'
  when 'm-21' then 'SH-62'
  when 'm-22' then 'SH-68'
  when 'm-23' then 'SH-31'
  when 'm-24' then 'SH-30'
  when 'm-25' then 'SH-59'
  when 'm-26' then 'SH-32'
  when 'm-27' then 'SH-63'
  when 'm-28' then 'SH-64'
  when 'm-29' then 'SH-26'
  when 'm-30' then 'SH-25'
  when 'm-31' then 'SH-16'
  when 'm-32' then 'SH-65'
  when 'm-33' then 'SH-20'
  when 'm-34' then 'SH-21'
  when 'm-35' then 'SH-36'
  when 'm-36' then 'SH-33'
  when 'm-37' then 'SH-67'
  when 'm-38' then 'SH-56'
  when 'm-39' then 'SH-58'
  when 'm-40' then 'SH-72'
  when 'm-41' then 'SH-74'
  when 'm-42' then 'SH-73'
  else id
end
where code is null or btrim(code) = '';

alter table public.logistics_manufacturer
  alter column code set not null;

alter table public.logistics_manufacturer
  drop constraint if exists logistics_manufacturer_code_key;

alter table public.logistics_manufacturer
  add constraint logistics_manufacturer_code_key unique (code);
