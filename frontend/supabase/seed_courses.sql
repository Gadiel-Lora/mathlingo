begin;

insert into courses (title, description)
select 'Álgebra Lineal', 'Domina conceptos fundamentales de álgebra'
where not exists (
  select 1
  from courses
  where title = 'Álgebra Lineal'
);

with course_row as (
  select id
  from courses
  where title = 'Álgebra Lineal'
  limit 1
),
lesson_seed(title, order_index) as (
  values
    ('Ecuaciones 1 paso', 1),
    ('Ecuaciones 2 pasos', 2),
    ('Ecuaciones con variables en ambos lados', 3),
    ('Aplicaciones de ecuaciones', 4),
    ('Repaso de ecuaciones', 5)
)
insert into lessons (course_id, title, order_index)
select c.id, l.title, l.order_index
from course_row c
cross join lesson_seed l
where not exists (
  select 1
  from lessons existing
  where existing.course_id = c.id
    and existing.title = l.title
);

with course_row as (
  select id
  from courses
  where title = 'Álgebra Lineal'
  limit 1
),
lesson_rows as (
  select id, title
  from lessons
  where course_id = (select id from course_row)
),
question_seed(lesson_title, question, options, correct_index, order_index) as (
  values
    ('Ecuaciones 1 paso', 'Resuelve: x + 3 = 8', '["4","5","6","7"]'::jsonb, 1, 1),
    ('Ecuaciones 1 paso', 'Resuelve: x - 4 = 10', '["6","12","14","16"]'::jsonb, 2, 2),
    ('Ecuaciones 1 paso', 'Resuelve: x / 2 = 9', '["11","16","18","20"]'::jsonb, 2, 3),
    ('Ecuaciones 1 paso', 'Resuelve: 5x = 20', '["2","3","4","5"]'::jsonb, 2, 4),
    ('Ecuaciones 2 pasos', 'Resuelve: 2x + 3 = 11', '["3","4","5","6"]'::jsonb, 1, 1),
    ('Ecuaciones 2 pasos', 'Resuelve: 3x - 5 = 10', '["3","4","5","6"]'::jsonb, 2, 2),
    ('Ecuaciones 2 pasos', 'Resuelve: 4x + 8 = 24', '["2","3","4","5"]'::jsonb, 2, 3),
    ('Ecuaciones 2 pasos', 'Resuelve: 6x - 9 = 15', '["3","4","5","6"]'::jsonb, 1, 4),
    ('Ecuaciones con variables en ambos lados', 'Resuelve: 3x + 2 = x + 10', '["2","3","4","5"]'::jsonb, 2, 1),
    ('Ecuaciones con variables en ambos lados', 'Resuelve: 5x - 1 = 2x + 14', '["4","5","6","7"]'::jsonb, 1, 2),
    ('Ecuaciones con variables en ambos lados', 'Resuelve: 7x + 9 = 3x + 25', '["3","4","5","6"]'::jsonb, 1, 3),
    ('Ecuaciones con variables en ambos lados', 'Resuelve: 9x - 12 = 4x + 8', '["2","3","4","5"]'::jsonb, 2, 4),
    ('Aplicaciones de ecuaciones', 'Si x + 7 = 19, ¿cuanto vale x?', '["10","11","12","13"]'::jsonb, 2, 1),
    ('Aplicaciones de ecuaciones', 'La mitad de x es 14. ¿Cuanto vale x?', '["24","26","28","30"]'::jsonb, 2, 2),
    ('Aplicaciones de ecuaciones', 'Si 3x = 45, ¿cuanto vale x?', '["12","13","14","15"]'::jsonb, 3, 3),
    ('Aplicaciones de ecuaciones', 'Si x - 9 = 4, ¿cuanto vale x?', '["11","12","13","14"]'::jsonb, 2, 4),
    ('Repaso de ecuaciones', 'Resuelve: 8x = 56', '["6","7","8","9"]'::jsonb, 1, 1),
    ('Repaso de ecuaciones', 'Resuelve: 2x + 6 = 20', '["6","7","8","9"]'::jsonb, 1, 2),
    ('Repaso de ecuaciones', 'Resuelve: 4x - 8 = 12', '["4","5","6","7"]'::jsonb, 1, 3),
    ('Repaso de ecuaciones', 'Resuelve: 6x + 3 = 33', '["4","5","6","7"]'::jsonb, 1, 4)
)
insert into questions (lesson_id, question, options, correct_index, order_index)
select l.id, q.question, q.options, q.correct_index, q.order_index
from question_seed q
join lesson_rows l
  on l.title = q.lesson_title
where not exists (
  select 1
  from questions existing
  where existing.lesson_id = l.id
    and existing.question = q.question
);

commit;
