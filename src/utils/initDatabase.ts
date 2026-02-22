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
        avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/4238514d-3d40-49eb-87ad-a23025b04422.jpg',
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
        avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/75315476-1a6b-46cb-bf67-5fee29e2cb01.jpg',
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
        avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/ee2cdb6c-9e49-49fb-b188-d42660db79b5.jpg',
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
        avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/19f311c0-23da-416b-bc82-1899dff1a3fb.jpg',
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
        avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/8693b3ff-ac67-47a1-88d0-e6cd7e25aaf7.jpg',
        isPinned: true,
        participants: ['teacher-0', 'admin'],
        topics: [
          { id: 'teachers-group-important', name: 'Важное', icon: 'AlertCircle' },
          { id: 'teachers-group-general', name: 'Общее', icon: 'MessageSquare' },
          { id: 'teachers-group-flood', name: 'Флудилка', icon: 'Coffee' },
          { id: 'teachers-group-new-students', name: 'Новые ученики', icon: 'UserPlus' },
          { id: 'teachers-group-parent-reviews', name: 'Отзывы родителей', icon: 'Star' },
          { id: 'teachers-group-support', name: 'Техподдержка', icon: 'Headphones' },
        ],
      },
      {
        id: 'private-teacher-0-admin',
        name: 'Личный чат',
        type: 'private',
        avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/75315476-1a6b-46cb-bf67-5fee29e2cb01.jpg',
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