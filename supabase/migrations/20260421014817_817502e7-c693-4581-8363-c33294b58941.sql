DELETE FROM public.email_send_log
 WHERE recipient_email IN (
   'jan.bujok+test2h-a@mcml.pro',
   'jan.bujok+test2h-b@mcml.pro',
   'jan.bujok+test2h-out@mcml.pro'
 );

UPDATE public.bookings SET appointment_time = '05:30'
 WHERE patient_email = 'jan.bujok+test2h-a@mcml.pro' AND appointment_date = '2026-04-21';

UPDATE public.bookings SET appointment_time = '06:00'
 WHERE patient_email = 'jan.bujok+test2h-b@mcml.pro' AND appointment_date = '2026-04-21';

UPDATE public.bookings SET appointment_time = '04:17'
 WHERE patient_email = 'jan.bujok+test2h-out@mcml.pro' AND appointment_date = '2026-04-21';