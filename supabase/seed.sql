insert into public.administrative_areas
  (ubigeo, name, level, parent_ubigeo, source, license, source_version)
values
  ('13', 'La Libertad', 'department', null, 'INEI', 'Según términos de INEI', 'demo-2026'),
  ('1301', 'Trujillo', 'province', '13', 'INEI', 'Según términos de INEI', 'demo-2026'),
  ('130111', 'Víctor Larco Herrera', 'district', '1301', 'INEI', 'Según términos de INEI', 'demo-2026')
on conflict (ubigeo) do nothing;

insert into public.roads (id, external_id, name, road_class, responsible_authority, source, license, source_version)
values
  ('10000000-0000-4000-8000-000000000001', 'demo-av-larco', 'Av. Larco', 'via_urbana', 'Municipalidad Distrital de Víctor Larco Herrera', 'MapIA demo', 'CC BY 4.0', 'demo-2026'),
  ('10000000-0000-4000-8000-000000000002', 'demo-av-huaman', 'Av. Huamán', 'via_urbana', 'Municipalidad Provincial de Trujillo', 'MapIA demo', 'CC BY 4.0', 'demo-2026')
on conflict (source, external_id, source_version) do nothing;

-- La aplicación incluye 50 tramos deterministas en lib/demo-data.ts para la calibración del piloto.
-- En una base local se cargan con el importador, conservando exactamente la misma procedencia.
