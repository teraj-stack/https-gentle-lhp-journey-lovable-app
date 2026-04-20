CREATE POLICY "Service role can delete send log"
ON public.email_send_log
FOR DELETE
TO public
USING (auth.role() = 'service_role');

DELETE FROM public.email_send_log
WHERE status = 'dlq'
  AND error_message = 'Emails disabled for this project'
  AND created_at >= CURRENT_DATE;

DO $$
DECLARE
  msg RECORD;
BEGIN
  BEGIN
    FOR msg IN SELECT msg_id FROM pgmq.read('auth_emails_dlq', 0, 1000) LOOP
      PERFORM pgmq.delete('auth_emails_dlq', msg.msg_id);
    END LOOP;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    FOR msg IN SELECT msg_id FROM pgmq.read('transactional_emails_dlq', 0, 1000) LOOP
      PERFORM pgmq.delete('transactional_emails_dlq', msg.msg_id);
    END LOOP;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
END $$;