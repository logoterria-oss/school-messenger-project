// Утилита для заполнения БД начальными данными
const API_BASE = 'https://functions.poehali.dev';

const FUNCTION_URLS = {
  users: `${API_BASE}/093c9bd4-bdb3-41c4-865c-e707f472dc3c`,
  chats: `${API_BASE}/7321ff36-8923-4d5f-ba35-61643bc89545`,
};

export async function initializeDatabase() {
  try {
    // Создаем пользователей
    const users = [
      {
        id: 'admin',
        name: 'Виктория Абраменко',
        phone: '+7(999)999-99-99',
        email: 'admin@lineaschool.ru',
        password: 'admin123',
        role: 'admin',
        avatar: 'https://cdn.poehali.dev/files/Админ.jpg',
        availableSlots: [],
        educationDocs: [],
      },
      {
        id: 'teacher-0',
        name: 'Нонна Мельникова',
        phone: '+7(905)766-25-07',
        email: 'nonnadariy@gmail.com',
        password: 'Nonna2507',
        role: 'teacher',
        avatar: 'https://cdn.poehali.dev/files/Педагог.jpg',
        availableSlots: [],
        educationDocs: [],
      },
      {
        id: 'parent-test-1',
        name: 'Мария Тестовая',
        phone: '89991234567',
        email: 'parent.test@example.com',
        password: 'test123',
        role: 'parent',
        avatar: 'https://cdn.poehali.dev/files/Родитель.jpg',
        availableSlots: [],
        educationDocs: [],
      },
      {
        id: 'student-test-1',
        name: 'Анна Тестова',
        phone: '89997654321',
        email: 'student.test@example.com',
        password: 'test123',
        role: 'student',
        avatar: 'https://cdn.poehali.dev/files/Ученик.jpg',
        availableSlots: [],
        educationDocs: [],
      },
    ];

    console.log('Creating users...');
    for (const user of users) {
      try {
        const response = await fetch(FUNCTION_URLS.users, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.log(`User ${user.name} already exists or error:`, error);
        } else {
          console.log(`✓ Created user: ${user.name}`);
        }
      } catch (error) {
        console.error(`Error creating user ${user.name}:`, error);
      }
    }

    // Создаем чаты
    const chats = [
      {
        id: 'teachers-group',
        name: 'Педагоги',
        type: 'group',
        avatar: 'https://cdn.poehali.dev/files/6c04fc1dc8efff47815dc84d1e41d67b_964f0b0a-ab13-4528-8458-3898a259a3ac.jpg',
        isPinned: true,
        participants: ['teacher-0', 'admin'],
        topics: [],
      },
      {
        id: 'private-teacher-0-admin',
        name: 'Личный чат',
        type: 'private',
        avatar: 'https://cdn.poehali.dev/files/Педагог.jpg',
        isPinned: true,
        participants: ['teacher-0', 'admin'],
      },
      {
        id: 'test-group-1',
        name: 'Группа: Мария Тестовая',
        type: 'group',
        avatar: 'https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg',
        schedule: 'ПН в 18:00, ЧТ в 15:00',
        conclusionLink: 'https://example.com/conclusion.pdf',
        participants: ['parent-test-1', 'student-test-1', 'teacher-0', 'admin'],
        topics: [
          { id: 'test-group-1-important', name: 'Важное', icon: 'AlertCircle' },
          { id: 'test-group-1-zoom', name: 'Zoom', icon: 'Video' },
          { id: 'test-group-1-homework', name: 'ДЗ', icon: 'BookOpen' },
          { id: 'test-group-1-reports', name: 'Отчеты', icon: 'FileText' },
          { id: 'test-group-1-payment', name: 'Оплата', icon: 'CreditCard' },
          { id: 'test-group-1-cancellation', name: 'Отмена занятий', icon: 'XCircle' },
        ],
      },
    ];

    console.log('Creating chats...');
    for (const chat of chats) {
      try {
        const response = await fetch(FUNCTION_URLS.chats, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chat),
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.log(`Chat ${chat.name} already exists or error:`, error);
        } else {
          console.log(`✓ Created chat: ${chat.name}`);
        }
      } catch (error) {
        console.error(`Error creating chat ${chat.name}:`, error);
      }
    }

    console.log('✅ Database initialization completed!');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}
