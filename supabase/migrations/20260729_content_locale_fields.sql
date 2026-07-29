-- Catalog language for dramas + locale-scoped banners
ALTER TABLE public.dramas
  ADD COLUMN IF NOT EXISTS primary_locale text NOT NULL DEFAULT 'en'
  CONSTRAINT dramas_primary_locale_check CHECK (primary_locale IN ('fr','pt','ja','es','en'));

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en'
  CONSTRAINT banners_locale_check CHECK (locale IN ('fr','pt','ja','es','en'));

CREATE INDEX IF NOT EXISTS dramas_primary_locale_idx ON public.dramas (primary_locale);
CREATE INDEX IF NOT EXISTS banners_locale_idx ON public.banners (locale);
