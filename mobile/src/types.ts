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
  isBorrowed?: boolean;
  currentLoanId?: string;
  currentBorrowerId?: string;
  currentBorrowerName?: string;
  isSingleUse?: boolean;
  isSpecial?: boolean;
};

export type Report = {
  _id: string;
  toolId: string;
  toolCode?: string;
  toolName: string;
  category?: string;
  subCategory?: string;
  technicianName: string;
  examinerName?: string;
  condition: 'Good' | 'Bad';
  description?: string;
  photoUrl?: string;
  photoUrls?: string[];
  replacementId?: string;
  createdAt: string;
};

export type Replacement = {
  _id: string;
  reportId?: string;
  oldToolId: string;
  oldToolCode: string;
  oldToolName: string;
  oldLoanId?: string;
  oldSubCategory?: string;
  newToolId?: string;
  newToolCode?: string;
  newToolName?: string;
  status: string;
  note?: string;
  shippedPhotoUrl?: string;
};

export type Loan = {
  _id: string;
  borrowerId: string;
  borrowerName: string;
  status: 'Borrowed' | 'Returned' | 'PartiallyReturned' | 'Exchanged';
  borrowedAt: string;
  items: Array<{
    toolId: string;
    toolCode: string;
    toolName: string;
    borrowedCondition: 'Good' | 'Bad';
    borrowedPhotoUrl?: string;
    shipmentNote?: string;
    reportedCondition?: 'Good' | 'Bad';
    reportedAt?: string;
    returnedAt?: string;
    returnCondition?: 'Good' | 'Bad';
    returnDescription?: string;
    returnPhotoUrl?: string;
    returnShipmentRequestedAt?: string;
    returnShipmentNote?: string;
    returnShipmentPhotoUrl?: string;
    returnReceivedAt?: string;
    returnReceivedNote?: string;
    returnReceivedPhotoUrl?: string;
    status: 'Borrowed' | 'Returning' | 'Returned' | 'Exchanged';
  }>;
};

export type Transfer = {
  _id: string;
  toolId: string;
  toolCode: string;
  toolName: string;
  fromTechnicianId: string;
  fromTechnicianName: string;
  toTechnicianId: string;
  toTechnicianName: string;
  condition: 'Good' | 'Bad';
  description?: string;
  photoUrl?: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  acceptedAt?: string;
  acceptedCondition?: 'Good' | 'Bad';
  acceptedDescription?: string;
  acceptedPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
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
