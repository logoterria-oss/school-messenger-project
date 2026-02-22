export type TestAccount = {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: 'parent' | 'student' | 'teacher';
  avatar?: string;
  linkedTo?: string[];
};

export const testAccounts: TestAccount[] = [
  {
    id: 'parent-test-1',
    name: 'Мария Тестовая',
    phone: '89991234567',
    email: 'parent.test@example.com',
    password: 'test123',
    role: 'parent',
    avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/c478476c-1695-424a-bc34-76109e654dd2.jpg',
    linkedTo: ['student-test-1']
  },
  {
    id: 'student-test-1',
    name: 'Анна Тестова',
    phone: '89997654321',
    email: 'student.test@example.com',
    password: 'test123',
    role: 'student',
    avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/7b844c02-3fc8-46a5-a087-b36db9e5e47e.jpg',
    linkedTo: ['parent-test-1']
  },
  {
    id: 'parent-test-2',
    name: 'Елена Петрова',
    phone: '89991112233',
    email: 'parent2.test@example.com',
    password: 'test123',
    role: 'parent',
    avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/c478476c-1695-424a-bc34-76109e654dd2.jpg',
    linkedTo: ['student-test-2']
  },
  {
    id: 'student-test-2',
    name: 'Дмитрий Петров',
    phone: '89993334455',
    email: 'student2.test@example.com',
    password: 'test123',
    role: 'student',
    avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/7b844c02-3fc8-46a5-a087-b36db9e5e47e.jpg',
    linkedTo: ['parent-test-2']
  },
  {
    id: 'parent-test-3',
    name: 'Ирина Сидорова',
    phone: '89995556677',
    email: 'parent3.test@example.com',
    password: 'test123',
    role: 'parent',
    avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/c478476c-1695-424a-bc34-76109e654dd2.jpg',
    linkedTo: ['student-test-3']
  },
  {
    id: 'student-test-3',
    name: 'София Сидорова',
    phone: '89997778899',
    email: 'student3.test@example.com',
    password: 'test123',
    role: 'student',
    avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/7b844c02-3fc8-46a5-a087-b36db9e5e47e.jpg',
    linkedTo: ['parent-test-3']
  }
];