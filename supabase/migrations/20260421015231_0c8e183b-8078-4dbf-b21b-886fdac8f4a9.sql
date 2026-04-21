DELETE FROM public.email_send_log
 WHERE recipient_email IN (
   'jan.bujok+test2h-b@mcml.pro',
   'jan.bujok+test2h-out@mcml.pro',
   'jan.bujok+test2h-optout@mcml.pro'
 );

DELETE FROM public.bookings
 WHERE patient_email IN (
   'jan.bujok+test2h-b@mcml.pro',
   'jan.bujok+test2h-out@mcml.pro',
   'jan.bujok+test2h-optout@mcml.pro'
 );