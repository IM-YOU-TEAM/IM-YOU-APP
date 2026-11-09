-- Retire the per-account IMU topic.
--
-- Both phones used to sign into the patient account and meet on 'imu:<owner_link>',
-- which the clinician could also watch. Phones now pair by QR code on a one-time
-- pairing topic (20261109020000_imu_qr_pairing), and nobody watches a session live,
-- so these policies and functions have no callers left.

drop policy "Patients receive on their own IMU topic" on realtime.messages;
drop policy "Patients send on their own IMU topic" on realtime.messages;
drop policy "Clinicians receive on their patients' IMU topics" on realtime.messages;

drop function public.my_imu_topic();
drop function public.patient_imu_topic(uuid);
