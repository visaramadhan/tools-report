export type Role = 'admin' | 'technician';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: boolean;
};

export type Tool = {
  _id: string;
  toolCode: string;
  name: string;
  category: string;
  subCategory: string;
  condition?: 'Good' | 'Bad';
  photoUrl?: string;
  description?: string;
  status?: boolean;
  year?: number;
};

export type Report = {
  _id: string;
  toolId: string;
  toolCode?: string;
  toolName: string;
  technicianName: string;
  condition: 'Good' | 'Bad';
  description?: string;
  photoUrl?: string;
  createdAt: string;
};

export type Replacement = {
  _id: string;
  oldToolId: string;
  oldToolCode: string;
  oldToolName: string;
  newToolId?: string;
  newToolCode?: string;
  newToolName?: string;
  status: string;
  note?: string;
};

export type Loan = {
  _id: string;
  borrowerId: string;
  borrowerName: string;
  status: string;
  borrowedAt: string;
  items: Array<{
    toolId: string;
    toolCode: string;
    toolName: string;
    returnedAt?: string;
    returnCondition?: 'Good' | 'Bad';
    returnDescription?: string;
  }>;
};

export type Category = {
  _id: string;
  name: string;
  description?: string;
};

export type SubCategory = {
  _id: string;
  name: string;
  prefix: string;
  categoryId: string;
  categoryName: string;
  description?: string;
};
