create unique index if not exists equipment_requests_one_pending_per_user_equipment_idx
  on equipment_requests(equipment_id, requester_user_id)
  where status = 'pending';
