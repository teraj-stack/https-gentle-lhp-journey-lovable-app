-- Historia wersji nadpisań alt/caption: każdy zapis (INSERT/UPDATE) zostawia
-- snapshot poprzedniej wartości, dzięki czemu admin może jednym kliknięciem
-- cofnąć się do wcześniejszej treści dla danego page_key/slot.

CREATE TABLE public.vein_image_override_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  override_id uuid,
  page_key text NOT NULL,
  slot text NOT NULL,
  alt text NOT NULL,
  caption text NOT NULL,
  updated_by text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL CHECK (action IN ('insert','update','delete'))
);

CREATE INDEX vein_image_override_history_page_slot_idx
  ON public.vein_image_override_history (page_key, slot, recorded_at DESC);

ALTER TABLE public.vein_image_override_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view vein image override history"
  ON public.vein_image_override_history
  FOR SELECT
  TO authenticated
  USING (has_role('admin'::app_role));

CREATE POLICY "Service role full access to vein image override history"
  ON public.vein_image_override_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Pozwalamy też klientowi admin-auth wstawiać wpisy historii (trigger
-- wykonuje się w kontekście wywołującego użytkownika, więc potrzebujemy
-- INSERT policy dla adminów — bez tego trigger by nie zapisał wiersza).
CREATE POLICY "Admins can insert vein image override history"
  ON public.vein_image_override_history
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role('admin'::app_role));

-- Trigger: zapisz snapshot przy INSERT (nowy wpis) oraz przy UPDATE
-- (snapshot STAREJ wartości — to do niej będziemy mogli wrócić) oraz DELETE.
CREATE OR REPLACE FUNCTION public.log_vein_image_override_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vein_image_override_history
      (override_id, page_key, slot, alt, caption, updated_by, recorded_at, action)
    VALUES
      (NEW.id, NEW.page_key, NEW.slot, NEW.alt, NEW.caption, NEW.updated_by, NEW.updated_at, 'insert');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Zapisujemy STARĄ wersję — ona stanie się celem rollbacku.
    IF OLD.alt IS DISTINCT FROM NEW.alt OR OLD.caption IS DISTINCT FROM NEW.caption THEN
      INSERT INTO public.vein_image_override_history
        (override_id, page_key, slot, alt, caption, updated_by, recorded_at, action)
      VALUES
        (OLD.id, OLD.page_key, OLD.slot, OLD.alt, OLD.caption, OLD.updated_by, OLD.updated_at, 'update');
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.vein_image_override_history
      (override_id, page_key, slot, alt, caption, updated_by, recorded_at, action)
    VALUES
      (OLD.id, OLD.page_key, OLD.slot, OLD.alt, OLD.caption, OLD.updated_by, OLD.updated_at, 'delete');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER vein_image_override_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.vein_image_overrides
  FOR EACH ROW EXECUTE FUNCTION public.log_vein_image_override_history();

-- Backfill: zapisz aktualny stan jako "insert" dla istniejących wpisów,
-- żeby historia od razu zawierała baseline (admin nie widzi pustej listy).
INSERT INTO public.vein_image_override_history
  (override_id, page_key, slot, alt, caption, updated_by, recorded_at, action)
SELECT id, page_key, slot, alt, caption, updated_by, updated_at, 'insert'
FROM public.vein_image_overrides;