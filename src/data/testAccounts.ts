export type TestAccount = {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: 'parent' | 'student';
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
    avatar: 'https://cdn.poehali.dev/files/Родитель.jpg',
    linkedTo: ['student-test-1']
  },
  {
    id: 'student-test-1',
    name: 'Анна Тестова',
    phone: '89997654321',
    email: 'student.test@example.com',
    password: 'test123',
    role: 'student',
    avatar: 'https://cdn.poehali.dev/files/Ученик.jpg',
    linkedTo: ['parent-test-1']
  }
];
