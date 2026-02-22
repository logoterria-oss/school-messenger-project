
INSERT INTO t_p86655125_school_messenger_pro.users (id, name, phone, email, password, role, avatar) VALUES
('test-admin-2', 'Тест Админ 2', '70000000001', 'admin2@test.com', 'test123', 'admin', 'https://cdn.poehali.dev/files/Админ.jpg'),
('test-admin-3', 'Тест Админ 3', '70000000002', 'admin3@test.com', 'test123', 'admin', 'https://cdn.poehali.dev/files/Админ.jpg'),
('test-admin-4', 'Тест Админ 4', '70000000003', 'admin4@test.com', 'test123', 'admin', 'https://cdn.poehali.dev/files/Админ.jpg'),
('test-admin-5', 'Тест Админ 5', '70000000004', 'admin5@test.com', 'test123', 'admin', 'https://cdn.poehali.dev/files/Админ.jpg'),
('test-teacher-2', 'Тест Педагог 2', '70000000011', 'teacher2@test.com', 'test123', 'teacher', 'https://cdn.poehali.dev/files/Педагог.jpg'),
('test-teacher-3', 'Тест Педагог 3', '70000000012', 'teacher3@test.com', 'test123', 'teacher', 'https://cdn.poehali.dev/files/Педагог.jpg'),
('test-teacher-4', 'Тест Педагог 4', '70000000013', 'teacher4@test.com', 'test123', 'teacher', 'https://cdn.poehali.dev/files/Педагог.jpg'),
('test-teacher-5', 'Тест Педагог 5', '70000000014', 'teacher5@test.com', 'test123', 'teacher', 'https://cdn.poehali.dev/files/Педагог.jpg'),
('test-parent-2', 'Тест Родитель 2', '70000000021', 'parent2@test.com', 'test123', 'parent', 'https://cdn.poehali.dev/files/Родитель.jpg'),
('test-parent-3', 'Тест Родитель 3', '70000000022', 'parent3@test.com', 'test123', 'parent', 'https://cdn.poehali.dev/files/Родитель.jpg'),
('test-parent-4', 'Тест Родитель 4', '70000000023', 'parent4@test.com', 'test123', 'parent', 'https://cdn.poehali.dev/files/Родитель.jpg'),
('test-parent-5', 'Тест Родитель 5', '70000000024', 'parent5@test.com', 'test123', 'parent', 'https://cdn.poehali.dev/files/Родитель.jpg'),
('test-student-2', 'Тест Ученик 2', '70000000031', 'student2@test.com', 'test123', 'student', 'https://cdn.poehali.dev/files/Ученик.jpg'),
('test-student-3', 'Тест Ученик 3', '70000000032', 'student3@test.com', 'test123', 'student', 'https://cdn.poehali.dev/files/Ученик.jpg'),
('test-student-4', 'Тест Ученик 4', '70000000033', 'student4@test.com', 'test123', 'student', 'https://cdn.poehali.dev/files/Ученик.jpg'),
('test-student-5', 'Тест Ученик 5', '70000000034', 'student5@test.com', 'test123', 'student', 'https://cdn.poehali.dev/files/Ученик.jpg')
ON CONFLICT (id) DO NOTHING;
