UPDATE public.blog_posts
SET content = regexp_replace(
  content,
  E'## 2\\. Czynniki ryzyka — co naprawdę zwiększa szansę na hemoroidy.*?(?=\\n## 3\\. Profilaktyka)',
  E'<!-- RISK_FACTORS_ACCORDION -->\n\n',
  'gs'
),
updated_at = now()
WHERE slug = 'seks-analny-a-hemoroidy-fakty-i-mity'
  AND content LIKE '%## 2. Czynniki ryzyka%'
  AND content NOT LIKE '%RISK_FACTORS_ACCORDION%';