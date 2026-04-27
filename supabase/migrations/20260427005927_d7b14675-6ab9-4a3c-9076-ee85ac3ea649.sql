-- Tabela CMS dla nadpisań alt/figcaption komponentu VenousInsufficiencyImage
CREATE TABLE public.vein_image_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('main', 'perforator')),
  alt TEXT NOT NULL,
  caption TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT,
  UNIQUE (page_key, slot)
);

-- Walidacja długości — spójna z testami mobile-budget
CREATE OR REPLACE FUNCTION public.validate_vein_image_override()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_seg TEXT;
BEGIN
  IF length(NEW.alt) < 60 OR length(NEW.alt) > 220 THEN
    RAISE EXCEPTION 'alt musi mieć 60-220 znaków (ma %).', length(NEW.alt);
  END IF;
  IF length(NEW.caption) > 110 THEN
    RAISE EXCEPTION 'caption nie może przekraczać 110 znaków (ma %).', length(NEW.caption);
  END IF;
  -- Sprawdź najdłuższy segment "·"
  FOR v_seg IN SELECT unnest(string_to_array(NEW.caption, ' · ')) LOOP
    IF length(v_seg) > 40 THEN
      RAISE EXCEPTION 'segment caption "%" przekracza 40 znaków (ma %)', v_seg, length(v_seg);
    END IF;
  END LOOP;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_vein_image_override_trigger
  BEFORE INSERT OR UPDATE ON public.vein_image_overrides
  FOR EACH ROW EXECUTE FUNCTION public.validate_vein_image_override();

-- RLS
ALTER TABLE public.vein_image_overrides ENABLE ROW LEVEL SECURITY;

-- Public read (dla SSR/SEO każdej strony)
CREATE POLICY "Anyone can read vein image overrides"
ON public.vein_image_overrides
FOR SELECT
TO anon, authenticated
USING (true);

-- Admin pełen dostęp
CREATE POLICY "Admins can insert vein image overrides"
ON public.vein_image_overrides
FOR INSERT
TO authenticated
WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Admins can update vein image overrides"
ON public.vein_image_overrides
FOR UPDATE
TO authenticated
USING (has_role('admin'::app_role))
WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Admins can delete vein image overrides"
ON public.vein_image_overrides
FOR DELETE
TO authenticated
USING (has_role('admin'::app_role));

-- Seed 8 wierszy z obecnymi wartościami z plików stron
INSERT INTO public.vein_image_overrides (page_key, slot, alt, caption) VALUES
('evlt', 'main',
 'Schemat porównawczy zdrowej żyły i żylaka — pokazuje refluks krwi przez niedomykające się zastawki w pniu odpiszczelowym/odstrzałkowym, który EVLT zamyka termicznie od środka',
 'Zdrowa zastawka · Refluks w pniu żylnym · Cel EVLT · Termiczne zamknięcie żyły'),
('evlt', 'perforator',
 'Schemat niewydolnego perforatora — żyły łączącej układ głęboki z powierzchownym; jego refluks często współistnieje z niewydolnością pnia leczonego EVLT',
 'Niewydolny perforator · Często współistnieje z refluksem pnia · Diagnostyka USG Doppler przed EVLT'),
('mikroflebektomia', 'main',
 'Schemat porównawczy zdrowej żyły i żylakowatej bocznicy — poszerzone naczynie z niedomykającymi się zastawkami i cofającą się krwią, które mikroflebektomia usuwa mechanicznie z mikronakłuć',
 'Zdrowa bocznica · Żylakowata bocznica · Cel mikroflebektomii · Usunięcie z mikronakłuć'),
('mikroflebektomia', 'perforator',
 'Schemat niewydolnego perforatora — często zasila żylakowate bocznice usuwane mikroflebektomią; jego ocena USG Doppler decyduje o zakresie zabiegu',
 'Niewydolny perforator · Zasilacz żylakowatej bocznicy · Ocena USG Doppler przed zabiegiem'),
('flebologia', 'main',
 'Schemat mechaniki żylaków — zdrowe zastawki kontra niedomykające się zastawki w przewlekłej niewydolności żylnej; refluks, poszerzenie naczynia i stan zapalny prowadzące do widocznych żylaków',
 'Zastawka · Refluks · Poszerzenie naczynia · Stan zapalny · Widoczny żylak'),
('flebologia', 'perforator',
 'Schemat niewydolnego perforatora — łącznika między układem głębokim a powierzchownym, którego refluks dociąża powierzchowne żyły i napędza powstawanie żylaków',
 'Niewydolny perforator · Dociąża układ powierzchowny · Punkt diagnostyki USG Doppler'),
('profilaktyka', 'main',
 'Schemat porównawczy zdrowej zastawki żylnej i niedomykającej się zastawki — proces, któremu zapobiega regularny ruch, kompresjoterapia i pielęgnacja nóg',
 'Zdrowa zastawka · Pierwsze rozszczelnienie · Refluks i stan zapalny · Etap, któremu zapobiegasz'),
('profilaktyka', 'perforator',
 'Schemat niewydolnego perforatora — pokazuje, dlaczego długie stanie i siedzenie obciąża układ żylny; czynnik ryzyka, który łagodzi aktywność i kompresjoterapia',
 'Niewydolny perforator · Obciążenie z długiego stania · Łagodzony ruchem i kompresją');