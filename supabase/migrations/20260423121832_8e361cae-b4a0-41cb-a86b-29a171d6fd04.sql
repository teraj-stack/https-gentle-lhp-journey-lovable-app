
CREATE TABLE public.security_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('RLS', 'Realtime', 'Auth', 'Tokens')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pass' CHECK (status IN ('pass', 'warn', 'fail')),
  detail TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view checklist items"
ON public.security_checklist_items FOR SELECT TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can insert checklist items"
ON public.security_checklist_items FOR INSERT TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update checklist items"
ON public.security_checklist_items FOR UPDATE TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can delete checklist items"
ON public.security_checklist_items FOR DELETE TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE TRIGGER touch_security_checklist_updated_at
BEFORE UPDATE ON public.security_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.update_notification_recipients_updated_at();

CREATE INDEX idx_security_checklist_sort ON public.security_checklist_items (sort_order, slug);
