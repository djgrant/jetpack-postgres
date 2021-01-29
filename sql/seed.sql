truncate jetpack.actions cascade; 
truncate jetpack.machines cascade; 
truncate jetpack.tasks restart identity cascade; 

insert into jetpack.machines (id, name, def) 
values 
  ('5d20f471-2140-4bea-b83f-3d11d030e94a', 'ETL', '{"START":{"when":{"status":"pending", "params": 2},"then":{"change_status":"running"}},"ERROR":[{"when":{"status":"running"},"then":{"change_status":"error"}},{"when":{"attempts":5},"then":{"lock":true},"else":{"retry":"self"}},{"when":{"params":{"a":1}},"then":{"enqueue":"59e276d6-c371-4f4c-aeb2-ecb761a580f6"}}],"SUCCESS":{"when":{"status":"running"},"then":{"change_status":"success"}}}'), 
  ('59e276d6-c371-4f4c-aeb2-ecb761a580f6', 'ETL 2', '{"START":{"when":{"status":["pending", "error", "timeout"]},"then":{"change_status":"running"}},"ERROR":[{"when":{"status":"running"},"then":{"change_status":"error"}},{"when":{"attempts":3},"then":{"lock":true},"else":{"retry":"self"}}],"SUCCESS":{"when":{"status":"running"},"then":{"change_status":"success"}}}');

select jetpack.create_task('ETL instance 1', '5d20f471-2140-4bea-b83f-3d11d030e94a', null, '2');
select jetpack.create_task('ETL instance 2', '5d20f471-2140-4bea-b83f-3d11d030e94a', 1, '2');
select jetpack.create_task('ETL 2 instance 1', '5d20f471-2140-4bea-b83f-3d11d030e94a', null, '2');

select jetpack.dispatch_action(1, 'START');
select jetpack.dispatch_action(1, 'ERROR');
select jetpack.dispatch_action(2, 'START');
select jetpack.dispatch_action(3, 'START');
select jetpack.dispatch_action(2, 'SUCCESS');
