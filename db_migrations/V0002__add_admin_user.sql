-- Добавление администратора Виктория Абраменко
INSERT INTO users (id, name, phone, email, role, password, avatar) 
VALUES ('admin', 'Виктория Абраменко', '79236251611', 'abram.viktoriya.00@mail.ru', 'admin', 'Barabulka.2000', 'https://cdn.poehali.dev/files/Админ.jpg')
ON CONFLICT (id) DO UPDATE 
SET phone = EXCLUDED.phone, 
    email = EXCLUDED.email, 
    password = EXCLUDED.password;